import type { AgentProfile, Capability } from "../core/types.js";
import { AgentProfileSchema } from "../core/types.js";
import { now } from "../core/ids.js";
import type { Archive } from "../memory/archive.js";
import { child } from "../core/logger.js";

const log = child("registry");

export class AgentRegistry {
  private byId = new Map<string, AgentProfile>();
  private byWallet = new Map<string, string>();

  constructor(private archive?: Archive) {}

  async register(profile: AgentProfile): Promise<AgentProfile> {
    const parsed = AgentProfileSchema.parse(profile);
    parsed.updated_at = now();
    if (this.archive) parsed.memory_cid = await this.archive.putProfile(parsed);
    this.byId.set(parsed.agent_id, parsed);
    this.byWallet.set(parsed.wallet.toLowerCase(), parsed.agent_id);
    log.info({ agent_id: parsed.agent_id, caps: parsed.capabilities }, "registered");
    return parsed;
  }

  get(agentId: string): AgentProfile | undefined {
    return this.byId.get(agentId);
  }

  require(agentId: string): AgentProfile {
    const p = this.byId.get(agentId);
    if (!p) throw new Error(`unknown agent: ${agentId}`);
    return p;
  }

  byWalletAddress(addr: string): AgentProfile | undefined {
    const id = this.byWallet.get(addr.toLowerCase());
    return id ? this.byId.get(id) : undefined;
  }

  findByCapability(cap: Capability): AgentProfile[] {
    return [...this.byId.values()].filter((p) => p.capabilities.includes(cap));
  }

  all(): AgentProfile[] {
    return [...this.byId.values()];
  }

  async updateReputation(agentId: string, patch: Partial<AgentProfile["reputation"]>): Promise<void> {
    const p = this.require(agentId);
    p.reputation = { ...p.reputation, ...patch };
    p.updated_at = now();
    if (this.archive) p.memory_cid = await this.archive.putProfile(p);
  }
}
