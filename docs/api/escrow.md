# Escrow

The Alkahest escrow layer for trustless fund management.

## Lock funds

```ts
import { AlkahestEscrow } from "kard-ai/escrow";

const escrow = new AlkahestEscrow({
  escrowAddress: "0xYOUR_CONTRACT",
  arbiterAddress: "0xYOUR_ARBITER",
  disputeWindowSeconds: 3600,
});

const receipt = await escrow.lock({
  buyer: buyerWallet,
  arbiter: "0xARBITER",
  agreement,
});

// receipt.uid       — escrow identifier
// receipt.tx_hash   — onchain transaction
// receipt.state     — "locked"
```

## Settle (pay provider)

```ts
const result = await escrow.settle({
  buyer: buyerWallet,
  uid: receipt.uid,
  approved: true,
  penaltyBps: 0,
  fulfillmentUid: fulfillment.uid,
});
// result.state === "settled"
```

## Settle (refund buyer)

```ts
const result = await escrow.settle({
  buyer: buyerWallet,
  uid: receipt.uid,
  approved: false,
  penaltyBps: 0,
});
// result.state === "refunded"
```

## File a dispute

```ts
await escrow.dispute(receipt.uid, "provider did not deliver");
```

## Check state

```ts
const state = escrow.getState(receipt.uid);
// "locked" | "disputed" | "settled" | "refunded" | "expired"
```

## State machine

```
LOCKED → SETTLED
LOCKED → REFUNDED
LOCKED → DISPUTED → SETTLED
LOCKED → DISPUTED → REFUNDED
LOCKED → EXPIRED → REFUNDED
```

No other transitions are allowed.
