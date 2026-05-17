import type { MemoryStore } from "./ipfs.js";
import type {
  Agreement,
  ExecutionProof,
  ArbitrationVerdict,
  SettlementReceipt,
  AgentProfile,
} from "../core/types.js";

export interface ArchiveEntry {
  kind: "agreement" | "proof" | "verdict" | "receipt" | "profile" | "negotiation";
  cid: string;
  ts: number;
  refs: string[];
}

export class Archive {
  private entries: ArchiveEntry[] = [];
  constructor(private store: MemoryStore) {}

  async putAgreement(a: Agreement): Promise<string> {
    const cid = await this.store.putJson(a, `agreement-${a.agreement_id}`);
    this.entries.push({ kind: "agreement", cid, ts: a.created_at, refs: [a.request_id, a.buyer_id, a.provider_id] });
    return cid;
  }
  async putProof(p: ExecutionProof): Promise<string> {
    const cid = await this.store.putJson(p, `proof-${p.proof_id}`);
    this.entries.push({ kind: "proof", cid, ts: p.completed_at, refs: [p.agreement_id, p.provider_id] });
    return cid;
  }
  async putVerdict(v: ArbitrationVerdict): Promise<string> {
    const cid = await this.store.putJson(v, `verdict-${v.verdict_id}`);
    this.entries.push({ kind: "verdict", cid, ts: v.decided_at, refs: [v.agreement_id, v.proof_id, v.arbiter_id] });
    return cid;
  }
  async putReceipt(r: SettlementReceipt): Promise<string> {
    const cid = await this.store.putJson(r, `receipt-${r.receipt_id}`);
    this.entries.push({ kind: "receipt", cid, ts: r.settled_at, refs: [r.agreement_id] });
    return cid;
  }
  async putProfile(p: AgentProfile): Promise<string> {
    const cid = await this.store.putJson(p, `profile-${p.agent_id}`);
    this.entries.push({ kind: "profile", cid, ts: p.updated_at, refs: [p.agent_id] });
    return cid;
  }
  async putNegotiationLog(log: unknown, refs: string[]): Promise<string> {
    const cid = await this.store.putJson(log, `negotiation-${refs[0] ?? "log"}`);
    this.entries.push({ kind: "negotiation", cid, ts: Math.floor(Date.now() / 1000), refs });
    return cid;
  }

  list(filter?: Partial<Pick<ArchiveEntry, "kind">> & { ref?: string }): ArchiveEntry[] {
    return this.entries.filter((e) => {
      if (filter?.kind && e.kind !== filter.kind) return false;
      if (filter?.ref && !e.refs.includes(filter.ref)) return false;
      return true;
    });
  }
}
