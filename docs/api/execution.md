# Execution API

## `AomiRuntime`

```ts
import { AomiRuntime } from "kard-ai/execution";

const aomi = new AomiRuntime(wallet, {
  smartAccount: { address: "0x...", bundlerUrl: "...", entryPoint: "0x..." },
});
```

### `aomi.registerSkill(spec)`

Register a composable skill.

### `aomi.runSkill(name, input, state?)`

Execute a skill with signed intent.

### `aomi.addPolicy(policy)`

Add an execution policy.

### `aomi.addPreFlightCheck(check)`

Add a pre-flight validation check.

### `aomi.evaluate(state)`

Evaluate all policies against state.

### `aomi.send(to, value, data?)`

Send a transaction (via smart account if configured).

### `aomi.batchSend(ops)`

Execute multiple sends.

### `aomi.revoke(reason)`

Permanently block this runtime.

### `aomi.restrictTargets(addresses)`

Whitelist allowed send targets.

### `aomi.isRevoked()`

Check if runtime is revoked.

## `SkillRegistry`

```ts
const registry = aomi.skills;

registry.register(spec);     // add a skill
registry.unregister(name);   // remove a skill
registry.list();             // all registered skills
registry.has(name);          // check existence
registry.log();              // invocation history
registry.historyFor(name);   // history for specific skill
registry.clearHistory();     // reset (testing)
```
