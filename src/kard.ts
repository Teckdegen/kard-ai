/**
 * Kard — Trustless coordination & settlement protocol for autonomous AI agents.
 *
 * This facade composes all 13 protocol layers into a single entry point.
 * A single call to `kard.fulfill(request, buyerWallet)` runs an OpenClaw
 * workflow: negotiate → escrow → execute → arbitrate → settle → reputation.
 *
 * Every artifact is content-addressed and pinned to Filecoin.
 * All escrow operations execute onchain via Alkahest contracts.
 */
import type { Address, Hex } from "viem";
import {
  type AgentProfile,
  type Agreement,
  type ServiceRequest,
  type SettlementReceipt,
} from "./core/types.js";
import { newId, now } from "./core/ids.js";
import { child } from "./core/logger.js";
import type { AgentWallet } from "./core/wallet.js";
import { resolveChainEnv } from "./core/wallet.js";
import { EventBus, getEventBus, resetEventBus } from "./core/events.js";
import { PROTOCOL_VERSION, NonceRegistry } from "./core/protocol.js";
import type { KardSDKConfig, FilecoinPinConfig } from "./core/config.js";
import { loadConfigFromEnv } from "./core/config.js";
import { AgentRegistry } from "./registry/index.js";
import { Marketplace } from "./marketplace/index.js";
import { DiscoveryEngine } from "./discovery/index.js";
import { NegotiationEngine } from "./negotiation/index.js";
import {
  AlkahestEscrow,
  buildFulfillmentStatement,
  type EscrowConfig,
  type EscrowReceipt,
  type FulfillmentStatement,
} from "./escrow/index.js";
import { OpenClaw } from "./orchestrator/index.js";
import { AomiRuntime, buildRefundPolicy, buildSettlementPolicy } from "./execution/index.js";
import { ProofBuilder, ProofVerifier } from "./proofs/index.js";
import { AIArbiter } from "./arbitration/index.js";
import { ReputationEngine } from "./reputation/index.js";
import { createMemory, type MemoryStore } from "./memory/ipfs.js";
import { Archive } from "./memory/archive.js";
import { FilecoinPinClient } from "./memory/filecoin-pin.js";

const log = child("kard");

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProviderImpl {
  agent_id: string;
  wallet: AgentWallet;
  execute: (req: ServiceRequest, agreement: Agreement) => Promise<{
    output: unknown;
    measured_latency_ms: number;
    measured_uptime_pct: number;
    logs?: string[];
  }>;
}

export interface KardConfig {
  /** Full SDK configuration (preferred — pass everything explicitly) */
  sdk?: KardSDKConfig;
  /** Escrow config (legacy — use sdk.escrow instead) */
  escrow?: EscrowConfig;
  /** Arbiter address override */
  arbiter_address?: Address;
  /** Filecoin Pin client or config */
  filecoinPin?: FilecoinPinClient | FilecoinPinConfig;
}

export interface FulfillResult {
  agreement: Agreement;
  proof_cid: string;
  agreement_cid: string;
  verdict_cid: string;
  fulfillment_cid: string;
  receipt: SettlementReceipt;
  escrow: EscrowReceipt;
  fulfillment: FulfillmentStatement;
  workflow_id: string;
  protocol_version: string;
}

// ─── Kard Protocol ──────────────────────────────────────────────────────────

export class Kard {
  registry!: AgentRegistry;
  marketplace!: Marketplace;
  discovery!: DiscoveryEngine;
  negotiation!: NegotiationEngine;
  escrow!: AlkahestEscrow;
  orchestrator!: OpenClaw;
  proofs!: ProofBuilder;
  verifier!: ProofVerifier;
  arbiter!: AIArbiter;
  reputation!: ReputationEngine;
  memory!: MemoryStore;
  archive!: Archive;
  events!: EventBus;

  private providers = new Map<string, ProviderImpl>();
  private requestNonces = new NonceRegistry(3600);
  private constructor(private cfg: KardConfig) {}

  /**
   * Create a Kard instance with explicit SDK configuration.
   * All infrastructure (IPFS, Filecoin Pin, Alkahest escrow) is real.
   */
  static async create(cfg: KardConfig = {}): Promise<Kard> {
    const kard = new Kard(cfg);

    // Initialize event bus
    kard.events = resetEventBus();

    // Resolve Filecoin Pin client
    let filecoinClient: FilecoinPinClient | undefined;
    if (cfg.filecoinPin instanceof FilecoinPinClient) {
      filecoinClient = cfg.filecoinPin;
    } else if (cfg.filecoinPin) {
      filecoinClient = new FilecoinPinClient(cfg.filecoinPin);
    } else if (cfg.sdk?.filecoinPin) {
      filecoinClient = new FilecoinPinClient(cfg.sdk.filecoinPin);
    }

    // Memory layer — always real IPFS + Filecoin Pin
    kard.memory = await createMemory({ filecoin: filecoinClient });
    kard.archive = new Archive(kard.memory);

    // Resolve escrow config
    const escrowCfg: EscrowConfig | undefined = cfg.escrow ?? (cfg.sdk?.escrow ? {
      escrowAddress: cfg.sdk.escrow.escrowAddress,
      arbiterAddress: cfg.sdk.escrow.arbiterAddress,
      token: cfg.sdk.escrow.token,
      disputeWindowSeconds: cfg.sdk.escrow.disputeWindowSeconds,
      expirationBufferSeconds: cfg.sdk.escrow.expirationBufferSeconds,
    } : undefined);

    if (!escrowCfg?.escrowAddress) {
      log.warn("no escrow address configured — onchain settlement will fail. Set sdk.escrow.escrowAddress.");
    }

    // Core layers
    kard.registry = new AgentRegistry(kard.archive);
    kard.marketplace = new Marketplace();
    kard.discovery = new DiscoveryEngine(kard.registry, kard.marketplace);
    kard.negotiation = new NegotiationEngine(kard.archive);
    kard.escrow = new AlkahestEscrow(escrowCfg);
    kard.orchestrator = new OpenClaw();
    kard.proofs = new ProofBuilder(kard.memory);
    kard.verifier = new ProofVerifier(kard.registry);
    kard.arbiter = new AIArbiter(kard.verifier);
    kard.reputation = new ReputationEngine(kard.registry);

    log.info({
      protocol: PROTOCOL_VERSION,
      escrow: escrowCfg?.escrowAddress ?? "NOT CONFIGURED",
      filecoin_pin: filecoinClient ? "active" : "NOT CONFIGURED",
    }, "Kard initialized");

    return kard;
  }

  /**
   * Create a Kard instance from environment variables.
   * Convenience method — production users should use create() with explicit config.
   */
  static async fromEnv(): Promise<Kard> {
    const sdkConfig = loadConfigFromEnv();
    const filecoinClient = new FilecoinPinClient(sdkConfig.filecoinPin);
    return Kard.create({
      sdk: sdkConfig,
      filecoinPin: filecoinClient,
      arbiter_address: sdkConfig.escrow.arbiterAddress,
    });
  }

  registerProvider(impl: ProviderImpl): void {
    this.providers.set(impl.agent_id, impl);
    log.info({ agent_id: impl.agent_id }, "provider registered");
  }

  async fulfill(request: ServiceRequest, buyerWallet: AgentWallet): Promise<FulfillResult> {
    // ─── Input Validation ─────────────────────────────────────────────
    const buyer = this.registry.byWalletAddress(buyerWallet.address);
    if (!buyer) throw new Error("buyer not registered");

    // Replay protection
    if (!this.requestNonces.check(request.request_id)) {
      throw new Error(`duplicate request_id: ${request.request_id} (replay attack blocked)`);
    }

    // ─── Discovery ────────────────────────────────────────────────────
    const candidates = this.discovery.find(request);
    if (candidates.length === 0) throw new Error(`no candidates for capability ${request.capability}`);
    const top = candidates[0];
    const providerProfile = top.provider;
    const providerImpl = this.providers.get(providerProfile.agent_id);
    if (!providerImpl) throw new Error(`no execution impl registered for ${providerProfile.agent_id}`);

    // Reputation gate for high-value requests
    if (!this.reputation.meetsThreshold(providerProfile.agent_id, BigInt(request.max_price_wei))) {
      throw new Error(`provider ${providerProfile.agent_id} does not meet reputation threshold for this value`);
    }

    const aomi = new AomiRuntime(buyerWallet);
    const arbiterAddr: Address = this.cfg.arbiter_address ?? this.cfg.sdk?.escrow?.arbiterAddress ?? ("0x0000000000000000000000000000000000000000" as Address);

    let agreement!: Agreement;
    let escrowReceipt!: EscrowReceipt;
    let proofCid!: string;
    let agreementCid!: string;
    let verdictCid!: string;
    let fulfillmentCid!: string;
    let receipt!: SettlementReceipt;
    let fulfillment!: FulfillmentStatement;

    // ─── OpenClaw Workflow ─────────────────────────────────────────────
    const wf = await this.orchestrator.run([
      {
        id: "negotiate",
        name: "negotiate",
        idempotency_key: `negotiate:${request.request_id}`,
        run: async () => {
          const result = await this.negotiation.negotiate({
            request,
            buyer,
            provider: providerProfile,
            listing: top.listing,
            arbiter_id: this.arbiter.identity.arbiter_id,
          });
          agreement = result.agreement;
          agreementCid = await this.archive.putAgreement(agreement);
          agreement.cid = agreementCid;

          this.events.emit_event("AgreementCreated", {
            agreement_id: agreement.agreement_id,
            buyer_id: agreement.buyer_id,
            provider_id: agreement.provider_id,
            capability: agreement.capability,
            price_wei: agreement.agreed_price_wei,
            cid: agreementCid,
          }, { agreement_id: agreement.agreement_id, agent_id: buyer.agent_id });

          return result;
        },
      },
      {
        id: "escrow",
        name: "escrow_lock",
        deps: ["negotiate"],
        idempotency_key: `escrow:${request.request_id}`,
        run: async () => {
          escrowReceipt = await this.escrow.lock({
            buyer: buyerWallet,
            arbiter: arbiterAddr,
            agreement,
          });
          agreement.escrow_address = this.cfg.escrow?.escrowAddress ?? this.cfg.sdk?.escrow?.escrowAddress;
          agreement.escrow_uid = escrowReceipt.uid;
          return escrowReceipt;
        },
      },
      {
        id: "execute",
        name: "execute_service",
        deps: ["escrow"],
        retry: { attempts: 2, backoff_ms: 500 },
        timeout_ms: (request.max_latency_ms || 30000) * 10,
        run: async () => {
          const started_at = now();

          this.events.emit_event("ExecutionStarted", {
            agreement_id: agreement.agreement_id,
            provider_id: providerProfile.agent_id,
          }, { agreement_id: agreement.agreement_id, agent_id: providerProfile.agent_id });

          const result = await providerImpl.execute(request, agreement);
          const proof = await this.proofs.build({
            agreement,
            provider: providerImpl.wallet,
            result,
            started_at,
            escrow_uid: escrowReceipt.uid,
          });
          proofCid = await this.archive.putProof(proof);
          fulfillment = await buildFulfillmentStatement({
            provider: providerImpl.wallet,
            buyerWallet: buyerWallet.address,
            agreement,
            proof,
          });
          fulfillmentCid = await this.memory.putJson(fulfillment, `fulfillment-${proof.proof_id}`);

          this.events.emit_event("ExecutionCompleted", {
            agreement_id: agreement.agreement_id,
            proof_id: proof.proof_id,
            proof_cid: proofCid,
            fulfillment_cid: fulfillmentCid,
          }, { agreement_id: agreement.agreement_id, agent_id: providerProfile.agent_id });

          return { proof, fulfillment };
        },
      },
      {
        id: "arbitrate",
        name: "arbitrate",
        deps: ["execute"],
        idempotency_key: `arbitrate:${request.request_id}`,
        run: async (ctx) => {
          const { proof } = ctx.results["execute"] as {
            proof: Awaited<ReturnType<ProofBuilder["build"]>>;
            fulfillment: FulfillmentStatement;
          };
          const verdict = await this.arbiter.decide(agreement, proof);
          verdictCid = await this.archive.putVerdict(verdict);
          return verdict;
        },
      },
      {
        id: "settle",
        name: "aomi_settlement",
        deps: ["arbitrate"],
        idempotency_key: `settle:${request.request_id}`,
        run: async (ctx) => {
          const verdict = ctx.results["arbitrate"] as Awaited<ReturnType<AIArbiter["decide"]>>;
          aomi.addPolicy(
            buildSettlementPolicy(async () => {
              const r = await this.escrow.settle({
                buyer: buyerWallet,
                uid: escrowReceipt.uid,
                approved: true,
                penaltyBps: verdict.penalty_bps,
                fulfillmentUid: fulfillment.uid,
              });
              receipt = {
                receipt_id: newId("rcpt"),
                agreement_id: agreement.agreement_id,
                paid_to_provider_wei: r.paid_provider.toString(),
                refunded_to_buyer_wei: r.refunded_buyer.toString(),
                protocol_fee_wei: r.protocol_fee.toString(),
                tx_hash: r.tx_hash as Hex | undefined,
                settled_at: now(),
              };
              return receipt;
            })
          );
          aomi.addPolicy(
            buildRefundPolicy(async () => {
              const r = await this.escrow.settle({
                buyer: buyerWallet,
                uid: escrowReceipt.uid,
                approved: false,
                penaltyBps: 0,
              });
              receipt = {
                receipt_id: newId("rcpt"),
                agreement_id: agreement.agreement_id,
                paid_to_provider_wei: "0",
                refunded_to_buyer_wei: BigInt(agreement.agreed_price_wei).toString(),
                protocol_fee_wei: "0",
                tx_hash: r.tx_hash as Hex | undefined,
                settled_at: now(),
              };
              return receipt;
            })
          );
          await aomi.evaluate({ verification_passed: verdict.approved });
          agreement.settled = true;
          await this.archive.putReceipt(receipt);

          this.events.emit_event("SettlementExecuted", {
            agreement_id: agreement.agreement_id,
            paid_to_provider_wei: receipt.paid_to_provider_wei,
            refunded_to_buyer_wei: receipt.refunded_to_buyer_wei,
            protocol_fee_wei: receipt.protocol_fee_wei,
            tx_hash: receipt.tx_hash,
          }, { agreement_id: agreement.agreement_id });

          return receipt;
        },
      },
      {
        id: "reputation",
        name: "update_reputation",
        deps: ["settle"],
        run: async (ctx) => {
          const { proof } = ctx.results["execute"] as {
            proof: Awaited<ReturnType<ProofBuilder["build"]>>;
            fulfillment: FulfillmentStatement;
          };
          const verdict = ctx.results["arbitrate"] as Awaited<ReturnType<AIArbiter["decide"]>>;
          await this.reputation.record({ agreement, proof, verdict });
          return { ok: true };
        },
      },
    ]);

    if (wf.status !== "completed") throw new Error(`workflow failed: ${JSON.stringify(wf.tasks)}`);

    return {
      agreement,
      proof_cid: proofCid,
      agreement_cid: agreementCid,
      verdict_cid: verdictCid,
      fulfillment_cid: fulfillmentCid,
      receipt,
      escrow: escrowReceipt,
      fulfillment,
      workflow_id: wf.workflow_id,
      protocol_version: PROTOCOL_VERSION,
    };
  }

  /** Get the protocol event log */
  getEventLog() {
    return this.events.export();
  }

  async shutdown(): Promise<void> {
    await this.memory.stop();
    log.info("Kard shutdown complete");
  }
}

export type { AgentProfile, ServiceRequest, Agreement, SettlementReceipt };
