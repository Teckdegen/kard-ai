# Escrow API

## `AlkahestEscrow`

```ts
import { AlkahestEscrow } from "kard/escrow";

const escrow = new AlkahestEscrow({
  escrowAddress: "0x...",
  arbiterAddress: "0x...",
  token: "0x0000000000000000000000000000000000000000",
  disputeWindowSeconds: 3600,
  expirationBufferSeconds: 7200,
});
```

### `escrow.lock(args)`

Lock funds onchain.

```ts
const receipt = await escrow.lock({
  buyer: AgentWallet,
  arbiter: Address,
  agreement: Agreement,
});
// Returns: EscrowReceipt { uid, buyer, arbiter, amount, tx_hash, state, nonce }
```

### `escrow.settle(args)`

Settle an escrow (pay or refund).

```ts
const result = await escrow.settle({
  buyer: AgentWallet,
  uid: Hex,
  approved: boolean,
  penaltyBps: number,       // 0-10000
  fulfillmentUid?: Hex,
});
// Returns: SettleResult { paid_provider, refunded_buyer, protocol_fee, tx_hash, state }
```

### `escrow.dispute(uid, reason)`

File a dispute against a locked escrow.

```ts
await escrow.dispute(uid, "provider failed to deliver");
```

### `escrow.checkExpiration(uid)`

Check if an escrow has expired.

```ts
const expired = escrow.checkExpiration(uid); // true/false
```

### `escrow.refundExpired(args)`

Refund an expired escrow.

```ts
const result = await escrow.refundExpired({ buyer: wallet, uid });
```

### `escrow.getRecord(uid)`

Get the full escrow record.

```ts
const record = escrow.getRecord(uid);
// EscrowRecord { uid, state, buyer, arbiter, amount, token, locked_at, ... }
```

### `escrow.getState(uid)`

Get current escrow state.

```ts
const state = escrow.getState(uid); // "locked" | "settled" | "refunded" | ...
```

## `encodeDemand(agreement)`

Encode agreement obligations into ABI format for the escrow contract.

```ts
import { encodeDemand } from "kard/escrow";
const demand = encodeDemand(agreement); // Hex
```

## `buildFulfillmentStatement(args)`

Build a signed fulfillment attestation.

```ts
import { buildFulfillmentStatement } from "kard/escrow";

const statement = await buildFulfillmentStatement({
  provider: providerWallet,
  buyerWallet: buyerAddress,
  agreement,
  proof,
});
// FulfillmentStatement { uid, schema, data, attester, recipient, signature, ts, proof_id }
```
