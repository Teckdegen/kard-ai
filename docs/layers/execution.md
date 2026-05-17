# Aomi Execution

Aomi is the account abstraction runtime for autonomous agent execution. It provides signed intents, policy enforcement, and smart account support.

## Features

- EIP-712-like structured intent signing
- Pre-flight policy checks before execution
- Target sandboxing (whitelist-only sends)
- Kill-switch for compromised agents
- Batch execution support
- Smart account (ERC-4337) integration
- Rate limiting per skill

## Skills

Skills are composable, permission-locked agent capabilities:

```ts
import { AomiRuntime } from "kard/execution";

const aomi = new AomiRuntime(wallet);

aomi.registerSkill<{ topic: string }, { summary: string }>({
  name: "summarize",
  description: "produce a summary of a topic",
  permissions: {
    requires_approval: false,
    max_value_wei: parseEther("0.05"),
    max_invocations_per_minute: 10,
  },
  run: async (input) => {
    const summary = await llm.summarize(input.topic);
    return { summary };
  },
});

const inv = await aomi.runSkill("summarize", { topic: "Filecoin" });
console.log(inv.signed_intent);  // cryptographically signed
console.log(inv.status);         // "completed"
console.log(inv.duration_ms);    // execution time
```

## Signed intents

Every skill invocation produces a `SignedIntent`:

```ts
interface SignedIntent {
  intent_id: string;       // unique intent identifier
  schema_version: string;  // "Kard.SignedIntent.v1"
  agent: Address;          // signing agent's address
  skill: string;           // skill name
  input_hash: string;      // SHA-256 of input
  output_hash?: string;    // SHA-256 of output (after completion)
  nonce: number;           // replay protection
  ts: number;              // timestamp
  expiry: number;          // intent expires after this time
  signature: Hex;          // agent's cryptographic signature
}
```

## Policy engine

Policies are evaluated in priority order:

```ts
aomi.addPolicy({
  name: "max_spend_check",
  priority: 1,  // lower = runs first
  predicate: (ctx) => BigInt(ctx.state["amount"]) > parseEther("1"),
  action: async (ctx) => {
    throw new Error("spend limit exceeded");
  },
});

aomi.addPreFlightCheck({
  name: "balance_check",
  check: async (ctx) => {
    const bal = await ctx.wallet.publicClient.getBalance({ address: ctx.wallet.address });
    return { allowed: bal > 0n, reason: "insufficient balance" };
  },
});
```

## Kill switch

Permanently block a compromised runtime:

```ts
aomi.revoke("private key leaked");
// All subsequent operations throw: "runtime is revoked"
```

## Target sandboxing

Restrict which addresses the runtime can send to:

```ts
aomi.restrictTargets([
  "0xESCROW_CONTRACT",
  "0xTREASURY",
]);
// Sends to any other address will throw
```

## Smart account

When configured, execution routes through an ERC-4337 smart account:

```ts
const aomi = new AomiRuntime(wallet, {
  smartAccount: {
    address: "0xSMART_ACCOUNT",
    bundlerUrl: "https://bundler.example/rpc",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  },
});

// Sends go through the smart account
await aomi.send(target, value);
// UserOp signed → submitted to bundler → executed onchain
```

## Batch execution

Execute multiple operations atomically:

```ts
const hashes = await aomi.batchSend([
  { to: "0xA", value: parseEther("0.1") },
  { to: "0xB", value: parseEther("0.2") },
  { to: "0xC", value: parseEther("0.05"), data: "0x..." },
]);
```
