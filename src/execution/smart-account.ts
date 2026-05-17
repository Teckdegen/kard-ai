import { type Address, type Hex, encodeFunctionData, parseAbi } from "viem";
import type { AgentWallet } from "../core/wallet.js";
import { child } from "../core/logger.js";
import { hashJson, newId, now } from "../core/ids.js";

const log = child("aomi.smart-account");

const SMART_ACCOUNT_ABI = parseAbi([
  "function execute(address dest, uint256 value, bytes calldata data) external",
  "function executeBatch(address[] calldata dest, uint256[] calldata value, bytes[] calldata data) external",
  "function getNonce() external view returns (uint256)",
  "function owner() external view returns (address)",
]);

export interface SmartAccountConfig {
  address: Address;
  entryPoint?: Address;
  bundlerUrl?: string;
}

export interface UserOpReceipt {
  user_op_id: string;
  smart_account: Address;
  target: Address;
  value_wei: string;
  data: Hex;
  nonce: string;
  tx_hash?: Hex;
  bundler?: string;
  ts: number;
}

export class SmartAccount {
  constructor(private cfg: SmartAccountConfig, private signer: AgentWallet) {}

  get address(): Address {
    return this.cfg.address;
  }

  async nonce(): Promise<bigint> {
    try {
      return await this.signer.publicClient.readContract({
        address: this.cfg.address,
        abi: SMART_ACCOUNT_ABI,
        functionName: "getNonce",
      });
    } catch {
      return BigInt(now());
    }
  }

  async execute(target: Address, valueWei: bigint, data: Hex = "0x"): Promise<UserOpReceipt> {
    const nonce = await this.nonce();
    const userOpId = newId("uop");
    const callData = encodeFunctionData({
      abi: SMART_ACCOUNT_ABI,
      functionName: "execute",
      args: [target, valueWei, data],
    });

    const digest = hashJson({
      smart_account: this.cfg.address,
      target,
      value_wei: valueWei.toString(),
      data,
      nonce: nonce.toString(),
    });
    const signature = (await this.signer.account.signMessage({
      message: { raw: digest as Hex },
    })) as Hex;

    if (this.cfg.bundlerUrl && this.cfg.entryPoint) {
      try {
        const txHash = await this.submitToBundler({
          target,
          value: valueWei,
          data,
          callData,
          signature,
          nonce,
        });
        log.info({ user_op_id: userOpId, tx_hash: txHash, bundler: this.cfg.bundlerUrl }, "userop submitted");
        return {
          user_op_id: userOpId,
          smart_account: this.cfg.address,
          target,
          value_wei: valueWei.toString(),
          data,
          nonce: nonce.toString(),
          tx_hash: txHash,
          bundler: this.cfg.bundlerUrl,
          ts: now(),
        };
      } catch (e) {
        log.warn({ err: (e as Error).message }, "bundler submission failed, falling back to direct execute");
      }
    }

    const txHash = await this.signer.walletClient.writeContract({
      address: this.cfg.address,
      abi: SMART_ACCOUNT_ABI,
      functionName: "execute",
      args: [target, valueWei, data],
      chain: this.signer.env.chain,
      account: this.signer.account,
    });
    log.info({ user_op_id: userOpId, tx_hash: txHash }, "direct execute");
    return {
      user_op_id: userOpId,
      smart_account: this.cfg.address,
      target,
      value_wei: valueWei.toString(),
      data,
      nonce: nonce.toString(),
      tx_hash: txHash,
      ts: now(),
    };
  }

  private async submitToBundler(args: {
    target: Address;
    value: bigint;
    data: Hex;
    callData: Hex;
    signature: Hex;
    nonce: bigint;
  }): Promise<Hex> {
    const userOp = {
      sender: this.cfg.address,
      nonce: `0x${args.nonce.toString(16)}`,
      callData: args.callData,
      callGasLimit: "0x186a0",
      verificationGasLimit: "0x186a0",
      preVerificationGas: "0x5208",
      maxFeePerGas: "0x59682f00",
      maxPriorityFeePerGas: "0x59682f00",
      paymasterAndData: "0x",
      signature: args.signature,
    };
    const res = await fetch(this.cfg.bundlerUrl!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [userOp, this.cfg.entryPoint],
      }),
    });
    const body = (await res.json()) as { result?: Hex; error?: { message: string } };
    if (body.error) throw new Error(body.error.message);
    return body.result!;
  }
}
