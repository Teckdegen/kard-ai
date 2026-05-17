# API Overview

Everything you need from a single import:

```ts
import { Kard, createAgentProfile, createAgentWallet, newId } from "kard-ai";
```

## Core

| Export | What it does |
|---|---|
| `Kard` | The protocol facade. Create with `Kard.create()` or `Kard.fromEnv()` |
| `createAgentProfile` | Create an agent identity with capabilities |
| `createAgentWallet` | Create a wallet from a private key |
| `resolveChainEnv` | Resolve chain config to a usable environment |
| `newId` | Generate unique protocol IDs |
| `hashJson` | Deterministic SHA256 hashing |

## Protocol layers

| Import | What it does |
|---|---|
| `AlkahestEscrow` | Onchain escrow with state machine |
| `OpenClaw` | Task DAG orchestration engine |
| `AomiRuntime` | Account abstraction execution runtime |
| `FilecoinPinClient` | IPFS Pinning Service API client |
| `ProofBuilder` | Build signed execution proofs |
| `ProofVerifier` | Verify proofs against agreements |
| `AIArbiter` | Arbitration with confidence scoring |
| `ReputationEngine` | Value weighted trust scoring |
| `SwarmCoordinator` | Multi agent revenue splits |
| `AutonomousOrganization` | Treasury bounded procurement |

## Sub path imports

```ts
import { AlkahestEscrow } from "kard-ai/escrow";
import { OpenClaw } from "kard-ai/orchestrator";
import { AomiRuntime } from "kard-ai/execution";
import { FilecoinPinClient } from "kard-ai/memory";
import { ProofBuilder, ProofVerifier } from "kard-ai/proofs";
import { AIArbiter } from "kard-ai/arbitration";
import { ReputationEngine } from "kard-ai/reputation";
import { SwarmCoordinator } from "kard-ai/swarm";
```

## Event system

```ts
import { getEventBus } from "kard-ai";

const bus = getEventBus();
bus.on("EscrowLocked", (event) => console.log(event));
bus.on("SettlementExecuted", (event) => console.log(event));
```

## Protocol constants

```ts
import { PROTOCOL_VERSION, SCHEMA_VERSIONS } from "kard-ai";

PROTOCOL_VERSION  // "kard.v1"
SCHEMA_VERSIONS   // all versioned schema identifiers
```
