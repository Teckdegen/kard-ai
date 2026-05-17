/**
 * Agent Wallet — viem-based wallet creation for autonomous agents.
 * Supports explicit configuration (no hidden env-var dependencies).
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { baseSepolia, sepolia, foundry } from "viem/chains";
import type { ChainConfig } from "./config.js";

// ─── Built-in Chain Definitions ─────────────────────────────────────────────

export const filecoinMainnet: Chain = {
  id: 314,
  name: "Filecoin Mainnet",
  nativeCurrency: { name: "filecoin", symbol: "FIL", decimals: 18 },
  rpcUrls: { default: { http: ["https://api.node.glif.io/rpc/v1"] } },
  blockExplorers: { default: { name: "Filfox", url: "https://filfox.info/en" } },
};

export const filecoinCalibration: Chain = {
  id: 314159,
  name: "Filecoin Calibration",
  nativeCurrency: { name: "test filecoin", symbol: "tFIL", decimals: 18 },
  rpcUrls: { default: { http: ["https://api.calibration.node.glif.io/rpc/v1"] } },
  blockExplorers: { default: { name: "Filfox Calibration", url: "https://calibration.filfox.info/en" } },
  testnet: true,
};

const CHAINS: Record<number, Chain> = {
  [baseSepolia.id]: baseSepolia,
  [sepolia.id]: sepolia,
  [foundry.id]: foundry,
  [filecoinMainnet.id]: filecoinMainnet,
  [filecoinCalibration.id]: filecoinCalibration,
};

// ─── Chain Environment ──────────────────────────────────────────────────────

export interface ChainEnv {
  chainId: number;
  rpcUrl: string;
  chain: Chain;
}

/** Resolve chain environment from explicit config */
export const resolveChainEnv = (config: ChainConfig): ChainEnv => {
  const chain = config.chain ?? CHAINS[config.chainId];
  if (!chain) throw new Error(`unsupported chain ID: ${config.chainId} — provide a custom chain definition`);
  return { chainId: config.chainId, rpcUrl: config.rpcUrl, chain };
};

/**
 * Load chain environment from env vars.
 * @deprecated Use resolveChainEnv(config) with explicit config instead.
 */
export const loadChainEnv = (): ChainEnv => {
  const chainId = Number(process.env.CHAIN_ID ?? filecoinCalibration.id);
  const fallback = CHAINS[chainId] ?? filecoinCalibration;
  const rpcUrl = process.env.RPC_URL ?? fallback.rpcUrls.default.http[0];
  return { chainId, rpcUrl, chain: fallback };
};

// ─── Agent Wallet ───────────────────────────────────────────────────────────

export interface AgentWallet {
  account: PrivateKeyAccount;
  address: Address;
  publicClient: PublicClient;
  walletClient: WalletClient;
  env: ChainEnv;
}

/**
 * Create an agent wallet from a private key and chain environment.
 *
 * @param privateKey - The agent's private key (0x-prefixed hex)
 * @param env - Chain environment (use resolveChainEnv for explicit config)
 */
export const createAgentWallet = (privateKey: Hex, env?: ChainEnv): AgentWallet => {
  const resolvedEnv = env ?? loadChainEnv();
  const account = privateKeyToAccount(privateKey);
  const transport = http(resolvedEnv.rpcUrl);
  const publicClient = createPublicClient({ chain: resolvedEnv.chain, transport });
  const walletClient = createWalletClient({ account, chain: resolvedEnv.chain, transport });
  return { account, address: account.address, publicClient, walletClient, env: resolvedEnv };
};
