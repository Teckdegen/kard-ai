import { z } from "zod";

export const AddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "invalid EVM address");
export type Address = `0x${string}`;

export const CidSchema = z.string().min(46);
export type Cid = string;

export const CapabilitySchema = z.enum([
  "gpu_inference",
  "cpu_compute",
  "market_data",
  "sentiment_analysis",
  "blockchain_indexing",
  "content_generation",
  "trading_execution",
  "governance_analysis",
  "storage",
  "bandwidth",
  "node_hosting",
  "relayer",
  "verification",
  "arbitration",
  "research",
  "api_serving",
]);
export type Capability = z.infer<typeof CapabilitySchema>;

export const ReputationSchema = z.object({
  fulfillment_rate: z.number().min(0).max(100),
  average_latency_ms: z.number().nonnegative(),
  completed_contracts: z.number().int().nonnegative(),
  dispute_ratio: z.number().min(0).max(100),
  trust_score: z.number().min(0).max(100),
  total_volume_wei: z.string().default("0"),
});
export type Reputation = z.infer<typeof ReputationSchema>;

export const AgentProfileSchema = z.object({
  agent_id: z.string(),
  wallet: AddressSchema,
  capabilities: z.array(CapabilitySchema),
  pricing_model: z.enum(["fixed", "dynamic", "auction"]),
  supported_chains: z.array(z.string()),
  execution_modes: z.array(z.enum(["realtime", "batch", "streaming"])),
  reputation: ReputationSchema,
  memory_cid: CidSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.number().int(),
  updated_at: z.number().int(),
});
export type AgentProfile = z.infer<typeof AgentProfileSchema>;

export const ServiceListingSchema = z.object({
  listing_id: z.string(),
  provider_id: z.string(),
  capability: CapabilitySchema,
  price_wei: z.string(),
  pricing_unit: z.enum(["per_call", "per_second", "per_hour", "per_token"]),
  sla: z.object({
    uptime_pct: z.number().min(0).max(100),
    max_latency_ms: z.number().nonnegative(),
  }),
  regions: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});
export type ServiceListing = z.infer<typeof ServiceListingSchema>;

export const ServiceRequestSchema = z.object({
  request_id: z.string(),
  buyer_id: z.string(),
  capability: CapabilitySchema,
  max_price_wei: z.string(),
  max_latency_ms: z.number().nonnegative(),
  duration_seconds: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()).default({}),
  verification: z.enum(["execution_proof", "oracle", "trivial"]).default("execution_proof"),
});
export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;

export const OfferSchema = z.object({
  offer_id: z.string(),
  request_id: z.string(),
  provider_id: z.string(),
  price_wei: z.string(),
  sla_uptime_pct: z.number().min(0).max(100),
  estimated_latency_ms: z.number().nonnegative(),
  expires_at: z.number().int(),
});
export type Offer = z.infer<typeof OfferSchema>;

export const AgreementSchema = z.object({
  agreement_id: z.string(),
  request_id: z.string(),
  buyer_id: z.string(),
  provider_id: z.string(),
  capability: CapabilitySchema,
  agreed_price_wei: z.string(),
  duration_seconds: z.number().int().positive(),
  verification_method: z.enum(["execution_proof", "oracle", "trivial"]),
  arbiter: z.string(),
  obligations: z.array(
    z.object({
      kind: z.enum(["uptime", "latency", "deliverable", "deadline"]),
      threshold: z.union([z.number(), z.string()]),
      weight: z.number().min(0).max(1).default(1),
    })
  ),
  escrow_address: AddressSchema.optional(),
  escrow_uid: z.string().optional(),
  cid: CidSchema.optional(),
  created_at: z.number().int(),
  settled: z.boolean().default(false),
});
export type Agreement = z.infer<typeof AgreementSchema>;

export const ExecutionProofSchema = z.object({
  proof_id: z.string(),
  agreement_id: z.string(),
  provider_id: z.string(),
  started_at: z.number().int(),
  completed_at: z.number().int(),
  measured_latency_ms: z.number().nonnegative(),
  measured_uptime_pct: z.number().min(0).max(100),
  output_hash: z.string(),
  output_cid: CidSchema.optional(),
  logs_cid: CidSchema.optional(),
  signature: z.string(),
});
export type ExecutionProof = z.infer<typeof ExecutionProofSchema>;

export const ArbitrationVerdictSchema = z.object({
  verdict_id: z.string(),
  agreement_id: z.string(),
  proof_id: z.string(),
  arbiter_id: z.string(),
  approved: z.boolean(),
  reason: z.string(),
  penalty_bps: z.number().int().min(0).max(10000).default(0),
  decided_at: z.number().int(),
});
export type ArbitrationVerdict = z.infer<typeof ArbitrationVerdictSchema>;

export const SettlementReceiptSchema = z.object({
  receipt_id: z.string(),
  agreement_id: z.string(),
  paid_to_provider_wei: z.string(),
  refunded_to_buyer_wei: z.string(),
  protocol_fee_wei: z.string(),
  tx_hash: z.string().optional(),
  settled_at: z.number().int(),
});
export type SettlementReceipt = z.infer<typeof SettlementReceiptSchema>;
