import { child } from "../core/logger.js";

const log = child("filecoin-pin");

export type PinStatus = "queued" | "pinning" | "pinned" | "failed";

export interface PinObject {
  cid: string;
  name?: string;
  meta?: Record<string, string>;
  origins?: string[];
}

export interface PinRecord {
  requestid: string;
  status: PinStatus;
  created: string;
  pin: PinObject;
  delegates: string[];
}

export interface FilecoinPinConfig {
  endpoint: string;
  token: string;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

export class FilecoinPinClient {
  constructor(private cfg: FilecoinPinConfig) {
    if (!cfg.endpoint || !cfg.token) throw new Error("FilecoinPinClient: endpoint and token required");
  }

  static fromEnv(): FilecoinPinClient | undefined {
    const endpoint = process.env.FILECOIN_PIN_ENDPOINT;
    const token = process.env.FILECOIN_PIN_TOKEN;
    if (!endpoint || !token) return undefined;
    return new FilecoinPinClient({
      endpoint,
      token,
      pollIntervalMs: Number(process.env.FILECOIN_PIN_POLL_MS ?? 2000),
      pollTimeoutMs: Number(process.env.FILECOIN_PIN_TIMEOUT_MS ?? 120_000),
    });
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.cfg.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private url(path: string): string {
    return `${this.cfg.endpoint.replace(/\/$/, "")}${path}`;
  }

  async pin(obj: PinObject): Promise<PinRecord> {
    const res = await fetch(this.url("/pins"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(obj),
    });
    if (!res.ok) throw new Error(`filecoin-pin POST /pins failed: ${res.status} ${await res.text()}`);
    const rec = (await res.json()) as PinRecord;
    log.info({ requestid: rec.requestid, cid: rec.pin.cid, status: rec.status }, "pin submitted");
    return rec;
  }

  async get(requestid: string): Promise<PinRecord> {
    const res = await fetch(this.url(`/pins/${requestid}`), { headers: this.headers() });
    if (!res.ok) throw new Error(`filecoin-pin GET /pins/${requestid} failed: ${res.status}`);
    return (await res.json()) as PinRecord;
  }

  async list(filter?: { cid?: string; status?: PinStatus[] }): Promise<PinRecord[]> {
    const qs = new URLSearchParams();
    if (filter?.cid) qs.set("cid", filter.cid);
    if (filter?.status?.length) qs.set("status", filter.status.join(","));
    const res = await fetch(this.url(`/pins?${qs}`), { headers: this.headers() });
    if (!res.ok) throw new Error(`filecoin-pin GET /pins failed: ${res.status}`);
    const body = (await res.json()) as { results: PinRecord[] };
    return body.results ?? [];
  }

  async unpin(requestid: string): Promise<void> {
    const res = await fetch(this.url(`/pins/${requestid}`), { method: "DELETE", headers: this.headers() });
    if (!res.ok && res.status !== 404) throw new Error(`filecoin-pin DELETE failed: ${res.status}`);
  }

  async waitUntilPinned(requestid: string): Promise<PinRecord> {
    const start = Date.now();
    const timeout = this.cfg.pollTimeoutMs ?? 120_000;
    const interval = this.cfg.pollIntervalMs ?? 2000;
    while (Date.now() - start < timeout) {
      const rec = await this.get(requestid);
      if (rec.status === "pinned") {
        log.info({ requestid, cid: rec.pin.cid }, "pinned on Filecoin");
        return rec;
      }
      if (rec.status === "failed") throw new Error(`pin failed: ${requestid}`);
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(`pin timeout after ${timeout}ms`);
  }
}
