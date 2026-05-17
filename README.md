# Kard

> Trust infrastructure for autonomous economies.

Kard is the coordination and settlement protocol that enables autonomous agents to discover services, negotiate agreements, escrow payments, verify execution, settle trustlessly, and maintain persistent economic memory — all onchain, all real.

[![npm version](https://img.shields.io/npm/v/kard-ai)](https://www.npmjs.com/package/kard-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

---

## Install

```bash
npm install kard-ai
```

Requires Node.js ≥ 20.

---

## Configuration

Every variable is **required**. Kard runs real onchain infrastructure — no simulation, no fallbacks.

Create a `.env` file:

```env
# ─── Chain (REQUIRED) ───────────────────────────────────────────────────────
# Filecoin Mainnet: CHAIN_ID=314, RPC_URL=https://api.node.glif.io/rpc/v1
# Filecoin Calibration: CHAIN_ID=314159, RPC_URL=https://api.calibration.node.glif.io/rpc/v1
CHAIN_ID=314
RPC_URL=https://api.node.glif.io/rpc/v1

# ─── Alkahest Escrow Contracts (REQUIRED) ───────────────────────────────────
# Onchain escrow for trustless fund locking and settlement.
# Deploy Alkahest or use an existing deployment.
ALKAHEST_ESCROW=0x...
ALKAHEST_ARBITER_TRUSTED_PARTY=0x...

# ─── Filecoin Pin (REQUIRED) ────────────────────────────────────────────────
# IPFS Pinning Service API — all protocol artifacts are pinned permanently.
# Providers: web3.storage, Storacha, or any PSA-compatible endpoint.
FILECOIN_PIN_ENDPOINT=https://api.web3.storage/pins
FILECOIN_PIN_TOKEN=your-bearer-token
FILECOIN_PIN_POLL_MS=2000
FILECOIN_PIN_TIMEOUT_MS=120000

# ─── Agent Private Keys (REQUIRED) ──────────────────────────────────────────
# Fund these wallets with FIL on your target chain.
# NEVER commit real private keys to version control.
BUYER_PK=0x...
SELLER_PK=0x...
ARBITER_PK=0x...

# ─── Smart Account / Account Abstraction (REQUIRED for Aomi AA mode) ────────
# ERC-4337 smart account for non-custodial agent execution.
AA_SMART_ACCOUNT=0x...
AA_BUNDLER_URL=https://bundler.example/rpc
AA_ENTRYPOINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# ─── Escrow Tuning (REQUIRED) ───────────────────────────────────────────────
# Token address (zero = native FIL)
ESCROW_TOKEN=0x0000000000000000000000000000000000000000
# Dispute window — how long parties can file disputes after execution
DISPUTE_WINDOW_SECONDS=3600

# ─── Logging ────────────────────────────────────────────────────────────────
LOG_LEVEL=info
```

---

## Usage

### Initialize from environment

```ts
import { Kard } from "kard-ai";

const kard = await Kard.fromEnv();
```

### Initialize with explicit config

```ts
import { Kard, type KardSDKConfig } from "kard-ai";

const kard = await Kard.create({
  sdk: {
    chain: {
      chainId: 314,
      rpcUrl: "https://api.node.glif.io/rpc/v1",
    },
    escrow: {
      escrowAddress: "0xYOUR_ALKAHEST_ESCROW",
      arbiterAddress: "0xYOUR_ARBITER",
      token: "0x0000000000000000000000000000000000000000",
      disputeWindowSeconds: 3600,
    },
    filecoinPin: {
      endpoint: "https://api.web3.storage/pins",
      token: "your-bearer-token",
      pollIntervalMs: 2000,
      pollTimeoutMs: 120000,
    },
    smartAccount: {
      address: "0xYOUR_SMART_ACCOUNT",
      bundlerUrl: "https://bundler.example/rpc",
      entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    },
    logLevel: "info",
  },
});
```

---

## Buyer — purchase a service

```ts
import { Kard, createAgentProfile, createAgentWallet, newId, resolveChainEnv } from "kard-ai";
import { parseEther } from "viem";

const kard = await Kard.fromEnv();
const chainEnv = resolveChainEnv({ chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" });
const wallet = createAgentWallet("0xYOUR_BUYER_PK", chainEnv);

const buyer = await kard.registry.register(
  createAgentProfile({ wallet, capabilities: ["research"] })
);

const result = await kard.fulfill(
  {
    request_id: newId("req"),
    buyer_id: buyer.agent_id,
    capability: "gpu_inference",
    max_price_wei: parseEther("0.01").toString(),
    max_latency_ms: 500,
    duration_seconds: 3600,
    payload: { prompt: "summarize BTC sentiment" },
    verification: "execution_proof",
  },
  wallet
);

console.log(result.escrow.tx_hash);   // onchain escrow lock tx
console.log(result.receipt);          // settlement amounts
console.log(result.agreement_cid);    // Filecoin CID
console.log(result.proof_cid);        // execution proof CID
console.log(result.protocol_version); // "kard.v1"
```

---

## Seller — monetize a service

```ts
import { Kard, createAgentProfile, createAgentWallet, resolveChainEnv } from "kard-ai";
import { parseEther } from "viem";

const kard = await Kard.fromEnv();
const chainEnv = resolveChainEnv({ chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" });
const wallet = createAgentWallet("0xYOUR_SELLER_PK", chainEnv);

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
    const result = await yourInferenceEngine(req.payload.prompt);
    return {
      output: result,
      measured_latency_ms: Date.now() - start,
      measured_uptime_pct: 99.8,
      logs: ["model loaded", "inference complete"],
    };
  },
});
```

---

## Aomi Skills — composable agent capabilities

```ts
import { AomiRuntime, createAgentWallet, resolveChainEnv } from "kard-ai";
import { parseEther } from "viem";

const chainEnv = resolveChainEnv({ chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" });
const wallet = createAgentWallet("0xKEY", chainEnv);

const aomi = new AomiRuntime(wallet, {
  smartAccount: {
    address: "0xYOUR_SMART_ACCOUNT",
    bundlerUrl: "https://bundler.example/rpc",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  },
});

aomi.registerSkill<{ topic: string }, { summary: string }>({
  name: "summarize_topic",
  description: "produce a 200-word summary",
  permissions: { requires_approval: false, max_value_wei: parseEther("0.05") },
  run: async (input) => ({ summary: await yourLLM(`summarize ${input.topic}`) }),
});

const inv = await aomi.runSkill("summarize_topic", { topic: "Filecoin" });
console.log(inv.signed_intent);  // cryptographically signed, replay-protected
console.log(inv.status);         // "completed"
```

---

## Filecoin Pin — persistent economic memory

```ts
import { FilecoinPinClient } from "kard-ai";

const fc = new FilecoinPinClient({
  endpoint: "https://api.web3.storage/pins",
  token: "your-token",
  pollIntervalMs: 2000,
  pollTimeoutMs: 120000,
});

const rec = await fc.pin({ cid: "bafy...", name: "my-dataset" });
await fc.waitUntilPinned(rec.requestid);
console.log("Pinned to Filecoin permanently");
```

---

## What happens when you call `kard.fulfill()`

```
1. Discovery    → scores providers by price/latency/reputation/uptime
2. Negotiation  → bid/counter-offer loop converges on price
3. Escrow       → funds locked onchain via Alkahest makeStatement (tx)
4. Execution    → provider runs work, produces signed proof
5. Arbitration  → obligations verified, verdict issued with confidence score
6. Settlement   → Alkahest collectPayment or refund onchain (tx)
7. Reputation   → provider trust score updated
8. Memory       → all artifacts pinned to Filecoin via IPFS
```

Every step produces cryptographically signed artifacts. Every artifact gets a permanent Filecoin CID.

---

## Sub-path imports

```ts
import { AlkahestEscrow } from "kard-ai/escrow";
import { OpenClaw } from "kard-ai/orchestrator";
import { AomiRuntime } from "kard-ai/execution";
import { FilecoinPinClient, Archive } from "kard-ai/memory";
import { ProofBuilder, ProofVerifier } from "kard-ai/proofs";
import { AIArbiter } from "kard-ai/arbitration";
import { ReputationEngine } from "kard-ai/reputation";
import { SwarmCoordinator } from "kard-ai/swarm";
import { AutonomousOrganization } from "kard-ai/dao";
import { EventBus } from "kard-ai/events";
import { NonceRegistry, PROTOCOL_VERSION } from "kard-ai/protocol";
```

---

## Event log

Every protocol action is captured:

```ts
const events = kard.getEventLog();
// AgreementCreated, EscrowLocked, ExecutionStarted,
// ExecutionCompleted, ArbitrationIssued, SettlementExecuted,
// ReputationUpdated, ...
```

---

## Build & publish

```bash
npm run clean
npm run build
npm publish
```

---

## Protocol stack

| Layer | Technology | Purpose |
|---|---|---|
| Escrow | Alkahest | Onchain fund locking + settlement |
| Orchestration | OpenClaw | Fault-tolerant task-DAG coordination |
| Execution | Aomi | Account abstraction + signed intents |
| Storage | Filecoin Pin | Permanent content-addressed memory |
| Chain | Filecoin | Native settlement layer |

---

## Security

- Replay protection (nonce tracking on all requests)
- Re-entrancy guards on settlement
- Escrow state machine (no invalid transitions)
- Sybil detection via interaction graph
- Value-weighted reputation (can't farm with dust)
- Time-bound proofs (reject stale)
- Kill-switch for compromised runtimes
- Dispute windows with appeal mechanism

---

## License

MIT
