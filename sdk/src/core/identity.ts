import type { AgentProfile, Capability } from "./types.js";
import { newId, now } from "./ids.js";
import type { AgentWallet } from "./wallet.js";

export interface AgentIdentityInput {
  agent_id?: string;
  wallet: AgentWallet;
  capabilities: Capability[];
  pricing_model?: AgentProfile["pricing_model"];
  execution_modes?: AgentProfile["execution_modes"];
  supported_chains?: string[];
  metadata?: Record<string, unknown>;
}

export const createAgentProfile = (input: AgentIdentityInput): AgentProfile => ({
  agent_id: input.agent_id ?? newId("agent"),
  wallet: input.wallet.address,
  capabilities: input.capabilities,
  pricing_model: input.pricing_model ?? "dynamic",
  supported_chains: input.supported_chains ?? [String(input.wallet.env.chainId)],
  execution_modes: input.execution_modes ?? ["realtime"],
  reputation: {
    fulfillment_rate: 100,
    average_latency_ms: 0,
    completed_contracts: 0,
    dispute_ratio: 0,
    trust_score: 50,
    total_volume_wei: "0",
  },
  metadata: input.metadata ?? {},
  created_at: now(),
  updated_at: now(),
});
