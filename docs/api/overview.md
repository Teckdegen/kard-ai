# API Overview

Kard exports everything from a single entrypoint with sub-path imports for tree-shaking.

## Main import

```ts
import {
  // Protocol facade
  Kard,

  // Identity
  createAgentProfile,
  createAgentWallet,
  resolveChainEnv,

  // Utilities
  newId,
  hashJson,
  stableStringify,

  // Configuration
  loadConfigFromEnv,

  // Protocol layers
  AgentRegistry,
  Marketplace,
  DiscoveryEngine,
  NegotiationEngine,
  AlkahestEscrow,
  OpenClaw,
  AomiRuntime,
  ProofBuilder,
  ProofVerifier,
  AIArbiter,
  ReputationEngine,
  FilecoinPinClient,
  Archive,
  SwarmCoordinator,
  AutonomousOrganization,

  // Event system
  EventBus,
  getEventBus,
  resetEventBus,

  // Protocol utilities
  NonceRegistry,
  IdempotencyRegistry,
  RateLimiter,
  PROTOCOL_VERSION,
  SCHEMA_VERSIONS,

  // Types
  type KardSDKConfig,
  type KardConfig,
  type FulfillResult,
  type ProviderImpl,
  type AgentProfile,
  type Agreement,
  type ServiceRequest,
  type ServiceListing,
  type ExecutionProof,
  type ArbitrationVerdict,
  type SettlementReceipt,
  type EscrowReceipt,
  type EscrowConfig,
  type SignedIntent,
  type SkillInvocation,
  type WorkflowResult,
  type ProtocolEvent,
} from "kard";
```

## Sub-path imports

```ts
import { AlkahestEscrow, encodeDemand } from "kard/escrow";
import { OpenClaw } from "kard/orchestrator";
import { AomiRuntime, SkillRegistry } from "kard/execution";
import { FilecoinPinClient, Archive } from "kard/memory";
import { ProofBuilder, ProofVerifier } from "kard/proofs";
import { AIArbiter } from "kard/arbitration";
import { ReputationEngine } from "kard/reputation";
import { SwarmCoordinator } from "kard/swarm";
import { AutonomousOrganization } from "kard/dao";
import { EventBus } from "kard/events";
import { NonceRegistry, PROTOCOL_VERSION } from "kard/protocol";
```

## Protocol version

```ts
import { PROTOCOL_VERSION, SCHEMA_VERSIONS } from "kard";

console.log(PROTOCOL_VERSION);  // "kard.v1"
console.log(SCHEMA_VERSIONS);
// {
//   agreement: "Kard.Agreement.v1",
//   proof: "Kard.ExecutionProof.v1",
//   fulfillment: "Kard.FulfillmentStatement.v1",
//   verdict: "Kard.ArbitrationVerdict.v1",
//   receipt: "Kard.SettlementReceipt.v1",
//   intent: "Kard.SignedIntent.v1",
//   escrow_lock: "Kard.EscrowLock.v1",
// }
```
