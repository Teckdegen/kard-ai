# Memory API

## `MemoryStore`

The IPFS memory interface (backed by Helia + Filecoin Pin).

### `store.putJson(value, name?)`

Store JSON on IPFS and pin to Filecoin. Returns CID.

### `store.getJson(cid)`

Retrieve JSON by CID.

### `store.putBytes(data, name?)`

Store raw bytes on IPFS and pin to Filecoin. Returns CID.

### `store.getBytes(cid)`

Retrieve bytes by CID.

### `store.pin(cid, name?, meta?)`

Explicitly pin a CID with metadata.

### `store.stop()`

Stop the IPFS node.

## `FilecoinPinClient`

Direct IPFS Pinning Service API client.

```ts
import { FilecoinPinClient } from "kard-ai/memory";

const fc = new FilecoinPinClient({
  endpoint: "https://api.web3.storage/pins",
  token: "your-token",
  pollIntervalMs: 2000,
  pollTimeoutMs: 120000,
});
```

### `fc.pin(obj)`

Submit a pin request.

### `fc.get(requestid)`

Get pin status.

### `fc.list(filter?)`

List pins with optional filter.

### `fc.unpin(requestid)`

Remove a pin.

### `fc.waitUntilPinned(requestid)`

Poll until pin is confirmed.

## `Archive`

Queryable index over pinned protocol artifacts.

```ts
import { Archive } from "kard-ai/memory";

const archive = new Archive(memoryStore);
```

### `archive.putAgreement(agreement)`
### `archive.putProof(proof)`
### `archive.putVerdict(verdict)`
### `archive.putReceipt(receipt)`
### `archive.putProfile(profile)`
### `archive.putNegotiationLog(log, refs)`

### `archive.list(filter?)`

Query entries by kind and/or reference.

```ts
const entries = archive.list({ kind: "proof", ref: agreementId });
```
