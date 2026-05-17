import type { AgentProfile, Capability, ServiceRequest } from "../core/types.js";
import type { AgentWallet } from "../core/wallet.js";
import type { Kard } from "../kard.js";
import { newId, now } from "../core/ids.js";
import { child } from "../core/logger.js";

const log = child("dao");

export interface Treasury {
  balance_wei: bigint;
  reserved_wei: bigint;
}

export interface AutoOrgConfig {
  name: string;
  wallet: AgentWallet;
  kard: Kard;
  treasury_floor_wei: bigint;
  spend_limit_per_task_wei: bigint;
}

export class AutonomousOrganization {
  readonly org_id = newId("org");
  private treasury: Treasury;
  private actions: Array<{ ts: number; kind: string; detail: Record<string, unknown> }> = [];

  constructor(private cfg: AutoOrgConfig) {
    this.treasury = { balance_wei: 0n, reserved_wei: 0n };
  }

  async syncTreasury(): Promise<bigint> {
    const bal = await this.cfg.wallet.publicClient.getBalance({ address: this.cfg.wallet.address });
    this.treasury.balance_wei = bal;
    return bal;
  }

  available(): bigint {
    return this.treasury.balance_wei - this.treasury.reserved_wei;
  }

  async procure(args: {
    buyer: AgentProfile;
    capability: Capability;
    max_price_wei: bigint;
    max_latency_ms: number;
    duration_seconds: number;
    payload?: Record<string, unknown>;
  }) {
    if (args.max_price_wei > this.cfg.spend_limit_per_task_wei) {
      throw new Error("task exceeds per-task spend limit");
    }
    await this.syncTreasury();
    if (this.available() - args.max_price_wei < this.cfg.treasury_floor_wei) {
      throw new Error("treasury floor would be breached");
    }
    this.treasury.reserved_wei += args.max_price_wei;
    const request: ServiceRequest = {
      request_id: newId("req"),
      buyer_id: args.buyer.agent_id,
      capability: args.capability,
      max_price_wei: args.max_price_wei.toString(),
      max_latency_ms: args.max_latency_ms,
      duration_seconds: args.duration_seconds,
      payload: args.payload ?? {},
      verification: "execution_proof",
    };
    log.info({ org: this.cfg.name, request_id: request.request_id, cap: args.capability }, "org procurement started");

    try {
      const result = await this.cfg.kard.fulfill(request, this.cfg.wallet);
      this.actions.push({ ts: now(), kind: "procurement", detail: { request_id: request.request_id, settled: result.receipt } });
      return result;
    } finally {
      this.treasury.reserved_wei -= args.max_price_wei;
    }
  }

  history() {
    return [...this.actions];
  }
}
