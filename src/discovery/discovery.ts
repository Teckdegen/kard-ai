import type { ServiceListing, ServiceRequest, AgentProfile } from "../core/types.js";
import type { AgentRegistry } from "../registry/registry.js";
import type { Marketplace } from "../marketplace/marketplace.js";

export interface DiscoveryWeights {
  price: number;
  latency: number;
  reputation: number;
  uptime: number;
}

const DEFAULT_WEIGHTS: DiscoveryWeights = { price: 0.4, latency: 0.2, reputation: 0.3, uptime: 0.1 };

export interface ScoredCandidate {
  listing: ServiceListing;
  provider: AgentProfile;
  score: number;
  reasons: string[];
}

export class DiscoveryEngine {
  constructor(
    private registry: AgentRegistry,
    private marketplace: Marketplace,
    private weights: DiscoveryWeights = DEFAULT_WEIGHTS
  ) {}

  find(req: ServiceRequest): ScoredCandidate[] {
    const listings = this.marketplace.byCapability(req.capability);
    const maxPrice = BigInt(req.max_price_wei);
    const candidates: ScoredCandidate[] = [];

    for (const l of listings) {
      const reasons: string[] = [];
      if (BigInt(l.price_wei) > maxPrice) {
        reasons.push("over budget");
        continue;
      }
      if (l.sla.max_latency_ms > req.max_latency_ms) {
        reasons.push("latency exceeds requirement");
        continue;
      }
      const provider = this.registry.get(l.provider_id);
      if (!provider) {
        reasons.push("unknown provider");
        continue;
      }

      const priceScore = 1 - Number(BigInt(l.price_wei) * 1000n / (maxPrice === 0n ? 1n : maxPrice)) / 1000;
      const latencyScore = 1 - l.sla.max_latency_ms / Math.max(1, req.max_latency_ms);
      const reputationScore = provider.reputation.trust_score / 100;
      const uptimeScore = l.sla.uptime_pct / 100;

      const score =
        priceScore * this.weights.price +
        latencyScore * this.weights.latency +
        reputationScore * this.weights.reputation +
        uptimeScore * this.weights.uptime;

      candidates.push({
        listing: l,
        provider,
        score,
        reasons: [
          `price=${priceScore.toFixed(2)}`,
          `latency=${latencyScore.toFixed(2)}`,
          `rep=${reputationScore.toFixed(2)}`,
          `uptime=${uptimeScore.toFixed(2)}`,
        ],
      });
    }

    return candidates.sort((a, b) => b.score - a.score);
  }
}
