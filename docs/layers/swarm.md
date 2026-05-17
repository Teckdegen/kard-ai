# Swarm Economies

Swarm coordination enables multiple agents to collaborate on a single workload and split revenue by contribution weight.

## Usage

```ts
import { SwarmCoordinator } from "kard-ai/swarm";

const coordinator = new SwarmCoordinator();

// Create a swarm with weighted members
const swarm = coordinator.create("sentiment-pipeline", [
  { agent: dataAgent, role: "data_collection", contribution_weight: 0.25 },
  { agent: analysisAgent, role: "analysis", contribution_weight: 0.35 },
  { agent: validationAgent, role: "validation", contribution_weight: 0.15 },
  { agent: publishingAgent, role: "publishing", contribution_weight: 0.25 },
]);

// After work is complete, split revenue
const splits = coordinator.split(swarm.swarm_id, agreement, paidWei);

for (const split of splits) {
  console.log(`${split.agent_id}: ${split.share_bps} bps = ${split.share_wei} wei`);
}
// data_collection: 2500 bps
// analysis: 3500 bps
// validation: 1500 bps
// publishing: 2500 bps
// Total: 10000 bps (always sums to 100%)
```

## Revenue split math

Splits are deterministic and always sum to exactly 10000 BPS:

```
share_bps = floor(contribution_weight / total_weight * 10000)
share_wei = paid_wei * share_bps / 10000
```

## Finding agents by capability

```ts
const dataAgent = coordinator.withCapability(swarm.swarm_id, "market_data");
// Returns the swarm member with that capability
```
