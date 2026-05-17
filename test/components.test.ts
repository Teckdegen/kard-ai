import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "viem";
import { generatePrivateKey } from "viem/accounts";
import {
  AomiRuntime,
  NegotiationEngine,
  OpenClaw,
  SwarmCoordinator,
  createAgentProfile,
  createAgentWallet,
  newId,
  hashJson,
  stableStringify,
  resetEventBus,
} from "../src/index.js";

// Reset event bus before each test file run
resetEventBus();

test("OpenClaw runs a DAG with dependencies and parallelism", async () => {
  const claw = new OpenClaw();
  const ran: string[] = [];
  const res = await claw.run([
    { id: "a", name: "a", run: async () => { ran.push("a"); return 1; } },
    { id: "b", name: "b", deps: ["a"], run: async () => { ran.push("b"); return 2; } },
    { id: "c", name: "c", deps: ["a"], run: async () => { ran.push("c"); return 3; } },
    { id: "d", name: "d", deps: ["b", "c"], run: async () => { ran.push("d"); return 4; } },
  ]);
  assert.equal(res.status, "completed");
  assert.deepEqual(res.results, { a: 1, b: 2, c: 3, d: 4 });
  assert.equal(ran[0], "a");
  assert.ok(ran.indexOf("b") < ran.indexOf("d"));
  assert.ok(ran.indexOf("c") < ran.indexOf("d"));
});

test("OpenClaw retries failing tasks and uses fallback", async () => {
  const claw = new OpenClaw();
  let attempts = 0;
  const res = await claw.run([
    {
      id: "flaky",
      name: "flaky",
      retry: { attempts: 3, backoff_ms: 0 },
      run: async () => {
        attempts++;
        if (attempts < 3) throw new Error("nope");
        return "ok";
      },
    },
    {
      id: "fallible",
      name: "fallible",
      retry: { attempts: 1, backoff_ms: 0 },
      fallback: async () => "rescued",
      run: async () => {
        throw new Error("hard fail");
      },
    },
  ]);
  assert.equal(res.results["flaky"], "ok");
  assert.equal(res.results["fallible"], "rescued");
  assert.equal(res.status, "completed");
});

test("Aomi skills produce signed intents and respect approval gates", async () => {
  const wallet = createAgentWallet(generatePrivateKey());
  const aomi = new AomiRuntime(wallet);
  aomi.registerSkill<{ x: number }, { y: number }>({
    name: "double",
    description: "multiply by 2",
    run: async (i) => ({ y: i.x * 2 }),
  });
  const inv = await aomi.runSkill<{ x: number }, { y: number }>("double", { x: 21 });
  assert.equal(inv.status, "completed");
  assert.equal((inv.output as { y: number }).y, 42);
  assert.ok(inv.signed_intent?.signature.startsWith("0x"));
});

test("Aomi denies skill requiring approval when approver returns false", async () => {
  const wallet = createAgentWallet(generatePrivateKey());
  const aomi = new AomiRuntime(wallet);
  aomi.registerSkill<{ ok: boolean }, string>({
    name: "secret",
    description: "needs approval",
    permissions: { requires_approval: true },
    run: async () => "ran",
  });
  const inv = await aomi.skills.invoke<{ ok: boolean }, string>(
    "secret",
    { ok: true },
    wallet,
    {},
    async () => false
  );
  assert.equal(inv.status, "denied");
});

test("Negotiation converges within budget", async () => {
  const buyerW = createAgentWallet(generatePrivateKey());
  const sellerW = createAgentWallet(generatePrivateKey());
  const buyer = createAgentProfile({ wallet: buyerW, capabilities: ["research"] });
  const seller = createAgentProfile({ wallet: sellerW, capabilities: ["gpu_inference"] });
  const eng = new NegotiationEngine();
  const result = await eng.negotiate({
    buyer,
    provider: seller,
    arbiter_id: "ai",
    listing: {
      listing_id: newId("list"),
      provider_id: seller.agent_id,
      capability: "gpu_inference",
      price_wei: parseEther("0.001").toString(),
      pricing_unit: "per_hour",
      sla: { uptime_pct: 99, max_latency_ms: 200 },
      regions: [],
      active: true,
    },
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
  });
  const agreed = BigInt(result.agreement.agreed_price_wei);
  assert.ok(agreed > 0n);
  assert.ok(agreed <= parseEther("0.002"));
});

test("Swarm splits revenue by weight", () => {
  const w = createAgentWallet(generatePrivateKey());
  const a = createAgentProfile({ wallet: w, capabilities: ["research"] });
  const b = createAgentProfile({ wallet: createAgentWallet(generatePrivateKey()), capabilities: ["storage"] });
  const c = new SwarmCoordinator();
  const s = c.create("test", [
    { agent: a, role: "x", contribution_weight: 0.6 },
    { agent: b, role: "y", contribution_weight: 0.4 },
  ]);
  const splits = c.split(
    s.swarm_id,
    {
      agreement_id: "a",
      request_id: "r",
      buyer_id: "x",
      provider_id: "y",
      capability: "research",
      agreed_price_wei: "0",
      duration_seconds: 1,
      verification_method: "trivial",
      arbiter: "ai",
      obligations: [],
      created_at: 0,
      settled: false,
    },
    1000n
  );
  assert.equal(splits.length, 2);
  assert.equal(splits[0].share_bps + splits[1].share_bps, 10000);
});

test("stableStringify produces canonical output", () => {
  assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(stableStringify({ a: 1, b: 1 }), stableStringify({ b: 1, a: 1 }));
});

test("hashJson is deterministic", () => {
  assert.equal(hashJson({ a: 1, b: [2, 3] }), hashJson({ b: [2, 3], a: 1 }));
});
