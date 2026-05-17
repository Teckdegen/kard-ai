# Kard

> Trust infrastructure for autonomous economies.

Kard is the coordination and settlement protocol that enables autonomous agents to discover services, negotiate agreements, escrow payments, verify execution, settle trustlessly, and maintain persistent economic memory — all onchain, all real, no simulation.

[![npm version](https://img.shields.io/npm/v/kard)](https://www.npmjs.com/package/kard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green)](https://nodejs.org/)

---

## Why Kard exists

The internet enabled information exchange. Crypto enabled value exchange.

**Kard enables autonomous economic coordination.**

As persistent AI agents, autonomous workflows, and machine-native organizations become the norm, they need infrastructure for trust, settlement, verification, reputation, and programmable agreements. Kard is that infrastructure.

---

## Install

```bash
npm install kard
```

Requires Node.js ≥ 20.

---

## Configuration

Kard is fully configurable via the SDK. Pass your infrastructure config explicitly — no hidden env-var magic:

```ts
import { Kard, type KardSDKConfig } from "kard";

const config: KardSDKConfig = {
  chain: {
    chainId: 314,                                    // Filecoin Mainnet
    rpcUrl: "https://api.node.glif.io/rpc/v1",
  },
  escrow: {
    escrowAddress: "0x...",                           // Alkahest escrow contract
    arbiterAddress: "0x...",                          // Trusted arbiter address
  },
  filecoinPin: {
    endpoint: "https://api.web3.storage/pins",       // IPFS Pinning Service API
    token: "your-bearer-token",
  },
};

const kard = await Kard.create({ sdk: config });
```

Or load from environment variables (convenience helper):

```ts
import { Kard } from "kard";

const kard = await Kard.fromEnv();
```

### Required environment variables

```env
# Chain
CHAIN_ID=314
RPC_URL=https://api.node.glif.io/rpc/v1

# Alkahest Escrow (onchain contracts)
ALKAHEST_ESCROW=0x...
ALKAHEST_ARBITER_TRUSTED_PARTY=0x...

# Filecoin Pin (IPFS Pinning Service API)
FILECOIN_PIN_ENDPOINT=https://api.web3.storage/pins
FILECOIN_PIN_TOKEN=your-token

# Agent keys (funded with FIL)
BUYER_PK=0x...
SELLER_PK=0x...
ARBITER_PK=0x...
```

### Optional configuration

```env
# Smart Account (ERC-4337)
AA_SMART_ACCOUNT=0x...
AA_BUNDLER_URL=https://bundler.example/rpc
AA_ENTRYPOINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# Escrow tuning
ESCROW_TOKEN=0x0000000000000000000000000000000000000000
DISPUTE_WINDOW_SECONDS=3600

# Logging
LOG_LEVEL=info
```

---

## Usage

### Buyer — purchase a service autonomously

```ts
import { Kard, createAgentProfile, createAgentWallet, newId, resolveChainEnv } from "kard";
import { parseEther } from "viem";

const kard = await Kard.fromEnv();

const chainEnv = resolveChainEnv({ chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" });
const wallet = createAgentWallet("0xYOUR_PRIVATE_KEY", chainEnv);

const me = await kard.registry.register(
  createAgentProfile({ wallet, capabilities: ["research"] })
);

const result = await kard.fulfill(
  {
    request_id: newId("req"),
    buyer_id: me.agent_id,
    capability: "gpu_inference",
    max_price_wei: parseEther("0.01").toString(),
    max_latency_ms: 500,
    duration_seconds: 3600,
    payload: { prompt: "summarize BTC sentiment" },
    verification: "execution_proof",
  },
  wallet
);

console.log(result.receipt);          // onchain settlement amounts
console.log(result.agreement_cid);    // permanent Filecoin CID
console.log(result.escrow.tx_hash);   // onchain escrow transaction
```

### Seller — monetize a service

```ts
import { Kard, createAgentProfile, createAgentWallet, resolveChainEnv } from "kard";
import { parseEther } from "viem";

const kard = await Kard.fromEnv();
const chainEnv = resolveChainEnv({ chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" });
const wallet = createAgentWallet("0xYOUR_SELLER_KEY", chainEnv);

const seller = await kard.registry.register(
  createAgentProfile({ wallet, capabilities: ["gpu_inference"] })
);

kard.marketplace.list({
  provider_id: seller.agent_id,
  capability: "gpu_inference",
  price_wei: parseEther("0.001").toString(),
  pricing_unit: "per_hour",
  sla: { uptime_pct: 99.5, max_latency_ms: 200 },
});

kard.registerProvider({
  agent_id: seller.agent_id,
  wallet,
  execute: async (req, agreement) => {
    const start = Date.now();
    const completion = await yourLLM(req.payload.prompt);
    return {
      output: { completion },
      measured_latency_ms: Date.now() - start,
      measured_uptime_pct: 99.7,
      logs: ["loaded model", "ran inference"],
    };
  },
});
```

### Aomi Skills — composable agent capabilities

```ts
import { AomiRuntime, createAgentWallet, resolveChainEnv } from "kard";
import { parseEther } from "viem";

const chainEnv = resolveChainEnv({ chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" });
const wallet = createAgentWallet("0xKEY", chainEnv);

const aomi = new AomiRuntime(wallet, {
  smartAccount: { address: "0xYOUR_SMART_ACCOUNT" },
});

aomi.registerSkill<{ topic: string }, { summary: string }>({
  name: "summarize_topic",
  description: "produce a 200-word summary",
  permissions: { requires_approval: false, max_value_wei: parseEther("0.05") },
  run: async (input) => ({ summary: await yourLLM(`summarize ${input.topic}`) }),
});

const inv = await aomi.runSkill("summarize_topic", { topic: "Filecoin" });
console.log(inv.signed_intent);  // cryptographically signed, replay-protected
```

### Filecoin Pin — persistent economic memory

```ts
import { FilecoinPinClient } from "kard";

const fc = new FilecoinPinClient({
  endpoint: "https://api.web3.storage/pins",
  token: "your-token",
});

const rec = await fc.pin({ cid: "bafy...", name: "my-dataset" });
await fc.waitUntilPinned(rec.requestid);
```

---

## Architecture

13 protocol layers, one composing facade. Everything runs onchain.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Kard Protocol                            │
│         kard.fulfill(request, wallet) → FulfillResult           │
├─────────────────────────────────────────────────────────────────┤
│  Registry → Marketplace → Discovery → Negotiation               │
│  Escrow (Alkahest) → Orchestrator (OpenClaw) → Execution (Aomi)│
│  Memory (IPFS+Filecoin) → Proofs → Arbitration → Reputation    │
│  Swarm Economies → Autonomous Organizations                     │
│  ─────────────────────────────────────────────────────────────  │
│  Event Sourcing Bus (full protocol audit trail)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Protocol flow

```
buyer agent              Kard Protocol                  provider agent
    │                         │                              │
    │── request ─────────────▶│                              │
    │                         │── discover candidates        │
    │                         │── negotiate (bid/counter) ──▶│
    │                         │◀───── agreement ─────────────│
    │                         │── Alkahest escrow lock (tx)  │
    │                         │── execute ───────────────────▶│
    │                         │◀── signed proof + fulfillment│
    │                         │── verify obligations         │
    │                         │── arbitrate → verdict        │
    │                         │── settle onchain (tx)        │
    │                         │── pin to Filecoin            │
    │                         │── update reputation          │
    │◀─── receipt + tx_hash ──│                              │
```

---

## Security model

Kard assumes every agent can be malicious. The protocol only trusts:

- **Signed messages** — all proofs, intents, and verdicts are cryptographically signed
- **Onchain escrow state** — strict state machine enforced by Alkahest contracts
- **Cryptographic proofs** — tamper-detected via hash chaining
- **Verified arbitration** — structured decisions with confidence scoring

Built-in protections:
- Replay attack prevention (nonce tracking)
- Re-entrancy guards on settlement
- Sybil detection via interaction graph analysis
- Value-weighted reputation (can't farm with dust)
- Time-bound proofs (reject stale submissions)
- Kill-switch for compromised runtimes
- Dispute windows with appeal mechanism

---

## Protocol integrations

| Integration | Role | What it does |
|---|---|---|
| **Alkahest** | Programmable trust | Onchain escrow with obligations, dispute windows, deterministic settlement |
| **OpenClaw** | Orchestration | Fault-tolerant task-DAG with idempotency, timeouts, saga compensation |
| **Aomi** | Execution | Account abstraction, signed intents, policy engine, smart accounts |
| **Filecoin Pin** | Economic memory | Content-addressed permanent storage via IPFS Pinning Service API |

---

## Tests

```bash
npm test              # all tests
npm run test:adversarial  # security-focused tests
```

Test coverage:
- Negotiation convergence
- Escrow state machine (lock, settle, dispute, refund, expiration)
- Proof signing and verification
- Obligation violation → penalty
- Discovery filtering
- Reputation updates
- DAG integrity (cycles, duplicates, unknown deps)
- Task timeouts
- Replay attack prevention
- Double-settlement blocking
- Forged proof detection
- Kill-switch enforcement
- Sybil detection
- Event sourcing completeness

---

## Publishing to NPM

```bash
npm run clean
npm run build
npm publish
```

The package ships only the compiled `dist/src` directory with full type declarations.

---

## License

MIT — use it, fork it, build the autonomous economy on it.
