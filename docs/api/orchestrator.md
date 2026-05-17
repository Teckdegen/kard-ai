# Orchestrator API

## `OpenClaw`

```ts
import { OpenClaw } from "kard-ai/orchestrator";

const claw = new OpenClaw();
```

### `claw.run(tasks, opts?)`

Execute a task-DAG workflow.

```ts
const result = await claw.run(tasks, { workflowId: "custom-id" });
// WorkflowResult { workflow_id, status, tasks, results, started_at, completed_at, duration_ms, compensated }
```

### `claw.getState(workflowId)`

Get persisted workflow state.

### `claw.exportStates()`

Export all workflow states for external persistence.

### Events

```ts
claw.on("workflow:start", (data) => { ... });
claw.on("task:start", (data) => { ... });
claw.on("task:complete", (data) => { ... });
claw.on("task:fail", (data) => { ... });
claw.on("task:fallback", (data) => { ... });
claw.on("workflow:end", (result) => { ... });
```
