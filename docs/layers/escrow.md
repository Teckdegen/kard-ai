# Alkahest Escrow

The escrow layer implements a strict state machine for trustless fund management via Alkahest onchain contracts.

## State machine

```
CREATED → LOCKED → DISPUTED → SETTLED
                 → DISPUTED → REFUNDED
                 → SETTLED
                 → REFUNDED
                 → EXPIRED → REFUNDED
```

Invalid transitions are rejected with an error.

## Usage

### Lock funds

```ts
import { AlkahestEscrow } from "kard/escrow";

const escrow = new AlkahestEscrow({
  escrowAddress: "0xYOUR_ESCROW_CONTRACT",
  arbiterAddress: "0xYOUR_ARBITER",
  disputeWindowSeconds: 3600,
});

const receipt = await escrow.lock({
  buyer: buyerWallet,
  arbiter: "0xARBITER_ADDRESS",
  agreement,
});

console.log(receipt.uid);      // escrow UID
console.log(receipt.tx_hash);  // onchain transaction
console.log(receipt.state);    // "locked"
```

### Settle (approve)

```ts
const result = await escrow.settle({
  buyer: buyerWallet,
  uid: receipt.uid,
  approved: true,
  penaltyBps: 0,
  fulfillmentUid: fulfillment.uid,
});
// result.state === "settled"
// result.tx_hash — onchain settlement tx
```

### Settle (refund)

```ts
const result = await escrow.settle({
  buyer: buyerWallet,
  uid: receipt.uid,
  approved: false,
  penaltyBps: 0,
});
// result.state === "refunded"
```

### File a dispute

```ts
await escrow.dispute(receipt.uid, "provider did not deliver");
// State transitions to "disputed"
// Can still be settled or refunded after dispute
```

### Handle expiration

```ts
const expired = escrow.checkExpiration(receipt.uid);
if (expired) {
  await escrow.refundExpired({ buyer: buyerWallet, uid: receipt.uid });
}
```

## Obligation encoding

Obligations are ABI-encoded into the escrow's `demand` field:

```ts
import { encodeDemand } from "kard/escrow";

const demand = encodeDemand(agreement);
// Encodes: capability, maxLatencyMs, minUptimeBps, outputSpec, schemaVersion
```

## Security features

- **Re-entrancy guard** — mutex prevents concurrent settlement of the same escrow
- **State machine** — only valid transitions are allowed
- **Penalty bounds** — BPS validated to 0-10000 range
- **Zero-amount rejection** — can't lock empty escrow
- **Dispute windows** — configurable time window for filing disputes
- **Expiration** — automatic expiration with safe refund path

## Protocol fee

A 0.5% (50 BPS) protocol fee is deducted from successful settlements.

```
paid_to_provider = (amount - penalty) * (1 - 0.005)
protocol_fee = (amount - penalty) * 0.005
refunded_to_buyer = penalty
```
