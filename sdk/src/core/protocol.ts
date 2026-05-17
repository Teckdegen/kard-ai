/**
 * Protocol Schema Versioning — Immutable v1 schemas for all protocol artifacts.
 * These define the canonical wire format for cross-agent communication.
 */
import { z } from "zod";

/** Protocol version identifier */
export const PROTOCOL_VERSION = "kard.v1" as const;

/** Schema version tags — used in all serialized artifacts */
export const SCHEMA_VERSIONS = {
  agreement: "Kard.Agreement.v1",
  proof: "Kard.ExecutionProof.v1",
  fulfillment: "Kard.FulfillmentStatement.v1",
  verdict: "Kard.ArbitrationVerdict.v1",
  receipt: "Kard.SettlementReceipt.v1",
  intent: "Kard.SignedIntent.v1",
  escrow_lock: "Kard.EscrowLock.v1",
} as const;

/** Nonce tracker to prevent replay attacks */
export class NonceRegistry {
  private seen = new Set<string>();
  private expiry = new Map<string, number>();
  private readonly ttlSeconds: number;

  constructor(ttlSeconds = 3600) {
    this.ttlSeconds = ttlSeconds;
  }

  /** Returns true if nonce is fresh (not seen before) */
  check(nonce: string): boolean {
    this.gc();
    if (this.seen.has(nonce)) return false;
    this.seen.add(nonce);
    this.expiry.set(nonce, Math.floor(Date.now() / 1000) + this.ttlSeconds);
    return true;
  }

  /** Explicitly mark a nonce as consumed */
  consume(nonce: string): void {
    this.seen.add(nonce);
    this.expiry.set(nonce, Math.floor(Date.now() / 1000) + this.ttlSeconds);
  }

  private gc(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [nonce, exp] of this.expiry) {
      if (exp < now) {
        this.seen.delete(nonce);
        this.expiry.delete(nonce);
      }
    }
  }

  size(): number {
    return this.seen.size;
  }
}

/** Idempotency key registry for task execution */
export class IdempotencyRegistry {
  private results = new Map<string, { result: unknown; ts: number }>();
  private readonly ttlSeconds: number;

  constructor(ttlSeconds = 7200) {
    this.ttlSeconds = ttlSeconds;
  }

  has(key: string): boolean {
    this.gc();
    return this.results.has(key);
  }

  get<T>(key: string): T | undefined {
    const entry = this.results.get(key);
    return entry ? (entry.result as T) : undefined;
  }

  set(key: string, result: unknown): void {
    this.results.set(key, { result, ts: Math.floor(Date.now() / 1000) });
  }

  private gc(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [key, entry] of this.results) {
      if (entry.ts + this.ttlSeconds < now) {
        this.results.delete(key);
      }
    }
  }
}

/** Time-bound validation — reject artifacts outside acceptable time window */
export const validateTimeBound = (ts: number, maxAgeSec = 300, maxFutureSec = 30): boolean => {
  const now = Math.floor(Date.now() / 1000);
  if (ts > now + maxFutureSec) return false; // too far in the future
  if (ts < now - maxAgeSec) return false; // too old
  return true;
};

/** Rate limiter for per-agent actions */
export class RateLimiter {
  private windows = new Map<string, number[]>();
  constructor(private maxPerWindow: number, private windowMs: number = 60_000) {}

  allow(key: string): boolean {
    const now = Date.now();
    const window = this.windows.get(key) ?? [];
    const valid = window.filter((ts) => ts > now - this.windowMs);
    if (valid.length >= this.maxPerWindow) return false;
    valid.push(now);
    this.windows.set(key, valid);
    return true;
  }

  reset(key: string): void {
    this.windows.delete(key);
  }
}
