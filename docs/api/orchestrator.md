# Orchestrator

The OpenClaw task DAG engine for coordinating multi step workflows.

## Run a workflow

```ts
import { OpenClaw } from "kard-ai/orchestrator";

const claw = new OpenClaw();

const result = await claw.run([
  {
    id: "fetch",
    name: "fetch_data",
    timeout_ms: 5000,
    run: async (ctx) => await fetchData(),
  },
  {
    id: "analyze",
    name: "analyze",
    deps: ["fetch"],
    retry: { attempts: 3, backoff_ms: 1000 },
    run: async (ctx) => await analyze(ctx.results["fetch"]),
  },
  {
    id: "publish",
    name: "publish",
    deps: ["analyze"],
    run: async (ctx) => await publish(ctx.results["analyze"]),
  },
]);

result.status       // "completed" or "failed"
result.duration_ms  // total time
result.results      // output from each task
```

## Task options

```ts
{
  id: string;              // unique task ID
  name: string;            // display name
  deps?: string[];         // depends on these task IDs
  retry?: {
    attempts: number;      // max retries
    backoff_ms: number;    // delay between retries
  };
  timeout_ms?: number;     // max execution time
  idempotency_key?: string; // prevents duplicate execution
  fallback?: (input, err) => Promise<any>;   // rescue on failure
  compensate?: (input, output) => Promise<void>; // rollback on workflow failure
  run: (ctx) => Promise<any>;
}
```

## Saga compensation

If a workflow fails, completed tasks with `compensate` handlers are rolled back in reverse:

```ts
const result = await claw.run([
  {
    id: "reserve",
    name: "reserve",
    compensate: async () => await cancelReservation(),
    run: async () => await makeReservation(),
  },
  {
    id: "charge",
    name: "charge",
    deps: ["reserve"],
    run: async () => { throw new Error("payment failed"); },
  },
]);

// result.status === "failed"
// result.compensated === ["reserve"]
```

## Events

```ts
claw.on("task:start", (data) => { ... });
claw.on("task:complete", (data) => { ... });
claw.on("task:fail", (data) => { ... });
claw.on("workflow:end", (result) => { ... });
```
