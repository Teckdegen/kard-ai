import type {
  Agreement,
  AgentProfile,
  Offer,
  ServiceListing,
  ServiceRequest,
} from "../core/types.js";
import { newId, now } from "../core/ids.js";
import { child } from "../core/logger.js";
import type { Archive } from "../memory/archive.js";

const log = child("negotiation");

export interface NegotiationRound {
  round: number;
  actor: "buyer" | "provider";
  message: string;
  proposed_price_wei: string;
  ts: number;
}

export interface NegotiationResult {
  agreement: Agreement;
  rounds: NegotiationRound[];
  negotiation_cid?: string;
}

export interface NegotiationPolicy {
  max_rounds?: number;
  buyer_step_bps?: number;
  provider_step_bps?: number;
}

const DEFAULT_POLICY: Required<NegotiationPolicy> = {
  max_rounds: 6,
  buyer_step_bps: 500,
  provider_step_bps: 500,
};

const applyBps = (wei: bigint, bps: number, dir: 1 | -1): bigint =>
  wei + (wei * BigInt(bps) * BigInt(dir)) / 10000n;

export class NegotiationEngine {
  constructor(private archive?: Archive, private policy: NegotiationPolicy = {}) {}

  async negotiate(args: {
    request: ServiceRequest;
    buyer: AgentProfile;
    provider: AgentProfile;
    listing: ServiceListing;
    arbiter_id: string;
  }): Promise<NegotiationResult> {
    const p = { ...DEFAULT_POLICY, ...this.policy };
    const rounds: NegotiationRound[] = [];

    let buyerBid = BigInt(args.request.max_price_wei);
    let providerAsk = BigInt(args.listing.price_wei);

    buyerBid = (BigInt(args.request.max_price_wei) * 7n) / 10n;

    for (let i = 1; i <= p.max_rounds; i++) {
      rounds.push({
        round: i,
        actor: "buyer",
        message: `bid ${buyerBid.toString()} wei`,
        proposed_price_wei: buyerBid.toString(),
        ts: now(),
      });

      if (buyerBid >= providerAsk) break;
      providerAsk = applyBps(providerAsk, p.provider_step_bps, -1);
      rounds.push({
        round: i,
        actor: "provider",
        message: `counter ${providerAsk.toString()} wei`,
        proposed_price_wei: providerAsk.toString(),
        ts: now(),
      });
      if (buyerBid >= providerAsk) break;
      buyerBid = applyBps(buyerBid, p.buyer_step_bps, 1);
      if (buyerBid > BigInt(args.request.max_price_wei)) buyerBid = BigInt(args.request.max_price_wei);
    }

    const agreedPrice = buyerBid >= providerAsk ? providerAsk : buyerBid;
    if (agreedPrice > BigInt(args.request.max_price_wei)) {
      throw new Error("negotiation exceeded buyer budget");
    }

    const agreement: Agreement = {
      agreement_id: newId("agmt"),
      request_id: args.request.request_id,
      buyer_id: args.buyer.agent_id,
      provider_id: args.provider.agent_id,
      capability: args.request.capability,
      agreed_price_wei: agreedPrice.toString(),
      duration_seconds: args.request.duration_seconds,
      verification_method: args.request.verification,
      arbiter: args.arbiter_id,
      obligations: [
        { kind: "latency", threshold: args.listing.sla.max_latency_ms, weight: 0.4 },
        { kind: "uptime", threshold: args.listing.sla.uptime_pct, weight: 0.4 },
        { kind: "deliverable", threshold: "output_hash_required", weight: 0.2 },
      ],
      created_at: now(),
      settled: false,
    };

    let negotiation_cid: string | undefined;
    if (this.archive) {
      negotiation_cid = await this.archive.putNegotiationLog(
        { rounds, agreement_id: agreement.agreement_id },
        [args.buyer.agent_id, args.provider.agent_id, args.request.request_id]
      );
    }

    log.info(
      {
        rounds: rounds.length,
        agreed_price_wei: agreement.agreed_price_wei,
        agreement_id: agreement.agreement_id,
      },
      "negotiation complete"
    );

    return { agreement, rounds, negotiation_cid };
  }

  buildOffer(args: { listing: ServiceListing; provider: AgentProfile; request: ServiceRequest }): Offer {
    return {
      offer_id: newId("offer"),
      request_id: args.request.request_id,
      provider_id: args.provider.agent_id,
      price_wei: args.listing.price_wei,
      sla_uptime_pct: args.listing.sla.uptime_pct,
      estimated_latency_ms: args.listing.sla.max_latency_ms,
      expires_at: now() + 300,
    };
  }
}
