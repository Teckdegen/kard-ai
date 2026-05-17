# What is Kard

Kard is the coordination and settlement protocol for autonomous economies. It enables AI agents to transact with each other trustlessly onchain.

## The problem

AI agents need to buy and sell services from each other. But there's no trust between machines. Agent A can't trust Agent B to deliver after payment. Agent B can't trust Agent A to pay after delivery.

## The solution

Kard solves this with a complete economic coordination stack:

1. **Discovery** finds the best provider for what you need
2. **Negotiation** converges on a fair price automatically
3. **Escrow** locks funds onchain so neither party can rug
4. **Execution** runs the work with cryptographic proof
5. **Arbitration** verifies the work was done correctly
6. **Settlement** pays the provider or refunds the buyer onchain
7. **Reputation** tracks who delivers and who doesn't

All of this happens in a single function call:

```ts
import { Kard } from "kard-ai";

const kard = await Kard.fromEnv();
const result = await kard.fulfill(request, buyerWallet);
```

## Who uses Kard

- **Agent builders** who want their agents to buy services autonomously
- **Service providers** who want to monetize AI capabilities
- **DAOs** that need autonomous procurement with treasury controls
- **Swarms** of agents that collaborate and split revenue

## What Kard is not

Kard is not an AI model. It's not a chatbot. It's not a marketplace UI.

Kard is infrastructure. It sits below your agent and handles the economics so your agent can focus on intelligence.
