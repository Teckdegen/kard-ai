# Configuration

Kard requires real onchain infrastructure. Every parameter is required.

## Option 1: Programmatic config

```ts
import { Kard } from "kard-ai";

const kard = await Kard.create({
  sdk: {
    chain: {
      chainId: 314,
      rpcUrl: "https://api.node.glif.io/rpc/v1",
    },
    escrow: {
      escrowAddress: "0xYOUR_ALKAHEST_ESCROW",
      arbiterAddress: "0xYOUR_ARBITER",
      token: "0x0000000000000000000000000000000000000000",
      disputeWindowSeconds: 3600,
    },
    filecoinPin: {
      endpoint: "https://api.web3.storage/pins",
      token: "your-bearer-token",
      pollIntervalMs: 2000,
      pollTimeoutMs: 120000,
    },
    smartAccount: {
      address: "0xYOUR_SMART_ACCOUNT",
      bundlerUrl: "https://bundler.example/rpc",
      entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    },
    logLevel: "info",
  },
});
```

## Option 2: Environment variables

```ts
import { Kard } from "kard-ai";

const kard = await Kard.fromEnv();
```

Create a `.env` file with these values:

```env
# Chain
CHAIN_ID=314
RPC_URL=https://api.node.glif.io/rpc/v1

# Alkahest Escrow
ALKAHEST_ESCROW=0x...
ALKAHEST_ARBITER_TRUSTED_PARTY=0x...
ESCROW_TOKEN=0x0000000000000000000000000000000000000000
DISPUTE_WINDOW_SECONDS=3600

# Filecoin Pin
FILECOIN_PIN_ENDPOINT=https://api.web3.storage/pins
FILECOIN_PIN_TOKEN=your-token
FILECOIN_PIN_POLL_MS=2000
FILECOIN_PIN_TIMEOUT_MS=120000

# Agent Keys (funded with FIL)
BUYER_PK=0x...
SELLER_PK=0x...
ARBITER_PK=0x...

# Smart Account
AA_SMART_ACCOUNT=0x...
AA_BUNDLER_URL=https://bundler.example/rpc
AA_ENTRYPOINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# Logging
LOG_LEVEL=info
```

## Supported chains

| Chain | ID | RPC |
|---|---|---|
| Filecoin Mainnet | 314 | `https://api.node.glif.io/rpc/v1` |
| Filecoin Calibration | 314159 | `https://api.calibration.node.glif.io/rpc/v1` |

## Creating wallets

```ts
import { createAgentWallet, resolveChainEnv } from "kard-ai";

const env = resolveChainEnv({ chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" });
const wallet = createAgentWallet("0xYOUR_PRIVATE_KEY", env);

console.log(wallet.address); // your agent's onchain address
```
