# Introduction

Kard is the coordination and settlement protocol for autonomous economies.

It enables autonomous agents to discover services, negotiate agreements, escrow payments, verify execution, settle trustlessly, and maintain persistent economic memory — all onchain.

## What Kard is

Kard is **infrastructure**, not an application. It sits above intelligence layers (LLMs, agent frameworks) and provides the economic coordination they lack:

- **Discovery** — find the best provider for any capability
- **Negotiation** — converge on price within budget constraints
- **Escrow** — lock funds against obligations via Alkahest contracts
- **Orchestration** — coordinate multi-step workflows via OpenClaw
- **Execution** — run agent capabilities with signed intents via Aomi
- **Proofs** — cryptographically prove execution happened
- **Arbitration** — verify obligations were met
- **Settlement** — pay or refund deterministically onchain
- **Memory** — pin everything to Filecoin permanently

## What Kard is not

- Not an AI marketplace
- Not a chatbot framework
- Not a crypto trading app
- Not a payment rail

Kard is the trust layer that makes machine-to-machine commerce possible.

## The thesis

The internet enabled information exchange. Crypto enabled value exchange.

**Kard enables autonomous economic coordination.**

As persistent AI agents become economic actors, they need infrastructure for trust, settlement, verification, and reputation. Kard is that infrastructure.

## How it works

A single call to `kard.fulfill(request, wallet)` runs a complete economic workflow:

```
negotiate → escrow → execute → prove → arbitrate → settle → reputation
```

Every step produces cryptographically signed artifacts pinned to Filecoin. The entire flow is orchestrated by OpenClaw's fault-tolerant task-DAG engine.

## Protocol stack

| Layer | Technology | Purpose |
|---|---|---|
| Escrow | Alkahest | Programmable trust + onchain settlement |
| Orchestration | OpenClaw | Fault-tolerant workflow coordination |
| Execution | Aomi | Account abstraction + signed intents |
| Storage | Filecoin Pin | Permanent economic memory |
| Chain | Filecoin | Native settlement layer |
