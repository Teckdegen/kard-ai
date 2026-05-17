# Filecoin Memory

Every protocol artifact is content-addressed via IPFS and pinned to Filecoin for permanent storage.

## How it works

1. Data is stored on IPFS via Helia (produces a CID)
2. The CID is submitted to a Filecoin Pinning Service API endpoint
3. The pinning service stores the data on Filecoin storage providers
4. The CID is permanently retrievable

## Usage

### Store and pin JSON

```ts
const cid = await kard.memory.putJson({ key: "value" }, "my-data");
// cid = "bafyrei..." — content-addressed, pinned to Filecoin
```

### Store and pin bytes

```ts
const cid = await kard.memory.putBytes(new Uint8Array([1, 2, 3]), "raw-data");
```

### Retrieve data

```ts
const data = await kard.memory.getJson(cid);
const bytes = await kard.memory.getBytes(cid);
```

### Explicit pin with metadata

```ts
const result = await kard.memory.pin(cid, "agreement-123", {
  source: "kard-protocol",
  agreement_id: "agmt_abc",
});
// result.requestid — pin tracking ID
// result.status — "queued" | "pinning" | "pinned"
```

## Filecoin Pin Client

Direct access to the IPFS Pinning Service API:

```ts
import { FilecoinPinClient } from "kard-ai/memory";

const fc = new FilecoinPinClient({
  endpoint: "https://api.web3.storage/pins",
  token: "your-token",
});

// Pin a CID
const rec = await fc.pin({ cid: "bafy...", name: "my-dataset" });

// Wait for confirmation
await fc.waitUntilPinned(rec.requestid);

// List pins
const pins = await fc.list({ status: ["pinned"] });

// Remove a pin
await fc.unpin(rec.requestid);
```

## Archive

The archive provides a queryable index over all pinned protocol artifacts:

```ts
// Store protocol artifacts
const cid = await kard.archive.putAgreement(agreement);
await kard.archive.putProof(proof);
await kard.archive.putVerdict(verdict);
await kard.archive.putReceipt(receipt);

// Query by kind
const proofs = kard.archive.list({ kind: "proof" });

// Query by reference
const forAgreement = kard.archive.list({ ref: agreement.agreement_id });

// Query by agent
const agentArtifacts = kard.archive.list({ ref: agent.agent_id });
```

## What gets pinned

| Artifact | When | Contains |
|---|---|---|
| Agent Profile | On registration | capabilities, wallet, reputation |
| Agreement | After negotiation | terms, obligations, price |
| Execution Proof | After execution | latency, uptime, output hash, signature |
| Fulfillment Statement | After execution | Alkahest attestation |
| Arbitration Verdict | After arbitration | approved/rejected, penalty, confidence |
| Settlement Receipt | After settlement | amounts paid/refunded |
| Negotiation Log | After negotiation | all bid/counter rounds |

## CID relationships

```
Agreement CID
  ├── references → Proof CID
  ├── references → Verdict CID
  ├── references → Receipt CID
  └── references → Negotiation Log CID
```

All relationships are queryable via the archive index.
