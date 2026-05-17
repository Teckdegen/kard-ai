/**
 * Decentralized Memory — Helia IPFS + Filecoin Pin.
 * All data is content-addressed via real IPFS and pinned to Filecoin.
 * No in-memory simulation — this is production infrastructure.
 */
import { child } from "../core/logger.js";
import { FilecoinPinClient } from "./filecoin-pin.js";

const log = child("memory");

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PinResult {
  cid: string;
  requestid?: string;
  status?: string;
  filecoin: boolean;
}

export interface MemoryStore {
  putJson<T>(value: T, name?: string): Promise<string>;
  getJson<T>(cid: string): Promise<T>;
  putBytes(data: Uint8Array, name?: string): Promise<string>;
  getBytes(cid: string): Promise<Uint8Array>;
  pin?(cid: string, name?: string, meta?: Record<string, string>): Promise<PinResult>;
  stop(): Promise<void>;
}

// ─── Helia IPFS Implementation ──────────────────────────────────────────────

class HeliaMemory implements MemoryStore {
  private j: any;
  private fs: any;
  private CID: any;

  constructor(
    private helia: any,
    jsonMod: any,
    unixfsMod: any,
    cidMod: any,
    private filecoin?: FilecoinPinClient
  ) {
    this.j = jsonMod.json(helia);
    this.fs = unixfsMod.unixfs(helia);
    this.CID = cidMod.CID;
  }

  async putJson<T>(value: T, name?: string): Promise<string> {
    const cid = await this.j.add(value as unknown);
    const cidStr = cid.toString();
    log.debug({ cid: cidStr, name }, "stored json to IPFS");
    if (this.filecoin) await this.pinToFilecoin(cidStr, name);
    return cidStr;
  }

  async getJson<T>(cid: string): Promise<T> {
    return (await this.j.get(this.CID.parse(cid))) as T;
  }

  async putBytes(data: Uint8Array, name?: string): Promise<string> {
    const cid = await this.fs.addBytes(data);
    const cidStr = cid.toString();
    log.debug({ cid: cidStr, name }, "stored bytes to IPFS");
    if (this.filecoin) await this.pinToFilecoin(cidStr, name);
    return cidStr;
  }

  async getBytes(cid: string): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of this.fs.cat(this.CID.parse(cid))) chunks.push(chunk);
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }

  async pin(cid: string, name?: string, meta?: Record<string, string>): Promise<PinResult> {
    if (!this.filecoin) return { cid, filecoin: false };
    const rec = await this.filecoin.pin({ cid, name, meta });
    return { cid, requestid: rec.requestid, status: rec.status, filecoin: true };
  }

  private async pinToFilecoin(cid: string, name?: string): Promise<void> {
    try {
      await this.filecoin!.pin({ cid, name });
      log.debug({ cid, name }, "pinned to Filecoin");
    } catch (e) {
      log.error({ err: (e as Error).message, cid }, "Filecoin pin FAILED");
      throw new Error(`Filecoin pin failed for ${cid}: ${(e as Error).message}`);
    }
  }

  async stop(): Promise<void> {
    await (this.helia as { stop: () => Promise<void> }).stop();
    log.info("Helia IPFS node stopped");
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a real IPFS memory store backed by Helia + Filecoin Pin.
 * This is production infrastructure — no simulation.
 */
export const createMemory = async (opts?: { filecoin?: FilecoinPinClient }): Promise<MemoryStore> => {
  const heliaMod = await import("helia");
  const jsonMod = await import("@helia/json");
  const unixfsMod = await import("@helia/unixfs");
  const cidMod = await import("multiformats/cid");
  const helia = await heliaMod.createHelia();
  log.info({ peerId: helia.libp2p.peerId.toString() }, "Helia IPFS node started");
  if (opts?.filecoin) log.info("Filecoin Pin client attached — all CIDs will be pinned");
  return new HeliaMemory(helia, jsonMod, unixfsMod, cidMod, opts?.filecoin);
};
