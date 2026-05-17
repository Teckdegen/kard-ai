/**
 * Test Helpers — Provides a minimal in-process memory store for unit testing.
 * This is NOT exported from the SDK. It exists only for testing the protocol logic
 * without requiring live IPFS/Filecoin infrastructure.
 */
import type { MemoryStore, PinResult } from "../src/memory/ipfs.js";

/**
 * Test-only memory store that keeps data in-process.
 * NOT part of the public SDK — only used in test suites.
 */
export class TestMemoryStore implements MemoryStore {
  private kv = new Map<string, unknown>();
  private bytes = new Map<string, Uint8Array>();
  private counter = 0;

  private mkCid(): string {
    return `bafy_test_${++this.counter}_${Date.now().toString(36)}`;
  }

  async putJson<T>(value: T, _name?: string): Promise<string> {
    const cid = this.mkCid();
    this.kv.set(cid, structuredClone(value));
    return cid;
  }

  async getJson<T>(cid: string): Promise<T> {
    if (!this.kv.has(cid)) throw new Error(`cid not found: ${cid}`);
    return structuredClone(this.kv.get(cid)) as T;
  }

  async putBytes(data: Uint8Array, _name?: string): Promise<string> {
    const cid = this.mkCid();
    this.bytes.set(cid, new Uint8Array(data));
    return cid;
  }

  async getBytes(cid: string): Promise<Uint8Array> {
    const v = this.bytes.get(cid);
    if (!v) throw new Error(`cid not found: ${cid}`);
    return new Uint8Array(v);
  }

  async pin(cid: string): Promise<PinResult> {
    return { cid, filecoin: true, requestid: `req_${cid}`, status: "pinned" };
  }

  async stop(): Promise<void> {}
}
