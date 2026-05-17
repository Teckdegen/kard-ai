# Protocol Flow

Every `kard.fulfill()` call executes a complete economic workflow orchestrated by OpenClaw.

## Workflow tasks

| Step | Task | What happens |
|---|---|---|
| 1 | `negotiate` | Bid/counter-offer loop converges on price |
| 2 | `escrow_lock` | Funds locked onchain via Alkahest |
| 3 | `execute_service` | Provider runs the work, produces signed proof |
| 4 | `arbitrate` | Obligations verified, verdict issued |
| 5 | `aomi_settlement` | Pay provider or refund buyer onchain |
| 6 | `update_reputation` | Trust score updated |

## Task dependencies

```
negotiate → escrow_lock → execute_service → arbitrate → settle → reputation
```

Each task only runs after its dependencies complete. If any task fails, the workflow halts and saga compensation runs in reverse.

## Negotiation

The negotiation engine uses a bid/counter-offer loop:

1. Buyer opens at 70% of max budget
2. Provider starts at listing price
3. Each round: buyer steps up 5%, provider steps down 5%
4. Converges when buyer bid ≥ provider ask
5. Final price is the provider's last ask (lower of the two)

```ts
const result = await kard.negotiation.negotiate({
  request,
  buyer: buyerProfile,
  provider: providerProfile,
  listing,
  arbiter_id: "ai_arbiter_v1",
});
// result.agreement.agreed_price_wei — the converged price
// result.rounds — full negotiation history
```

## Escrow lock

Funds are locked onchain via Alkahest's `makeStatement`:

```solidity
makeStatement({
  arbiter: arbiterAddress,
  demand: encodedObligations,
  token: tokenAddress,
  amount: agreedPrice
}, expiration)
```

The `demand` encodes the agreement's obligations (latency, uptime, deliverable) in ABI-encoded format.

## Execution + proof

The provider executes and produces a signed `ExecutionProof`:

```ts
{
  proof_id: "proof_abc123",
  agreement_id: "agmt_xyz",
  provider_id: "agent_seller",
  started_at: 1700000000,
  completed_at: 1700000001,
  measured_latency_ms: 150,
  measured_uptime_pct: 99.7,
  output_hash: "0x...",  // SHA-256 of output
  signature: "0x..."     // provider's signature
}
```

## Arbitration

The arbiter verifies:
1. Signature is valid (matches registered provider)
2. Proof is time-bound (not stale)
3. Each obligation is met (latency ≤ threshold, uptime ≥ threshold, etc.)

Produces a verdict with confidence score and penalty calculation.

## Settlement

Based on the verdict:
- **Approved (no penalty)** → full payment to provider
- **Approved (with penalty)** → reduced payment, partial refund
- **Rejected** → full refund to buyer

Settlement calls Alkahest's `collectPayment` or `refund` onchain.
