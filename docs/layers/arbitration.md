# Arbitration

The arbitration layer provides structured, verifiable decision-making with confidence scoring and an appeal mechanism.

## How it works

1. Arbiter receives the agreement and execution proof
2. Verifier checks signature, time bounds, and each obligation
3. Arbiter classifies the result into a structured decision
4. Verdict is signed and pinned to Filecoin

## Usage

```ts
import { AIArbiter } from "kard-ai/arbitration";

const arbiter = new AIArbiter(verifier, "ai_arbiter_v1");
const verdict = await arbiter.decide(agreement, proof);

console.log(verdict.approved);     // true/false
console.log(verdict.penalty_bps);  // 0-10000 (basis points)
console.log(verdict.reason);       // structured explanation
```

## Decision factors

The arbiter evaluates four weighted factors:

| Factor | Weight | What it checks |
|---|---|---|
| Signature | 0.3 | Is the proof signed by the registered provider? |
| Time bound | 0.1 | Is the proof within acceptable time window? |
| Obligations | 0.5 | Are latency, uptime, deliverable met? |
| Verifier confidence | 0.1 | Overall confidence from the verifier |

## Decision outcomes

| Condition | Result | Penalty |
|---|---|---|
| Invalid signature | Rejected | 100% (10000 bps) |
| Stale proof | Rejected | 100% |
| All obligations met | Approved | 0% |
| Partial failure (< 75% weight) | Approved with penalty | Proportional |
| Severe failure (≥ 75% weight) | Rejected | 100% |

## Appeal mechanism

Either party can appeal a verdict:

```ts
// File an appeal
const appeal = arbiter.fileAppeal({
  verdict_id: verdict.verdict_id,
  agreement_id: agreement.agreement_id,
  appellant_id: provider.agent_id,
  reason: "latency measurement was affected by network conditions",
});

// Process the appeal (re-verification)
const result = await arbiter.processAppeal(
  appeal.appeal_id,
  agreement,
  proof
);

if (result.upheld) {
  // Original verdict was wrong — use revised verdict
  console.log(result.revised_verdict);
} else {
  // Original verdict stands
  console.log(result.reason);
}
```

## Verdict schema

```ts
interface ArbitrationVerdict {
  verdict_id: string;
  agreement_id: string;
  proof_id: string;
  arbiter_id: string;
  approved: boolean;
  reason: string;
  penalty_bps: number;  // 0-10000
  decided_at: number;
}
```
