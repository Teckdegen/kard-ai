# Reputation

The reputation engine provides value-weighted, decay-aware, Sybil-resistant trust scoring.

## Scoring model

Trust score is calculated from:

| Factor | Weight | Description |
|---|---|---|
| Fulfillment rate | 0.40 | % of contracts completed successfully |
| Dispute rate (inverted) | 0.25 | Lower disputes = higher score |
| Historical trust | 0.20 | Momentum from previous score |
| Contract count | 0.15 | More contracts = more reliable |

## Anti-gaming features

### Value weighting

Reputation weight scales logarithmically with transaction value. A 1 ETH transaction carries ~3x the weight of a 0.001 ETH transaction. This prevents dust farming.

### Decay

Inactive agents lose reputation over time with a 90-day half-life. An agent inactive for 90 days retains 50% of their score. This prevents stale high-reputation accounts from being sold.

### Non-linear dispute penalty

Dispute rates above 10% are penalized exponentially:
- 0-10% → linear
- 10-30% → 1.5x multiplier
- 30%+ → 2x multiplier

### Sybil detection

```ts
const indicator = kard.reputation.detectSybil(agentId);
console.log(indicator.risk_score);  // 0-100
console.log(indicator.reasons);     // why it's suspicious
```

Detection signals:
- High trust with very few contracts
- High interaction graph similarity with another agent
- All transactions with a single counterparty
- Many small rapid transactions (farming pattern)

## Reputation threshold

High-value jobs require minimum reputation:

```ts
const eligible = kard.reputation.meetsThreshold(agentId, parseEther("1"));
// Requires: ≥5 completed contracts AND trust_score ≥ 60
```

## Reconstruction

Reputation is fully reproducible from the event log:

```ts
await kard.reputation.reconstruct(agentId);
// Replays all ReputationEvent entries to rebuild score
```

## Reputation schema

```ts
interface Reputation {
  fulfillment_rate: number;      // 0-100
  average_latency_ms: number;    // rolling average
  completed_contracts: number;   // total count
  dispute_ratio: number;         // 0-100
  trust_score: number;           // 0-100 composite
  total_volume_wei: string;      // lifetime volume
}
```
