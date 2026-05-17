/**
 * SDK Configuration — All protocol parameters are programmatically configurable.
 * No hidden env-var dependencies. Users pass config explicitly.
 */
import type { Address, Hex } from "viem";
import type { Chain } from "viem";
import type { FilecoinPinConfig } from "../memory/filecoin-pin.js";
import type { SmartAccountConfig } from "../execution/smart-account.js";

// ─── Chain Configuration ────────────────────────────────────────────────────

export interface ChainConfig {
  /** Chain ID (314 = Filecoin Mainnet, 314159 = Calibration) */
  chainId: number;
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Optional custom chain definition (auto-resolved from chainId if omitted) */
  chain?: Chain;
}

// ─── Escrow Configuration ───────────────────────────────────────────────────

export interface AlkahestConfig {
  /** Alkahest escrow contract address (REQUIRED for onchain operation) */
  escrowAddress: Address;
  /** Arbiter contract or trusted party address */
  arbiterAddress: Address;
  /** ERC-20 token address (zero address = native token) */
  token?: Address;
  /** Dispute window in seconds (default: 3600) */
  disputeWindowSeconds?: number;
  /** Expiration buffer beyond agreement duration (default: 7200) */
  expirationBufferSeconds?: number;
}

// ─── Agent Keys ─────────────────────────────────────────────────────────────

export interface AgentKeys {
  /** Buyer agent private key */
  buyerPrivateKey?: Hex;
  /** Seller/provider agent private key */
  sellerPrivateKey?: Hex;
  /** Arbiter agent private key */
  arbiterPrivateKey?: Hex;
}

// ─── Full SDK Configuration ─────────────────────────────────────────────────

export interface KardSDKConfig {
  /** Chain configuration (REQUIRED) */
  chain: ChainConfig;
  /** Alkahest escrow configuration (REQUIRED for settlement) */
  escrow: AlkahestConfig;
  /** Filecoin Pin configuration (REQUIRED for persistent storage) */
  filecoinPin: FilecoinPinConfig;
  /** Smart account configuration (enables account abstraction) */
  smartAccount?: SmartAccountConfig;
  /** Agent private keys (alternative to passing wallets directly) */
  keys?: AgentKeys;
  /** Log level (default: "info") */
  logLevel?: "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent";
}

// ─── Config from Environment (convenience helper) ───────────────────────────

/**
 * Load configuration from environment variables.
 */
export function loadConfigFromEnv(): KardSDKConfig {
  const requireEnv = (key: string): string => {
    const val = process.env[key];
    if (!val || val.length === 0) throw new Error(`missing required env var: ${key}`);
    return val;
  };

  const optEnv = (key: string): string | undefined => {
    const val = process.env[key];
    return val && val.length > 0 ? val : undefined;
  };

  return {
    chain: {
      chainId: Number(requireEnv("CHAIN_ID")),
      rpcUrl: requireEnv("RPC_URL"),
    },
    escrow: {
      escrowAddress: requireEnv("ALKAHEST_ESCROW") as Address,
      arbiterAddress: requireEnv("ALKAHEST_ARBITER_TRUSTED_PARTY") as Address,
      token: optEnv("ESCROW_TOKEN") as Address | undefined,
      disputeWindowSeconds: optEnv("DISPUTE_WINDOW_SECONDS") ? Number(optEnv("DISPUTE_WINDOW_SECONDS")) : undefined,
    },
    filecoinPin: {
      endpoint: requireEnv("FILECOIN_PIN_ENDPOINT"),
      token: requireEnv("FILECOIN_PIN_TOKEN"),
      pollIntervalMs: optEnv("FILECOIN_PIN_POLL_MS") ? Number(optEnv("FILECOIN_PIN_POLL_MS")) : undefined,
      pollTimeoutMs: optEnv("FILECOIN_PIN_TIMEOUT_MS") ? Number(optEnv("FILECOIN_PIN_TIMEOUT_MS")) : undefined,
    },
    smartAccount: optEnv("AA_SMART_ACCOUNT") ? {
      address: optEnv("AA_SMART_ACCOUNT") as Address,
      bundlerUrl: optEnv("AA_BUNDLER_URL"),
      entryPoint: optEnv("AA_ENTRYPOINT") as Address | undefined,
    } : undefined,
    keys: {
      buyerPrivateKey: optEnv("BUYER_PK") as Hex | undefined,
      sellerPrivateKey: optEnv("SELLER_PK") as Hex | undefined,
      arbiterPrivateKey: optEnv("ARBITER_PK") as Hex | undefined,
    },
    logLevel: (optEnv("LOG_LEVEL") as KardSDKConfig["logLevel"]) ?? "info",
  };
}
