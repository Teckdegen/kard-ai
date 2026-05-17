/**
 * End-to-end tests — Full protocol flow validation.
 * Uses TestMemoryStore for unit testing without live infrastructure.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "viem";
import { generatePrivateKey } from "viem/accounts";
import {
  Kard,
  createAgentProfile,
  createAgentWallet,
  newId,
  resetEventBus,
  AgentRegistry,
  Marketplace,
  DiscoveryEngine,
  NegotiationEngine,
  AlkahestEscrow,
  OpenClaw,
  ProofBuilder,
  ProofVerifier,
  AIArbiter,
  ReputationEngine,
  Archive,
  type ServiceRequest,
} from "../src/index.js";
import { TestMemoryStore } from "./helpers.js";

// Reset event bus before tests
resetEventBus();

/** Create a fully wired Kard instance using test memory (no live IPFS needed) */
const makeTestKard = async () => {
  const events = resetEventBus();
  const memory = new TestMemoryStore();
  const archive = new Archive(memory);
  const registry = new AgentRegistry(archive);
  const marketplace = new Marketplace();
  const discovery = new DiscoveryEngine(registry, marketplace);
  const negotiation = new NegotiationEngine(archive);
  const escrow = new AlkahestEscrow({ escrowAddress: "0x1234567890123456789012345678901234567890" });
  const orchestrator = new OpenClaw();
  const proofs = new ProofBuilder(memory);
  const verifier = new ProofVerifier(registry);
  const arbiter = new AIArbiter(verifier);
  const reputation = new ReputationEngine(registry);

  // Wire up a Kard-like object for testing
  const kard = await Kard.create({
    escrow: { escrowAddress: undefined as any }, // will use local fallback for test
  }).catch(() => null);

  // Since we can't create real Kard without IPFS, build manually
  const testKard = {
    registry,
    marketplace,
    discovery,
    negotiation,
    escrow: new AlkahestEscrow(), // local for tests
    orchestrator,
    proofs,
    verifier,
    arbiter,
    reputation,
    memory,
    archive,
    events,
    providers: new Map(),
    registerProvider(impl: any) { this.providers.set(impl.agent_id, impl); },
    async shutdown() { await memory.stop(); },
  };
  return testKard;
};

const setup = async () => {
  const kard = await makeTestKard();
  const buyerWallet = createAgentWallet(generatePrivateKey());
  const sellerWallet = createAgentWallet(generatePrivateKey());

  const buyer = await kard.registry.register(
    createAgentProfile({ wallet: buyerWallet, capabilities: ["trading_execution"] })
  );
  const seller = await kard.registry.register(
    createAgentProfile({ wallet: sellerWallet, capabilities: ["gpu_inference"] })
  );

  kard.marketplace.list({
    provider_id: seller.agent_id,
    capability: "gpu_inference",
    price_wei: parseEther("0.001").toString(),
    pricing_unit: "per_hour",
    sla: { uptime_pct: 99.5, max_latency_ms: 200 },
  });

  kard.registerProvider({
    agent_id: seller.agent_id,
    wallet: sellerWallet,
    execute: async () => ({
      output: { ok: true },
      measured_latency_ms: 150,
      measured_uptime_pct: 99.7,
    }),
  });

  return { kard, buyer, seller, buyerWallet, sellerWallet };
};

test("end-to-end: negotiation produces valid agreement", async () => {
  const { kard, buyer, seller, buyerWallet, sellerWallet } = await setup();
  const listing = kard.marketplace.byCapability("gpu_inference")[0];

  const result = await kard.negotiation.negotiate({
    request: {
      request_id: newId("req"),
      buyer_id: buyer.agent_id,
      capability: "gpu_inference",
      max_price_wei: parseEther("0.002").toString(),
      max_latency_ms: 300,
      duration_seconds: 600,
      payload: {},
      verification: "execution_proof",
    },
    buyer,
    provider: seller,
    listing,
    arbiter_id: kard.arbiter.identity.arbiter_id,
  });

  assert.ok(result.agreement.agreement_id);
  assert.ok(BigInt(result.agreement.agreed_price_wei) > 0n);
  assert.ok(BigInt(result.agreement.agreed_price_wei) <= parseEther("0.002"));
  assert.equal(result.agreement.settled, false);
  await kard.shutdown();
});

test("end-to-end: escrow lock + settle produces correct amounts", async () => {
  const { kard, buyer, seller, buyerWallet } = await setup();
  const listing = kard.marketplace.byCapability("gpu_inference")[0];

  const { agreement } = await kard.negotiation.negotiate({
    request: {
      request_id: newId("req"),
      buyer_id: buyer.agent_id,
      capability: "gpu_inference",
      max_price_wei: parseEther("0.002").toString(),
      max_latency_ms: 300,
      duration_seconds: 600,
      payload: {},
      verification: "execution_proof",
    },
    buyer,
    provider: seller,
    listing,
    arbiter_id: "ai",
  });

  const receipt = await kard.escrow.lock({
    buyer: buyerWallet,
    arbiter: "0x0000000000000000000000000000000000000001",
    agreement,
  });

  assert.ok(receipt.uid.startsWith("0x"));
  assert.equal(receipt.state, "locked");
  assert.equal(receipt.amount, BigInt(agreement.agreed_price_wei));

  const result = await kard.escrow.settle({
    buyer: buyerWallet,
    uid: receipt.uid,
    approved: true,
    penaltyBps: 0,
  });

  assert.ok(result.paid_provider > 0n);
  assert.equal(result.state, "settled");
  await kard.shutdown();
});

test("end-to-end: proof signing and verification", async () => {
  const { kard, buyer, seller, buyerWallet, sellerWallet } = await setup();
  const listing = kard.marketplace.byCapability("gpu_inference")[0];

  const { agreement } = await kard.negotiation.negotiate({
    request: {
      request_id: newId("req"),
      buyer_id: buyer.agent_id,
      capability: "gpu_inference",
      max_price_wei: parseEther("0.002").toString(),
      max_latency_ms: 300,
      duration_seconds: 600,
      payload: {},
      verification: "execution_proof",
    },
    buyer,
    provider: seller,
    listing,
    arbiter_id: "ai",
  });

  const proof = await kard.proofs.build({
    agreement,
    provider: sellerWallet,
    result: { output: { ok: true }, measured_latency_ms: 150, measured_uptime_pct: 99.7 },
    started_at: Math.floor(Date.now() / 1000) - 1,
  });

  assert.ok(proof.signature.startsWith("0x"));
  assert.ok(proof.output_hash.startsWith("0x"));

  const report = await kard.verifier.verify(agreement, proof);
  assert.equal(report.signature_valid, true);
  assert.equal(report.fully_met, true);
  assert.equal(report.confidence, 100);
  await kard.shutdown();
});

test("end-to-end: provider violating latency gets penalty", async () => {
  const { kard, buyer, seller, sellerWallet } = await setup();
  const listing = kard.marketplace.byCapability("gpu_inference")[0];

  const { agreement } = await kard.negotiation.negotiate({
    request: {
      request_id: newId("req"),
      buyer_id: buyer.agent_id,
      capability: "gpu_inference",
      max_price_wei: parseEther("0.002").toString(),
      max_latency_ms: 300,
      duration_seconds: 600,
      payload: {},
      verification: "execution_proof",
    },
    buyer,
    provider: seller,
    listing,
    arbiter_id: "ai",
  });

  const proof = await kard.proofs.build({
    agreement,
    provider: sellerWallet,
    result: { output: { ok: true }, measured_latency_ms: 5000, measured_uptime_pct: 50 },
    started_at: Math.floor(Date.now() / 1000) - 1,
  });

  const verdict = await kard.arbiter.decide(agreement, proof);
  assert.ok(verdict.penalty_bps > 0, "should have penalty for violations");
  await kard.shutdown();
});

test("end-to-end: discovery rejects over-budget candidates", async () => {
  const { kard, buyer } = await setup();
  const result = kard.discovery.find({
    request_id: "x",
    buyer_id: buyer.agent_id,
    capability: "gpu_inference",
    max_price_wei: parseEther("0.0001").toString(),
    max_latency_ms: 50,
    duration_seconds: 60,
    payload: {},
    verification: "execution_proof",
  });
  assert.equal(result.length, 0);
  await kard.shutdown();
});

test("end-to-end: reputation updates after arbitration", async () => {
  const { kard, buyer, seller, sellerWallet } = await setup();
  const listing = kard.marketplace.byCapability("gpu_inference")[0];

  const before = kard.registry.require(seller.agent_id).reputation.completed_contracts;

  const { agreement } = await kard.negotiation.negotiate({
    request: {
      request_id: newId("req"),
      buyer_id: buyer.agent_id,
      capability: "gpu_inference",
      max_price_wei: parseEther("0.002").toString(),
      max_latency_ms: 300,
      duration_seconds: 600,
      payload: {},
      verification: "execution_proof",
    },
    buyer,
    provider: seller,
    listing,
    arbiter_id: "ai",
  });

  const proof = await kard.proofs.build({
    agreement,
    provider: sellerWallet,
    result: { output: { ok: true }, measured_latency_ms: 150, measured_uptime_pct: 99.7 },
    started_at: Math.floor(Date.now() / 1000) - 1,
  });

  const verdict = await kard.arbiter.decide(agreement, proof);
  await kard.reputation.record({ agreement, proof, verdict });

  const after = kard.registry.require(seller.agent_id).reputation.completed_contracts;
  assert.equal(after, before + 1);
  await kard.shutdown();
});
