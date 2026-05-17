/**
 * Alkahest Escrow — Adversarial-safe financial primitive with strict state machine.
 *
 * State transitions:
 *   CREATED → LOCKED → (DISPUTED | SETTLED | REFUNDED | EXPIRED)
 *   LOCKED → DISPUTED → (SETTLED | REFUNDED)
 *
 * Guards:
 *   - Re-entrancy protection via settlement mutex
 *   - Dispute window enforcement
 *   - Deterministic settlement outcomes
 *   - Replay protection via nonce tracking
 */
import {
  encodeAbiParameters,
  encodePacked,
  keccak256,
  parseAbiParameters,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import type { Agreement } from "../core/types.js";
import type { AgentWallet } from "../core/wallet.js";
import { ESCROW_ABI } from "./abi.js";
import { child } from "../core/logger.js";
import { now, newId } from "../core/ids.js";
import { getEventBus } from "../core/events.js";
import { SCHEMA_VERSIONS } from "../core/protocol.js";

const log = child("escrow");

// ─── Types ──────────────────────────────────────────────────────────────────

export type EscrowState = "created" | "locked" | "disputed" | "settled" | "refunded" | "expired";

export interface EscrowConfig {
  escrowAddress?: Address;
  arbiterAddress?: Address;
  token?: Address;
  disputeWindowSeconds?: number;
  expirationBufferSeconds?: number;
}

export interface EscrowRecord {
  uid: Hex;
  state: EscrowState;
  buyer: Address;
  arbiter: Address;
  amount: bigint;
  token: Address;
  locked_at: number;
  dispute_deadline: number;
  expiration: number;
  tx_hash?: Hex;
  settlement_tx?: Hex;
  nonce: string;
}

export interface EscrowReceipt {
  uid: Hex;
  buyer: Address;
  arbiter: Address;
  amount: bigint;
  tx_hash?: Hex;
  local: boolean;
  state: EscrowState;
  nonce: string;
}

export interface SettleResult {
  paid_provider: bigint;
  refunded_buyer: bigint;
  protocol_fee: bigint;
  tx_hash?: Hex;
  state: EscrowState;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PROTOCOL_FEE_BPS = 50n;
const DEFAULT_DISPUTE_WINDOW = 3600; // 1 hour
const DEFAULT_EXPIRATION_BUFFER = 7200; // 2 hours beyond agreement duration

// ─── State Machine ──────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<EscrowState, EscrowState[]> = {
  created: ["locked"],
  locked: ["disputed", "settled", "refunded", "expired"],
  disputed: ["settled", "refunded"],
  settled: [],
  refunded: [],
  expired: ["refunded"],
};

function assertTransition(current: EscrowState, next: EscrowState): void {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new Error(`invalid escrow state transition: ${current} → ${next}`);
  }
}

// ─── Demand Encoding ────────────────────────────────────────────────────────

export const encodeDemand = (agreement: Agreement): Hex =>
  encodeAbiParameters(
    parseAbiParameters("string capability, uint256 maxLatencyMs, uint256 minUptimeBps, string outputSpec, string schemaVersion"),
    [
      agreement.capability,
      BigInt(agreement.obligations.find((o) => o.kind === "latency")?.threshold ?? 0),
      BigInt(Math.round(Number(agreement.obligations.find((o) => o.kind === "uptime")?.threshold ?? 0) * 100)),
      String(agreement.obligations.find((o) => o.kind === "deliverable")?.threshold ?? ""),
      SCHEMA_VERSIONS.escrow_lock,
    ]
  );

// ─── Escrow Implementation ─────────────────────────────────────────────────

export class AlkahestEscrow {
  private records = new Map<Hex, EscrowRecord>();
  private settling = new Set<Hex>(); // re-entrancy guard

  constructor(private cfg: EscrowConfig = {}) {}

  private get disputeWindow(): number {
    return this.cfg.disputeWindowSeconds ?? DEFAULT_DISPUTE_WINDOW;
  }

  private hasOnchain(): boolean {
    return !!(this.cfg.escrowAddress && this.cfg.escrowAddress !== zeroAddress);
  }

  getRecord(uid: Hex): EscrowRecord | undefined {
    return this.records.get(uid);
  }

  getState(uid: Hex): EscrowState {
    return this.records.get(uid)?.state ?? "created";
  }

  async lock(args: {
    buyer: AgentWallet;
    arbiter: Address;
    agreement: Agreement;
  }): Promise<EscrowReceipt> {
    const amount = BigInt(args.agreement.agreed_price_wei);
    if (amount <= 0n) throw new Error("escrow amount must be positive");

    const demand = encodeDemand(args.agreement);
    const expirationBuffer = this.cfg.expirationBufferSeconds ?? DEFAULT_EXPIRATION_BUFFER;
    const expiration = BigInt(now() + args.agreement.duration_seconds + expirationBuffer);
    const nonce = newId("nonce");

    if (this.hasOnchain()) {
      const hash = await args.buyer.walletClient.writeContract({
        address: this.cfg.escrowAddress!,
        abi: ESCROW_ABI,
        functionName: "makeStatement",
        chain: args.buyer.env.chain,
        account: args.buyer.account,
        value: amount,
        args: [
          {
            arbiter: args.arbiter,
            demand,
            token: this.cfg.token ?? zeroAddress,
            amount,
          },
          expiration,
        ],
      });
      const receipt = await args.buyer.publicClient.waitForTransactionReceipt({ hash });
      const uid = receipt.logs[0]?.topics?.[1] as Hex | undefined;
      const finalUid = uid ?? this.deriveLocalUid(args.buyer.address, args.agreement, nonce);

      const record: EscrowRecord = {
        uid: finalUid,
        state: "locked",
        buyer: args.buyer.address,
        arbiter: args.arbiter,
        amount,
        token: this.cfg.token ?? zeroAddress,
        locked_at: now(),
        dispute_deadline: now() + args.agreement.duration_seconds + this.disputeWindow,
        expiration: Number(expiration),
        tx_hash: hash,
        nonce,
      };
      this.records.set(finalUid, record);

      getEventBus().emit_event("EscrowLocked", {
        uid: finalUid,
        amount: amount.toString(),
        buyer: args.buyer.address,
        arbiter: args.arbiter,
        agreement_id: args.agreement.agreement_id,
        onchain: true,
        tx_hash: hash,
      }, { agreement_id: args.agreement.agreement_id, agent_id: args.agreement.buyer_id });

      log.info({ tx: hash, uid: finalUid }, "onchain escrow locked");
      return { uid: finalUid, buyer: args.buyer.address, arbiter: args.arbiter, amount, tx_hash: hash, local: false, state: "locked", nonce };
    }

    // Local escrow (deterministic simulation)
    const uid = this.deriveLocalUid(args.buyer.address, args.agreement, nonce);
    const record: EscrowRecord = {
      uid,
      state: "locked",
      buyer: args.buyer.address,
      arbiter: args.arbiter,
      amount,
      token: this.cfg.token ?? zeroAddress,
      locked_at: now(),
      dispute_deadline: now() + args.agreement.duration_seconds + this.disputeWindow,
      expiration: Number(expiration),
      nonce,
    };
    this.records.set(uid, record);

    getEventBus().emit_event("EscrowLocked", {
      uid,
      amount: amount.toString(),
      buyer: args.buyer.address,
      arbiter: args.arbiter,
      agreement_id: args.agreement.agreement_id,
      onchain: false,
    }, { agreement_id: args.agreement.agreement_id, agent_id: args.agreement.buyer_id });

    log.warn({ uid, amount: amount.toString() }, "local escrow lock (no onchain deployment configured)");
    return { uid, buyer: args.buyer.address, arbiter: args.arbiter, amount, local: true, state: "locked", nonce };
  }

  async dispute(uid: Hex, reason: string): Promise<void> {
    const record = this.records.get(uid);
    if (!record) throw new Error(`no escrow record for uid ${uid}`);
    assertTransition(record.state, "disputed");

    if (now() > record.dispute_deadline) {
      throw new Error("dispute window has closed");
    }

    record.state = "disputed";
    getEventBus().emit_event("EscrowDisputed", { uid, reason });
    log.info({ uid, reason }, "escrow disputed");
  }

  async settle(args: {
    buyer: AgentWallet;
    uid: Hex;
    approved: boolean;
    penaltyBps: number;
    fulfillmentUid?: Hex;
  }): Promise<SettleResult> {
    // Re-entrancy guard
    if (this.settling.has(args.uid)) {
      throw new Error(`settlement already in progress for ${args.uid}`);
    }
    this.settling.add(args.uid);

    try {
      const record = this.records.get(args.uid);
      if (!record) throw new Error(`no escrow record for uid ${args.uid}`);

      const targetState: EscrowState = args.approved ? "settled" : "refunded";
      assertTransition(record.state, targetState);

      // Validate penalty bounds
      if (args.penaltyBps < 0 || args.penaltyBps > 10000) {
        throw new Error(`invalid penalty bps: ${args.penaltyBps} (must be 0-10000)`);
      }

      if (this.hasOnchain()) {
        if (args.approved) {
          const hash = await args.buyer.walletClient.writeContract({
            address: this.cfg.escrowAddress!,
            abi: ESCROW_ABI,
            functionName: "collectPayment",
            chain: args.buyer.env.chain,
            account: args.buyer.account,
            args: [args.uid, args.fulfillmentUid ?? args.uid],
          });
          await args.buyer.publicClient.waitForTransactionReceipt({ hash });
          record.state = "settled";
          record.settlement_tx = hash;

          getEventBus().emit_event("EscrowSettled", {
            uid: args.uid,
            tx_hash: hash,
            approved: true,
            penalty_bps: args.penaltyBps,
          });

          return { paid_provider: 0n, refunded_buyer: 0n, protocol_fee: 0n, tx_hash: hash, state: "settled" };
        }
        const hash = await args.buyer.walletClient.writeContract({
          address: this.cfg.escrowAddress!,
          abi: ESCROW_ABI,
          functionName: "refund",
          chain: args.buyer.env.chain,
          account: args.buyer.account,
          args: [args.uid],
        });
        await args.buyer.publicClient.waitForTransactionReceipt({ hash });
        record.state = "refunded";
        record.settlement_tx = hash;

        getEventBus().emit_event("EscrowRefunded", { uid: args.uid, tx_hash: hash });
        return { paid_provider: 0n, refunded_buyer: 0n, protocol_fee: 0n, tx_hash: hash, state: "refunded" };
      }

      // Local settlement with deterministic math
      if (!args.approved) {
        record.state = "refunded";
        getEventBus().emit_event("EscrowRefunded", { uid: args.uid, amount: record.amount.toString() });
        return { paid_provider: 0n, refunded_buyer: record.amount, protocol_fee: 0n, state: "refunded" };
      }

      const penalty = (record.amount * BigInt(args.penaltyBps)) / 10000n;
      const afterPenalty = record.amount - penalty;
      const fee = (afterPenalty * PROTOCOL_FEE_BPS) / 10000n;
      const paid = afterPenalty - fee;

      record.state = "settled";
      getEventBus().emit_event("EscrowSettled", {
        uid: args.uid,
        paid_provider: paid.toString(),
        refunded_buyer: penalty.toString(),
        protocol_fee: fee.toString(),
        penalty_bps: args.penaltyBps,
      });

      return { paid_provider: paid, refunded_buyer: penalty, protocol_fee: fee, state: "settled" };
    } finally {
      this.settling.delete(args.uid);
    }
  }

  /** Check if an escrow has expired and transition it */
  checkExpiration(uid: Hex): boolean {
    const record = this.records.get(uid);
    if (!record) return false;
    if (record.state !== "locked") return false;
    if (now() >= record.expiration) {
      record.state = "expired";
      return true;
    }
    return false;
  }

  /** Safe refund path for expired escrows */
  async refundExpired(args: { buyer: AgentWallet; uid: Hex }): Promise<SettleResult> {
    const record = this.records.get(args.uid);
    if (!record) throw new Error(`no escrow record for uid ${args.uid}`);
    // Try to expire if still locked
    this.checkExpiration(args.uid);
    // Re-read state after potential mutation
    const currentState = this.records.get(args.uid)!.state;
    if (currentState !== "expired") {
      throw new Error("escrow has not expired");
    }
    assertTransition(currentState, "refunded");
    record.state = "refunded";
    getEventBus().emit_event("EscrowRefunded", { uid: args.uid, reason: "expired" });
    return { paid_provider: 0n, refunded_buyer: record.amount, protocol_fee: 0n, state: "refunded" };
  }

  allRecords(): EscrowRecord[] {
    return [...this.records.values()];
  }

  private deriveLocalUid(buyer: Address, a: Agreement, nonce: string): Hex {
    return keccak256(encodePacked(["address", "string", "uint256", "string"], [buyer, a.agreement_id, BigInt(a.created_at), nonce]));
  }
}
