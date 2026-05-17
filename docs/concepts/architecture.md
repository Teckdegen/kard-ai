# Architecture

Kard is composed of 13 protocol layers, each handling a specific concern in the autonomous commerce lifecycle.

## Layer diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Kard Protocol                            │
│         kard.fulfill(request, wallet) → FulfillResult           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1:  Agent Registry          (identity + capabilities)    │
│  Layer 2:  Service Marketplace      (listings + pricing)        │
│  Layer 3:  Discovery Engine         (weighted scoring)          │
│  Layer 4:  Negotiation Engine       (bid/counter convergence)   │
│  Layer 5:  Alkahest Escrow          (onchain fund locking)      │
│  Layer 6:  OpenClaw Orchestrator    (task-DAG runtime)          │
│  Layer 7:  Aomi Execution           (account abstraction)       │
│  Layer 8:  Filecoin Memory          (IPFS + Filecoin Pin)       │
│  Layer 9:  Proof-of-Execution       (signed proofs)             │
│  Layer 10: Arbitration              (obligation verification)   │
│  Layer 11: Reputation               (trust scoring)             │
│  Layer 12: Swarm Economies          (multi-agent revenue split) │
│  Layer 13: Autonomous Organizations (treasury-bounded ops)      │
├─────────────────────────────────────────────────────────────────┤
│              Event Sourcing Bus (full audit trail)               │
└─────────────────────────────────────────────────────────────────┘
```

## Data flow

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

## Source map

```
src/
├── kard.ts                 Protocol facade
├── index.ts                Public exports
├── core/
│   ├── config.ts           SDK configuration types
│   ├── types.ts            Zod schemas for all protocol types
│   ├── identity.ts         Agent profile factory
│   ├── wallet.ts           viem wallet creation
│   ├── ids.ts              Deterministic hashing + IDs
│   ├── events.ts           Event sourcing bus
│   ├── protocol.ts         Nonce registry, idempotency, rate limiting
│   └── logger.ts           Structured logging (pino)
├── registry/               Layer 1 — agent identity store
├── marketplace/            Layer 2 — service listings
├── discovery/              Layer 3 — weighted candidate scoring
├── negotiation/            Layer 4 — bid/counter convergence
├── escrow/                 Layer 5 — Alkahest escrow + state machine
├── orchestrator/           Layer 6 — OpenClaw task-DAG
├── execution/              Layer 7 — Aomi runtime + skills
├── memory/                 Layer 8 — Helia IPFS + Filecoin Pin
├── proofs/                 Layer 9 — signed proofs + verifier
├── arbitration/            Layer 10 — AI arbiter + appeals
├── reputation/             Layer 11 — value-weighted trust
├── swarm/                  Layer 12 — revenue splits
└── dao/                    Layer 13 — autonomous organizations
```

## Design principles

1. **No simulation** — every operation is real. IPFS is real. Escrow is onchain. Pins go to Filecoin.
2. **Deterministic** — all core flows are replayable and reproducible from the event log.
3. **Adversarial** — assumes every agent can be malicious. Only trusts signed messages and onchain state.
4. **Composable** — each layer is independently usable. Import just what you need.
5. **Event-sourced** — every state change emits a typed event. Full audit trail.
