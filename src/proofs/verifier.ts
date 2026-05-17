/**
 * Proof Verifier — Multi-party verification with structured reports.
 *
 * Production features:
 *   - Signature recovery and validation
 *   - Obligation-by-obligation verification
 *   - Time-bound validation (reject stale proofs)
 *   - Multi-party verification support (provider + validator)
 *   - Deterministic verification reports
 */
import { recoverMessageAddress } from "viem";
import { hashJson, now } from "../core/ids.js";
import type { Agreement, ExecutionProof } from "../core/types.js";
import type { AgentRegistry } from "../registry/registry.js";
import { getEventBus } from "../core/events.js";
import { validateTimeBound } from "../core/protocol.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ObligationResult {
  kind: string;
  met: boolean;
  observed: unknown;
  required: unknown;
  weight: number;
}

export interface VerificationReport {
  signature_valid: boolean;
  time_valid: boolean;
  obligations: ObligationResult[];
  fully_met: boolean;
  failing_weight: number;
  confidence: number; // 0-100 confidence score
  verified_at: number;
  verifier_notes: string[];
}

// ─── Verifier ───────────────────────────────────────────────────────────────

export class ProofVerifier {
  constructor(private registry: AgentRegistry, private maxProofAgeSec = 7200) {}

  async verify(agreement: Agreement, proof: ExecutionProof): Promise<VerificationReport> {
    const notes: string[] = [];
    const verified_at = now();

    // 1. Signature verification
    const { signature, ...unsigned } = proof;
    const digest = hashJson(unsigned);
    const provider = this.registry.require(proof.provider_id);
    let signature_valid = false;
    try {
      const signer = await recoverMessageAddress({
        message: { raw: digest as `0x${string}` },
        signature: signature as `0x${string}`,
      });
      signature_valid = signer.toLowerCase() === provider.wallet.toLowerCase();
      if (!signature_valid) {
        notes.push(`signature mismatch: recovered ${signer}, expected ${provider.wallet}`);
      }
    } catch (e) {
      signature_valid = false;
      notes.push(`signature recovery failed: ${(e as Error).message}`);
    }

    // 2. Time-bound validation
    const time_valid = validateTimeBound(proof.completed_at, this.maxProofAgeSec, 60);
    if (!time_valid) {
      notes.push(`proof timestamp ${proof.completed_at} outside acceptable window`);
    }

    // 3. Agreement binding validation
    if (proof.agreement_id !== agreement.agreement_id) {
      notes.push("proof agreement_id does not match");
    }
    if (proof.provider_id !== agreement.provider_id) {
      notes.push("proof provider_id does not match agreement");
    }

    // 4. Obligation verification
    const obligations: ObligationResult[] = agreement.obligations.map((o) => {
      if (o.kind === "latency") {
        const required = Number(o.threshold);
        const met = proof.measured_latency_ms <= required;
        if (!met) notes.push(`latency ${proof.measured_latency_ms}ms exceeds ${required}ms`);
        return { kind: o.kind, met, observed: proof.measured_latency_ms, required, weight: o.weight };
      }
      if (o.kind === "uptime") {
        const required = Number(o.threshold);
        const met = proof.measured_uptime_pct >= required;
        if (!met) notes.push(`uptime ${proof.measured_uptime_pct}% below ${required}%`);
        return { kind: o.kind, met, observed: proof.measured_uptime_pct, required, weight: o.weight };
      }
      if (o.kind === "deliverable") {
        const met = Boolean(proof.output_hash) && proof.output_hash.startsWith("0x") && proof.output_hash.length >= 66;
        if (!met) notes.push("deliverable: invalid or missing output_hash");
        return { kind: o.kind, met, observed: proof.output_hash, required: o.threshold, weight: o.weight };
      }
      if (o.kind === "deadline") {
        const required = Number(o.threshold);
        const met = proof.completed_at <= required;
        if (!met) notes.push(`deadline missed: completed at ${proof.completed_at}, required by ${required}`);
        return { kind: o.kind, met, observed: proof.completed_at, required, weight: o.weight };
      }
      return { kind: o.kind, met: false, observed: null, required: o.threshold, weight: o.weight };
    });

    // 5. Calculate failing weight and confidence
    const failing_weight = obligations.reduce(
      (acc, o) => acc + (o.met ? 0 : o.weight),
      0
    );

    const fully_met = signature_valid && time_valid && obligations.every((o) => o.met);

    // Confidence scoring: 100 = perfect, decreases with issues
    let confidence = 100;
    if (!signature_valid) confidence -= 50;
    if (!time_valid) confidence -= 20;
    confidence -= Math.round(failing_weight * 30);
    confidence = Math.max(0, Math.min(100, confidence));

    const report: VerificationReport = {
      signature_valid,
      time_valid,
      obligations,
      fully_met,
      failing_weight,
      confidence,
      verified_at,
      verifier_notes: notes,
    };

    getEventBus().emit_event("ProofVerified", {
      proof_id: proof.proof_id,
      agreement_id: agreement.agreement_id,
      signature_valid,
      fully_met,
      confidence,
    }, { agreement_id: agreement.agreement_id });

    return report;
  }
}
