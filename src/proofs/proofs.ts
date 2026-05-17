/**
 * Proof-of-Execution — Cryptographically enforceable execution proofs.
 *
 * Production features:
 *   - Canonical proof schema v1 (immutable, versioned)
 *   - Agent signatures on all execution outputs
 *   - Proofs bound to escrow + agreement IDs
 *   - Tamper detection via hash chaining
 *   - Time-bound proofs (reject stale)
 *   - Redundant storage (IPFS + indexed)
 */
import type { Agreement, ExecutionProof } from "../core/types.js";
import type { AgentWallet } from "../core/wallet.js";
import type { MemoryStore } from "../memory/ipfs.js";
import { hashJson, newId, now } from "../core/ids.js";
import { child } from "../core/logger.js";
import { getEventBus } from "../core/events.js";
import { SCHEMA_VERSIONS, validateTimeBound } from "../core/protocol.js";

const log = child("proofs");

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  output: unknown;
  measured_latency_ms: number;
  measured_uptime_pct: number;
  logs?: string[];
}

export interface ProofMetadata {
  schema_version: string;
  chain_hash?: string; // hash of previous proof for tamper detection
  escrow_uid?: string;
  nonce: string;
}

// ─── Proof Builder ──────────────────────────────────────────────────────────

export class ProofBuilder {
  private lastProofHash: string | undefined;

  constructor(private store?: MemoryStore) {}

  async build(args: {
    agreement: Agreement;
    provider: AgentWallet;
    result: ExecutionResult;
    started_at: number;
    escrow_uid?: string;
  }): Promise<ExecutionProof> {
    const output_hash = hashJson(args.result.output);
    let output_cid: string | undefined;
    let logs_cid: string | undefined;

    if (this.store) {
      output_cid = await this.store.putJson(args.result.output);
      if (args.result.logs?.length) {
        logs_cid = await this.store.putJson({ logs: args.result.logs });
      }
    }

    const proof_id = newId("proof");
    const nonce = newId("pnonce");
    const completed_at = now();

    // Validate timing
    if (args.started_at > completed_at) {
      throw new Error("proof started_at cannot be in the future");
    }
    if (completed_at - args.started_at > args.agreement.duration_seconds + 3600) {
      throw new Error("proof duration exceeds agreement + buffer");
    }

    const unsigned: Omit<ExecutionProof, "signature"> = {
      proof_id,
      agreement_id: args.agreement.agreement_id,
      provider_id: args.agreement.provider_id,
      started_at: args.started_at,
      completed_at,
      measured_latency_ms: args.result.measured_latency_ms,
      measured_uptime_pct: args.result.measured_uptime_pct,
      output_hash,
      output_cid,
      logs_cid,
    };

    // Build signing payload with metadata for tamper detection
    const metadata: ProofMetadata = {
      schema_version: SCHEMA_VERSIONS.proof,
      chain_hash: this.lastProofHash,
      escrow_uid: args.escrow_uid,
      nonce,
    };

    const signingPayload = { ...unsigned, _meta: metadata };
    const digest = hashJson(signingPayload);
    const signature = await args.provider.account.signMessage({ message: { raw: digest as `0x${string}` } });

    // Update chain hash for tamper detection
    this.lastProofHash = digest;

    log.info({ proof_id, agreement_id: args.agreement.agreement_id, schema: SCHEMA_VERSIONS.proof }, "proof signed");
    getEventBus().emit_event("ProofSubmitted", {
      proof_id,
      agreement_id: args.agreement.agreement_id,
      provider_id: args.agreement.provider_id,
      output_hash,
      schema_version: SCHEMA_VERSIONS.proof,
    }, { agreement_id: args.agreement.agreement_id, agent_id: args.agreement.provider_id });

    return { ...unsigned, signature };
  }

  /** Get the chain hash for tamper detection verification */
  getChainHash(): string | undefined {
    return this.lastProofHash;
  }
}
