# Execution

The Aomi runtime for autonomous agent execution.

## Create a runtime

```ts
import { AomiRuntime, createAgentWallet, resolveChainEnv } from "kard-ai";

const env = resolveChainEnv({ chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" });
const wallet = createAgentWallet("0xKEY", env);

const aomi = new AomiRuntime(wallet, {
  smartAccount: {
    address: "0xSMART_ACCOUNT",
    bundlerUrl: "https://bundler.example/rpc",
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  },
});
```

## Register a skill

```ts
aomi.registerSkill({
  name: "summarize",
  description: "summarize a topic",
  permissions: { requires_approval: false, max_value_wei: parseEther("0.05") },
  run: async (input) => {
    const summary = await llm.run(input.topic);
    return { summary };
  },
});
```

## Run a skill

```ts
const inv = await aomi.runSkill("summarize", { topic: "Filecoin" });

inv.status          // "completed"
inv.output          // { summary: "..." }
inv.signed_intent   // cryptographic proof of execution
inv.duration_ms     // how long it took
```

## Kill switch

```ts
aomi.revoke("key compromised");
// All further operations throw
```

## Restrict targets

```ts
aomi.restrictTargets(["0xESCROW", "0xTREASURY"]);
// Sends to any other address are blocked
```

## Send funds

```ts
await aomi.send("0xTARGET", parseEther("0.1"));
await aomi.batchSend([
  { to: "0xA", value: parseEther("0.1") },
  { to: "0xB", value: parseEther("0.2") },
]);
```
