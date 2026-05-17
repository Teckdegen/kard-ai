# OpenClaw Orchestration

OpenClaw is a fault-tolerant task-DAG runtime that coordinates multi-step workflows with production-grade reliability.

## Features

- DAG integrity validation (cycle detection)
- Idempotency keys (no duplicate execution)
- Per-task timeouts
- Retry with exponential backoff
- Fallback handlers
- Saga compensation on failure
- Parallel execution with deterministic merge
- Persisted workflow state

## Usage

```ts
import { OpenClaw } from "kard/orchestrator";

const claw = new OpenClaw();

const result = await claw.run([
  {
    id: "fetch_data",
    name: "fetch_data",
    timeout_ms: 5000,
    run: async (ctx) => {
      return await fetchMarketData();
    },
  },
  {
    id: "analyze",
    name: "analyze",
    deps: ["fetch_data"],
    retry: { attempts: 3, backoff_ms: 1000 },
    run: async (ctx) => {
      const data = ctx.results["fetch_data"];
      return await runAnalysis(data);
    },
  },
  {
    id: "publish",
    name: "publish",
    deps: ["analyze"],
    idempotency_key: "publish:job_123",
    compensate: async (input, output) => {
      await unpublish(output); // saga rollback
    },
    run: async (ctx) => {
      return await publishResults(ctx.results["analyze"]);
    },
  },
]);

console.log(result.status);      // "completed" or "failed"
console.log(result.duration_ms); // total workflow time
console.log(result.compensated); // tasks that were rolled back
```

## Task specification

```ts
interface TaskSpec {
  id: string;                    // unique task identifier
  name: string;                  // human-readable name
  deps?: string[];               // task IDs this depends on
  retry?: {
    attempts: number;            // max attempts (default: 1)
    backoff_ms: number;          // backoff between retries
  };
  timeout_ms?: number;           // max execution time
  idempotency_key?: string;      // prevents duplicate execution
  fallback?: (input, err) => Promise<any>;  // rescue on failure
  compensate?: (input, output) => Promise<void>;  // saga rollback
  run: (ctx: TaskContext) => Promise<any>;
}
```

## DAG validation

OpenClaw validates the task graph before execution:

- **Duplicate IDs** → rejected
- **Unknown dependencies** → rejected
- **Circular dependencies** → rejected (Kahn's algorithm)
- **Self-dependencies** → rejected

```ts
// This will throw: "workflow DAG contains a cycle"
await claw.run([
  { id: "a", name: "a", deps: ["b"], run: async () => 1 },
  { id: "b", name: "b", deps: ["a"], run: async () => 2 },
]);
```

## Saga compensation

When a workflow fails, completed tasks with `compensate` handlers are rolled back in reverse order:

```ts
const result = await claw.run([
  {
    id: "reserve",
    name: "reserve",
    compensate: async () => { await cancelReservation(); },
    run: async () => { return await makeReservation(); },
  },
  {
    id: "charge",
    name: "charge",
    deps: ["reserve"],
    run: async () => { throw new Error("payment failed"); },
  },
]);

// result.status === "failed"
// result.compensated === ["reserve"]  — reservation was cancelled
```

## Events

OpenClaw emits events for observability:

- `workflow:start` — workflow begins
- `task:start` — individual task begins
- `task:complete` — task succeeds
- `task:fail` — task fails after all retries
- `task:fallback` — fallback handler rescued a failure
- `workflow:end` — workflow finishes
