/**
 * Adversarial Test Suite — Tests for protocol security under attack conditions.
 *
 * Covers:
 *   - Fake proof submission
 *   - Escrow replay attacks
 *   - Duplicate settlement attempts
 *   - Sybil agent creation
 *   - Invalid workflow execution order
 *   - Arbiter disagreement / appeal
 *   - Negotiation exploitation
 *   - Replay attack on requests
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "viem";
import { generatePrivateKey } from "viem/accounts";
import {
  createAgentProfile,
  createAgentWallet,
  newId,
  resetEventBus,
  OpenClaw,
  AlkahestEscrow,
  AomiRuntime,
  ReputationEngine,
  AgentRegistry,
  Marketplace,
  DiscoveryEngine,
  NegotiationEngine,
  ProofBuilder,
  ProofVerifier,
  AIArbiter,
  Archive,
  NonceRegistry,
  type ServiceRequest,
} from "../src/index.js";
import { TestMemoryStore } from "./helpers.js";

// Reset event bus
resetEventBus();

// ─── Helpers ────────────────────────────────────────────────────────────────

const setupBasic = async () => {
  const events = resetEventBus();
  const memory = new TestMemoryStore();
  const archive = new Archive(memory);
  const registry = new AgentRegistry(archive);
  const marketplace = new Marketplace();
  const discovery = new DiscoveryEngine(registry, marketplace);
  const negotiation = new NegotiationEngine(archive);
  const escrow = new AlkahestEscrow();
  const orchestrator = new OpenClaw();
  const proofs = new ProofBuilder(memory);
  const verifier = new ProofVerifier(registry);
  const arbiter = new AIArbiter(verifier);
  const reputation = new ReputationEngine(registry);

  const buyerWallet = createAgentWallet(generatePrivateKey());
  const sellerWallet = createAgentWallet(generatePrivateKey());

  const buyer = await registry.register(
    createAgentProfile({ wallet: buyerWallet, capabilities: ["trading_execution"] })
  );
  const seller = await registry.register(
    createAgentProfile({ wallet: sellerWallet, capabilities: ["gpu_inference"] })
  );

  marketplace.list({
    provider_id: seller.agent_id,
    capability: "gpu_inference",
    price_wei: parseEther("0.001").toString(),
    pricing_unit: "per_hour",
    sla: { uptime_pct: 99.5, max_latency_ms: 200 },
  });

  return {
    kard: { registry, marketplace, discovery, negotiation, escrow, orchestrator, proofs, verifier, arbiter, reputation, memory, archive, events, async shutdown() { await memory.stop(); } },
    buyer, seller, buyerWallet, sellerWallet,
  };
};

// ─── Test: Replay Attack on Requests ────────────────────────────────────────

test("ADVERSARIAL: replay attack — NonceRegistry blocks duplicate nonces", () => {
  const nonces = new NonceRegistry();
  const requestId = newId("req");
  assert.equal(nonces.check(requestId), true);  // first time OK
  assert.equal(nonces.check(requestId), false); // replay blocked
});

// ─── Test: Escrow State Machine ─────────────────────────────────────────────

test("ADVERSARIAL: escrow double-settlement is blocked", async () => {
  const escrow = new AlkahestEscrow();
  const wallet = createAgentWallet(generatePrivateKey());

  const receipt = await escrow.lock({
    buyer: wallet,
    arbiter: "0x0000000000000000000000000000000000000001",
    agreement: {
      agreement_id: "test_agmt",
      request_id: "req_1",
      buyer_id: "buyer_1",
      provider_id: "provider_1",
      capability: "gpu_inference",
      agreed_price_wei: parseEther("0.01").toString(),
      duration_seconds: 600,
      verification_method: "execution_proof",
      arbiter: "ai",
      obligations: [{ kind: "latency", threshold: 200, weight: 1 }],
      created_at: Math.floor(Date.now() / 1000),
      settled: false,
    },
  });

  // First settlement succeeds
  await escrow.settle({
    buyer: wallet,
    uid: receipt.uid,
    approved: true,
    penaltyBps: 0,
  });

  // Second settlement should fail (invalid state transition)
  await assert.rejects(
    () => escrow.settle({ buyer: wallet, uid: receipt.uid, approved: true, penaltyBps: 0 }),
    /invalid escrow state transition/
  );
});

test("ADVERSARIAL: escrow with zero amount is rejected", async () => {
  const escrow = new AlkahestEscrow();
  const wallet = createAgentWallet(generatePrivateKey());

  await assert.rejects(
    () => escrow.lock({
      buyer: wallet,
      arbiter: "0x0000000000000000000000000000000000000001",
      agreement: {
        agreement_id: "test_agmt",
        request_id: "req_1",
        buyer_id: "buyer_1",
        provider_id: "provider_1",
        capability: "gpu_inference",
        agreed_price_wei: "0",
        duration_seconds: 600,
        verification_method: "execution_proof",
        arbiter: "ai",
        obligations: [],
        created_at: Math.floor(Date.now() / 1000),
        settled: false,
      },
    }),
    /escrow amount must be positive/
  );
});

test("ADVERSARIAL: invalid penalty bps is rejected", async () => {
  const escrow = new AlkahestEscrow();
  const wallet = createAgentWallet(generatePrivateKey());

  const receipt = await escrow.lock({
    buyer: wallet,
    arbiter: "0x0000000000000000000000000000000000000001",
    agreement: {
      agreement_id: "test_agmt_2",
      request_id: "req_2",
      buyer_id: "buyer_1",
      provider_id: "provider_1",
      capability: "gpu_inference",
      agreed_price_wei: parseEther("0.01").toString(),
      duration_seconds: 600,
      verification_method: "execution_proof",
      arbiter: "ai",
      obligations: [],
      created_at: Math.floor(Date.now() / 1000),
      settled: false,
    },
  });

  await assert.rejects(
    () => escrow.settle({ buyer: wallet, uid: receipt.uid, approved: true, penaltyBps: 15000 }),
    /invalid penalty bps/
  );
});

// ─── Test: OpenClaw DAG Integrity ───────────────────────────────────────────

test("ADVERSARIAL: OpenClaw rejects cyclic DAG", async () => {
  const claw = new OpenClaw();
  await assert.rejects(
    () => claw.run([
      { id: "a", name: "a", deps: ["b"], run: async () => 1 },
      { id: "b", name: "b", deps: ["a"], run: async () => 2 },
    ]),
    /cycle/
  );
});

test("ADVERSARIAL: OpenClaw rejects duplicate task IDs", async () => {
  const claw = new OpenClaw();
  await assert.rejects(
    () => claw.run([
      { id: "a", name: "a", run: async () => 1 },
      { id: "a", name: "a2", run: async () => 2 },
    ]),
    /duplicate task IDs/
  );
});

test("ADVERSARIAL: OpenClaw rejects unknown dependency", async () => {
  const claw = new OpenClaw();
  await assert.rejects(
    () => claw.run([
      { id: "a", name: "a", deps: ["nonexistent"], run: async () => 1 },
    ]),
    /unknown task/
  );
});

test("ADVERSARIAL: OpenClaw task timeout prevents infinite execution", async () => {
  const claw = new OpenClaw();
  const result = await claw.run([
    {
      id: "slow",
      name: "slow",
      timeout_ms: 100,
      run: async () => {
        await new Promise((r) => setTimeout(r, 5000));
        return "should not reach";
      },
    },
  ]);
  assert.equal(result.status, "failed");
  const task = result.tasks.find((t) => t.id === "slow")!;
  assert.equal(task.status, "failed");
  assert.ok(task.error?.includes("timed out"));
});

// ─── Test: Nonce / Replay Protection ────────────────────────────────────────

test("ADVERSARIAL: NonceRegistry blocks replay", () => {
  const nonces = new NonceRegistry();
  assert.equal(nonces.check("nonce_1"), true);
  assert.equal(nonces.check("nonce_1"), false); // replay blocked
  assert.equal(nonces.check("nonce_2"), true);
});

// ─── Test: Aomi Kill Switch ─────────────────────────────────────────────────

test("ADVERSARIAL: revoked Aomi runtime blocks all execution", async () => {
  const wallet = createAgentWallet(generatePrivateKey());
  const aomi = new AomiRuntime(wallet);
  aomi.registerSkill<{ x: number }, { y: number }>({
    name: "double",
    description: "multiply by 2",
    run: async (i) => ({ y: i.x * 2 }),
  });

  // Works before revocation
  const inv1 = await aomi.runSkill<{ x: number }, { y: number }>("double", { x: 5 });
  assert.equal(inv1.status, "completed");

  // Revoke
  aomi.revoke("compromised key");
  assert.equal(aomi.isRevoked(), true);

  // Blocked after revocation
  await assert.rejects(
    () => aomi.runSkill("double", { x: 10 }),
    /revoked/
  );
});

// ─── Test: Fake Proof Submission ────────────────────────────────────────────

test("ADVERSARIAL: forged proof with wrong signature is detected", async () => {
  const { kard, buyer, seller, buyerWallet, sellerWallet } = await setupBasic();
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

  // Build a proof signed by the WRONG key (attacker)
  const attackerWallet = createAgentWallet(generatePrivateKey());
  const proof = await kard.proofs.build({
    agreement,
    provider: attackerWallet, // WRONG signer
    result: { output: { ok: true }, measured_latency_ms: 150, measured_uptime_pct: 99.7 },
    started_at: Math.floor(Date.now() / 1000) - 1,
  });

  const report = await kard.verifier.verify(agreement, proof);
  assert.equal(report.signature_valid, false, "forged signature should be detected");
  assert.equal(report.fully_met, false);

  await kard.shutdown();
});

// ─── Test: Unregistered Buyer Rejected ──────────────────────────────────────

test("ADVERSARIAL: unregistered agent cannot be found in registry", async () => {
  const { kard } = await setupBasic();
  const result = kard.registry.get("fake_agent_id");
  assert.equal(result, undefined);
  await kard.shutdown();
});

// ─── Test: Sybil Detection ──────────────────────────────────────────────────

test("ADVERSARIAL: Sybil detection flags suspicious patterns", async () => {
  const { kard } = await setupBasic();

  // Create agent with suspiciously high trust but few contracts
  const wallet = createAgentWallet(generatePrivateKey());
  const agent = await kard.registry.register(
    createAgentProfile({ wallet, capabilities: ["gpu_inference"] })
  );

  // Manually set suspicious reputation
  await kard.registry.updateReputation(agent.agent_id, {
    trust_score: 95,
    completed_contracts: 1,
  });

  const indicator = kard.reputation.detectSybil(agent.agent_id);
  assert.ok(indicator.risk_score > 0, "should flag suspicious pattern");
  assert.ok(indicator.reasons.length > 0);

  await kard.shutdown();
});

// ─── Test: Event Sourcing ───────────────────────────────────────────────────

test("ADVERSARIAL: event bus captures protocol events", async () => {
  const { kard, buyer, seller, sellerWallet } = await setupBasic();
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

  await kard.arbiter.decide(agreement, proof);
  await kard.reputation.record({ agreement, proof, verdict: await kard.arbiter.decide(agreement, proof) });

  const events = kard.events.export();
  assert.ok(events.length > 0, "events should be captured");
  const types = events.map((e) => e.type);
  assert.ok(types.includes("ProofSubmitted"), "ProofSubmitted event");
  assert.ok(types.includes("ArbitrationIssued"), "ArbitrationIssued event");
  assert.ok(types.includes("ReputationUpdated"), "ReputationUpdated event");

  await kard.shutdown();
});

// ─── Test: Escrow Dispute Window ────────────────────────────────────────────

test("ADVERSARIAL: dispute can be filed on locked escrow", async () => {
  const escrow = new AlkahestEscrow({ disputeWindowSeconds: 9999 });
  const wallet = createAgentWallet(generatePrivateKey());

  const receipt = await escrow.lock({
    buyer: wallet,
    arbiter: "0x0000000000000000000000000000000000000001",
    agreement: {
      agreement_id: "dispute_test",
      request_id: "req_d",
      buyer_id: "buyer_1",
      provider_id: "provider_1",
      capability: "gpu_inference",
      agreed_price_wei: parseEther("0.01").toString(),
      duration_seconds: 600,
      verification_method: "execution_proof",
      arbiter: "ai",
      obligations: [],
      created_at: Math.floor(Date.now() / 1000),
      settled: false,
    },
  });

  // File dispute
  await escrow.dispute(receipt.uid, "provider did not deliver");
  const record = escrow.getRecord(receipt.uid);
  assert.equal(record?.state, "disputed");

  // Can still settle after dispute
  const result = await escrow.settle({
    buyer: wallet,
    uid: receipt.uid,
    approved: false,
    penaltyBps: 0,
  });
  assert.equal(result.state, "refunded");
});
