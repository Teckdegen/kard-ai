# Memory

IPFS content addressing and Filecoin pinning for permanent storage.

## Store data

```ts
// Store JSON (automatically pinned to Filecoin)
const cid = await kard.memory.putJson({ key: "value" }, "my-data");

// Store bytes
const cid = await kard.memory.putBytes(new Uint8Array([1, 2, 3]), "raw");
```

## Retrieve data

```ts
const data = await kard.memory.getJson(cid);
const bytes = await kard.memory.getBytes(cid);
```

## Filecoin Pin client

```ts
import { FilecoinPinClient } from "kard-ai/memory";

const fc = new FilecoinPinClient({
  endpoint: "https://api.web3.storage/pins",
  token: "your-token",
  pollIntervalMs: 2000,
  pollTimeoutMs: 120000,
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

Query all pinned protocol artifacts:

```ts
// Everything for an agreement
const entries = kard.archive.list({ ref: agreement.agreement_id });

// All proofs
const proofs = kard.archive.list({ kind: "proof" });

// All verdicts for an agent
const verdicts = kard.archive.list({ kind: "verdict", ref: agent.agent_id });
```
