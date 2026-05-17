# Changelog

## [1.0.0] — 2025-05-17

### Production hardening release

This release transforms Kard from a hackathon prototype into a production-grade autonomous commerce protocol.

### Added

- **Event Sourcing** — Full protocol event bus with typed events (`AgentRegistered`, `EscrowLocked`, `SettlementExecuted`, etc.). All state is reconstructable from the event log.
- **Protocol Schema Versioning** — Immutable v1 schemas for all protocol artifacts (`Kard.Agreement.v1`, `Kard.ExecutionProof.v1`, etc.).
- **Replay Protection** — `NonceRegistry` prevents duplicate request processing and intent replay attacks.
- **Idempotency Keys** — All OpenClaw tasks support idempotency to prevent duplicate execution.
- **Escrow State Machine** — Strict state transitions (`LOCKED → DISPUTED | SETTLED | REFUNDED | EXPIRED`) with validation.
- **Re-entrancy Guards** — Settlement mutex prevents concurrent settlement of the same escrow.
- **Dispute Mechanism** — `escrow.dispute()` with configurable dispute windows.
- **Escrow Expiration** — Automatic expiration detection with safe refund path.
- **DAG Integrity Validation** — Cycle detection, duplicate ID rejection, unknown dependency validation.
- **Task Timeouts** — Configurable per-task timeout prevents infinite execution.
- **Saga Compensation** — Failed workflows trigger reverse compensation of completed tasks.
- **Workflow State Persistence** — Exportable workflow states for external persistence.
- **Aomi Kill-Switch** — `runtime.revoke()` permanently blocks a compromised agent.
- **Target Sandboxing** — `runtime.restrictTargets()` whitelists allowed send destinations.
- **Pre-flight Policy Checks** — Policy engine runs BEFORE execution, not just after.
- **Batch Execution** — `runtime.batchSend()` for atomic multi-step operations.
- **EIP-712-like Intent Signing** — Structured signing payload with schema version, expiry, and nonce.
- **Skill Rate Limiting** — Per-skill invocation rate limits.
- **Proof Tamper Detection** — Hash chaining between consecutive proofs.
- **Time-bound Proofs** — Reject proofs outside acceptable time window.
- **Arbitration Confidence Scoring** — Structured decision factors with weighted confidence.
- **Appeal Mechanism** — `arbiter.fileAppeal()` + `arbiter.processAppeal()` for second-level review.
- **Value-weighted Reputation** — Higher-value transactions carry more reputation weight.
- **Reputation Decay** — Inactive agents lose reputation over time (90-day half-life).
- **Sybil Detection** — Interaction graph analysis, farming detection, similarity scoring.
- **Non-linear Dispute Penalty** — Exponential penalty for high dispute rates.
- **Adversarial Test Suite** — 12 new tests covering replay attacks, escrow manipulation, DAG integrity, kill-switch, Sybil detection, and more.

### Changed

- `EscrowReceipt` now includes `state` and `nonce` fields.
- `WorkflowResult` now includes `duration_ms` and `compensated` fields.
- `VerificationReport` now includes `time_valid`, `confidence`, and `verifier_notes`.
- `SignedIntent` now includes `schema_version` and `expiry`.
- `FulfillResult` now includes `protocol_version`.
- Package version bumped to `1.0.0` (production-ready).
- All protocol events are emitted via the global `EventBus`.

### Security

- Escrow: zero-amount locks rejected, invalid penalty bounds rejected, double-settlement blocked.
- OpenClaw: cyclic DAGs rejected, duplicate task IDs rejected, unknown dependencies rejected.
- Execution: revoked runtimes block all operations, unauthorized targets rejected.
- Proofs: stale proofs rejected, mismatched agreement/provider bindings caught.
- Reputation: Sybil farming patterns detected and flagged.
- Requests: duplicate request_ids blocked (replay protection).
