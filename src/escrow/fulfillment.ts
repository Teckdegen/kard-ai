import { encodeAbiParameters, parseAbiParameters, keccak256, type Hex } from "viem";
import type { AgentWallet } from "../core/wallet.js";
import type { Agreement, ExecutionProof } from "../core/types.js";
import { hashJson, newId, now } from "../core/ids.js";

export interface FulfillmentStatement {
  uid: Hex;
  schema: Hex;
  data: Hex;
  attester: Hex;
  recipient: Hex;
  signature: Hex;
  ts: number;
  proof_id: string;
}

const FULFILLMENT_SCHEMA = keccak256(
  new TextEncoder().encode("Kard.FulfillmentStatement.v1")
);

export const encodeFulfillmentData = (proof: ExecutionProof): Hex =>
  encodeAbiParameters(
    parseAbiParameters(
      "string proofId, string agreementId, uint256 latencyMs, uint256 uptimeBps, bytes32 outputHash"
    ),
    [
      proof.proof_id,
      proof.agreement_id,
      BigInt(proof.measured_latency_ms),
      BigInt(Math.round(proof.measured_uptime_pct * 100)),
      proof.output_hash as Hex,
    ]
  );

export const buildFulfillmentStatement = async (args: {
  provider: AgentWallet;
  buyerWallet: Hex;
  agreement: Agreement;
  proof: ExecutionProof;
}): Promise<FulfillmentStatement> => {
  const uid = `0x${Buffer.from(newId("fulfill"), "utf8").toString("hex").padEnd(64, "0").slice(0, 64)}` as Hex;
  const data = encodeFulfillmentData(args.proof);
  const digest = hashJson({
    uid,
    schema: FULFILLMENT_SCHEMA,
    data,
    attester: args.provider.address,
    recipient: args.buyerWallet,
    agreement_id: args.agreement.agreement_id,
  });
  const signature = (await args.provider.account.signMessage({
    message: { raw: digest as Hex },
  })) as Hex;
  return {
    uid,
    schema: FULFILLMENT_SCHEMA,
    data,
    attester: args.provider.address as Hex,
    recipient: args.buyerWallet,
    signature,
    ts: now(),
    proof_id: args.proof.proof_id,
  };
};
