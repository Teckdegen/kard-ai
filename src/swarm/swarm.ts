import type { Agreement, AgentProfile, Capability } from "../core/types.js";
import { newId, now } from "../core/ids.js";

export interface SwarmMember {
  agent: AgentProfile;
  role: string;
  contribution_weight: number;
}

export interface Swarm {
  swarm_id: string;
  name: string;
  members: SwarmMember[];
  created_at: number;
}

export interface SwarmRevenueSplit {
  agent_id: string;
  share_wei: string;
  share_bps: number;
}

export class SwarmCoordinator {
  private swarms = new Map<string, Swarm>();

  create(name: string, members: SwarmMember[]): Swarm {
    const total = members.reduce((s, m) => s + m.contribution_weight, 0);
    if (total <= 0) throw new Error("invalid swarm weights");
    const swarm: Swarm = { swarm_id: newId("swarm"), name, members, created_at: now() };
    this.swarms.set(swarm.swarm_id, swarm);
    return swarm;
  }

  get(id: string): Swarm | undefined {
    return this.swarms.get(id);
  }

  withCapability(swarmId: string, cap: Capability): SwarmMember | undefined {
    return this.swarms.get(swarmId)?.members.find((m) => m.agent.capabilities.includes(cap));
  }

  split(swarmId: string, agreement: Agreement, paidWei: bigint): SwarmRevenueSplit[] {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) throw new Error(`unknown swarm: ${swarmId}`);
    const total = swarm.members.reduce((s, m) => s + m.contribution_weight, 0);
    const splits: SwarmRevenueSplit[] = swarm.members.map((m) => {
      const bps = Math.floor((m.contribution_weight / total) * 10000);
      return {
        agent_id: m.agent.agent_id,
        share_bps: bps,
        share_wei: ((paidWei * BigInt(bps)) / 10000n).toString(),
      };
    });
    void agreement;
    return splits;
  }
}
