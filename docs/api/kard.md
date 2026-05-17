# Kard

The main protocol facade that composes all 13 layers.

## `Kard.create(config)`

Create a new Kard instance with explicit configuration.

```ts
const kard = await Kard.create({
  sdk: {
    chain: { chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" },
    escrow: { escrowAddress: "0x...", arbiterAddress: "0x..." },
    filecoinPin: { endpoint: "https://...", token: "..." },
  },
});
```

## `Kard.fromEnv()`

Create from environment variables.

```ts
const kard = await Kard.fromEnv();
```

## `kard.fulfill(request, wallet)`

Execute a complete autonomous commerce flow.

**Parameters:**
- `request: ServiceRequest` — what the buyer wants
- `wallet: AgentWallet` — buyer's wallet for signing and payment

**Returns:** `FulfillResult`

```ts
interface FulfillResult {
  agreement: Agreement;
  proof_cid: string;
  agreement_cid: string;
  verdict_cid: string;
  fulfillment_cid: string;
  receipt: SettlementReceipt;
  escrow: EscrowReceipt;
  fulfillment: FulfillmentStatement;
  workflow_id: string;
  protocol_version: string;
}
```

## `kard.registerProvider(impl)`

Register execution logic for a provider agent.

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

## `kard.getEventLog()`

Get the full protocol event log.

```ts
const events = kard.getEventLog();
```

## `kard.shutdown()`

Gracefully stop the IPFS node and clean up.

```ts
await kard.shutdown();
```

## Properties

| Property | Type | Description |
|---|---|---|
| `kard.registry` | `AgentRegistry` | Agent identity store |
| `kard.marketplace` | `Marketplace` | Service listings |
| `kard.discovery` | `DiscoveryEngine` | Candidate scoring |
| `kard.negotiation` | `NegotiationEngine` | Price convergence |
| `kard.escrow` | `AlkahestEscrow` | Onchain fund management |
| `kard.orchestrator` | `OpenClaw` | Workflow engine |
| `kard.proofs` | `ProofBuilder` | Proof construction |
| `kard.verifier` | `ProofVerifier` | Proof verification |
| `kard.arbiter` | `AIArbiter` | Arbitration decisions |
| `kard.reputation` | `ReputationEngine` | Trust scoring |
| `kard.memory` | `MemoryStore` | IPFS + Filecoin |
| `kard.archive` | `Archive` | Queryable CID index |
| `kard.events` | `EventBus` | Protocol event bus |
