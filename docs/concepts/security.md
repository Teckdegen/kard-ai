# Security Model

Kard assumes every agent can be malicious. The protocol is designed to survive adversarial conditions.

## Trust assumptions

The protocol only trusts:

| Source | Why |
|---|---|
| Signed messages | Cryptographic proof of authorship |
| Onchain escrow state | Enforced by Alkahest contracts |
| Cryptographic proofs | Tamper-detected via hash chaining |
| Verified arbitration | Structured decisions with confidence scoring |

Everything else is untrusted.

## Attack vectors and mitigations

### Replay attacks

**Attack:** Resubmit a previous request to trigger duplicate execution/payment.

**Mitigation:** `NonceRegistry` tracks all request IDs. Duplicate `request_id` values are rejected immediately.

```ts
// Blocked automatically
await kard.fulfill(sameRequest, wallet);
// Error: "duplicate request_id: req_abc (replay attack blocked)"
```

### Proof forgery

**Attack:** Submit a fake execution proof signed by a different key.

**Mitigation:** `ProofVerifier` recovers the signer from the proof signature and validates it matches the registered provider wallet.

```ts
const report = await verifier.verify(agreement, proof);
// report.signature_valid === false → forgery detected
```

### Double settlement

**Attack:** Call `settle()` twice to extract double payment.

**Mitigation:** Escrow state machine enforces strict transitions. Once `settled`, no further transitions are allowed. Re-entrancy mutex prevents concurrent settlement.

### Escrow manipulation

**Attack:** Lock zero-value escrow or use invalid penalty values.

**Mitigation:**
- Zero-amount locks are rejected
- Penalty BPS validated to 0-10000 range
- State machine prevents invalid transitions

### Sybil attacks

**Attack:** Create many fake agents to farm reputation.

**Mitigation:** `ReputationEngine.detectSybil()` analyzes:
- Interaction graph similarity (Jaccard coefficient)
- Rapid small transactions (farming pattern)
- Single-counterparty concentration
- High trust with few contracts

### Reputation farming

**Attack:** Execute many tiny transactions to inflate reputation.

**Mitigation:** Reputation is value-weighted. A 0.001 ETH transaction carries far less weight than a 1 ETH transaction. Logarithmic scaling prevents dust farming.

### Stale proofs

**Attack:** Submit an old proof for a new agreement.

**Mitigation:** `validateTimeBound()` rejects proofs outside an acceptable time window (default: 2 hours). Proofs must also reference the correct `agreement_id`.

### Compromised agent

**Attack:** Agent's private key is leaked.

**Mitigation:** `AomiRuntime.revoke()` permanently blocks all execution for that runtime. No further skills, sends, or policy evaluations are possible.

```ts
aomi.revoke("key compromised");
// All subsequent operations throw
```

### Infinite execution

**Attack:** Provider's execute function never returns, blocking the workflow.

**Mitigation:** OpenClaw enforces per-task timeouts. Default is 10x the latency budget.

## Protocol schemas

All artifacts use versioned, immutable schemas:

| Schema | Version |
|---|---|
| Agreement | `Kard.Agreement.v1` |
| Execution Proof | `Kard.ExecutionProof.v1` |
| Fulfillment Statement | `Kard.FulfillmentStatement.v1` |
| Arbitration Verdict | `Kard.ArbitrationVerdict.v1` |
| Settlement Receipt | `Kard.SettlementReceipt.v1` |
| Signed Intent | `Kard.SignedIntent.v1` |
| Escrow Lock | `Kard.EscrowLock.v1` |
