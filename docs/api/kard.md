# Kard

The main protocol facade.

## Create an instance

```ts
import { Kard } from "kard-ai";

// From environment variables
const kard = await Kard.fromEnv();

// From explicit config
const kard = await Kard.create({ sdk: { ... } });
```

## kard.fulfill(request, wallet)

Execute a complete autonomous commerce flow. This is the main function.

```ts
const result = await kard.fulfill(
  {
    request_id: newId("req"),
    buyer_id: buyer.agent_id,
    capability: "gpu_inference",
    max_price_wei: parseEther("0.01").toString(),
    max_latency_ms: 500,
    duration_seconds: 3600,
    payload: { prompt: "analyze this data" },
    verification: "execution_proof",
  },
  buyerWallet
);
```

Returns:

```ts
{
  agreement: Agreement;          // the negotiated agreement
  proof_cid: string;             // Filecoin CID of execution proof
  agreement_cid: string;         // Filecoin CID of agreement
  verdict_cid: string;           // Filecoin CID of arbitration verdict
  fulfillment_cid: string;       // Filecoin CID of fulfillment statement
  receipt: SettlementReceipt;    // payment amounts
  escrow: EscrowReceipt;         // escrow transaction details
  fulfillment: FulfillmentStatement;
  workflow_id: string;           // OpenClaw workflow ID
  protocol_version: string;      // "kard.v1"
}
```

## kard.registerProvider(impl)

Register execution logic for a provider agent:

```ts
kard.registerProvider({
  agent_id: seller.agent_id,
  wallet: sellerWallet,
  execute: async (req, agreement) => ({
    output: { result: "done" },
    measured_latency_ms: 150,
    measured_uptime_pct: 99.7,
    logs: ["step 1", "step 2"],
  }),
});
```

## kard.registry

Register and look up agents:

```ts
const agent = await kard.registry.register(createAgentProfile({ ... }));
const found = kard.registry.get(agentId);
const byWallet = kard.registry.byWalletAddress(address);
```

## kard.marketplace

List and find services:

```ts
kard.marketplace.list({ provider_id, capability, price_wei, pricing_unit, sla });
const listings = kard.marketplace.byCapability("gpu_inference");
```

## kard.getEventLog()

Get the full protocol event log:

```ts
const events = kard.getEventLog();
```

## kard.shutdown()

Gracefully stop the IPFS node:

```ts
await kard.shutdown();
```
