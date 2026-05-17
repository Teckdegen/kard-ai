# Proofs & Verification

The proof system provides cryptographically enforceable execution proofs with tamper detection.

## Proof schema

```ts
interface ExecutionProof {
  proof_id: string;           // unique proof identifier
  agreement_id: string;       // bound to specific agreement
  provider_id: string;        // who executed
  started_at: number;         // execution start time
  completed_at: number;       // execution end time
  measured_latency_ms: number; // actual latency
  measured_uptime_pct: number; // actual uptime
  output_hash: string;        // SHA-256 of execution output
  output_cid?: string;        // IPFS CID of full output
  logs_cid?: string;          // IPFS CID of execution logs
  signature: string;          // provider's cryptographic signature
}
```

## Building proofs

```ts
import { ProofBuilder } from "kard/proofs";

const builder = new ProofBuilder(memoryStore);

const proof = await builder.build({
  agreement,
  provider: providerWallet,
  result: {
    output: { completion: "BTC is bullish" },
    measured_latency_ms: 150,
    measured_uptime_pct: 99.7,
    logs: ["loaded model", "ran inference"],
  },
  started_at: Math.floor(Date.now() / 1000) - 1,
  escrow_uid: escrowReceipt.uid,
});
```

## Verifying proofs

```ts
import { ProofVerifier } from "kard/proofs";

const verifier = new ProofVerifier(registry);
const report = await verifier.verify(agreement, proof);

console.log(report.signature_valid);  // true/false
console.log(report.time_valid);       // within acceptable window
console.log(report.fully_met);        // all obligations satisfied
console.log(report.confidence);       // 0-100 confidence score
console.log(report.obligations);      // per-obligation results
console.log(report.verifier_notes);   // human-readable notes
```

## Verification report

```ts
interface VerificationReport {
  signature_valid: boolean;    // signature matches registered provider
  time_valid: boolean;         // proof within acceptable time window
  obligations: Array<{
    kind: string;              // "latency" | "uptime" | "deliverable" | "deadline"
    met: boolean;              // obligation satisfied?
    observed: unknown;         // actual measured value
    required: unknown;         // threshold from agreement
    weight: number;            // obligation weight (0-1)
  }>;
  fully_met: boolean;          // all checks pass
  failing_weight: number;      // sum of failed obligation weights
  confidence: number;          // 0-100 overall confidence
  verified_at: number;         // verification timestamp
  verifier_notes: string[];    // detailed notes
}
```

## Tamper detection

Proofs are hash-chained — each proof includes the hash of the previous proof. This creates a tamper-evident chain:

```ts
const builder = new ProofBuilder(store);
const proof1 = await builder.build({ ... });
const proof2 = await builder.build({ ... });
// proof2's metadata includes hash of proof1
// Tampering with proof1 breaks the chain
```

## Time-bound validation

Proofs are rejected if:
- `completed_at` is more than 2 hours in the past
- `completed_at` is more than 60 seconds in the future
- `started_at` is after `completed_at`
- Duration exceeds agreement duration + buffer
