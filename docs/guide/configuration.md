# Configuration

Kard is fully configurable via the SDK. All infrastructure parameters are passed explicitly — no hidden env-var dependencies.

## Programmatic configuration (recommended)

```ts
import { Kard, type KardSDKConfig } from "kard-ai";

const config: KardSDKConfig = {
  chain: {
    chainId: 314,
    rpcUrl: "https://api.node.glif.io/rpc/v1",
  },
  escrow: {
    escrowAddress: "0xYOUR_ALKAHEST_ESCROW",
    arbiterAddress: "0xYOUR_ARBITER_ADDRESS",
    token: "0x0000000000000000000000000000000000000000", // native FIL
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
};

const kard = await Kard.create({ sdk: config });
```

## Environment variable configuration

For convenience, you can load config from env vars:

```ts
import { Kard } from "kard-ai";

const kard = await Kard.fromEnv();
```

### Required variables

```env
# Chain
CHAIN_ID=314
RPC_URL=https://api.node.glif.io/rpc/v1

# Alkahest Escrow
ALKAHEST_ESCROW=0x...
ALKAHEST_ARBITER_TRUSTED_PARTY=0x...

# Filecoin Pin
FILECOIN_PIN_ENDPOINT=https://api.web3.storage/pins
FILECOIN_PIN_TOKEN=your-token

# Agent Keys (funded with FIL)
BUYER_PK=0x...
SELLER_PK=0x...
ARBITER_PK=0x...
```

### Optional variables

```env
# Smart Account
AA_SMART_ACCOUNT=0x...
AA_BUNDLER_URL=https://bundler.example/rpc
AA_ENTRYPOINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# Escrow tuning
ESCROW_TOKEN=0x0000000000000000000000000000000000000000
DISPUTE_WINDOW_SECONDS=3600

# Logging
LOG_LEVEL=info
```

## Chain support

| Chain | ID | RPC |
|---|---|---|
| Filecoin Mainnet | 314 | `https://api.node.glif.io/rpc/v1` |
| Filecoin Calibration | 314159 | `https://api.calibration.node.glif.io/rpc/v1` |
| Base Sepolia | 84532 | `https://sepolia.base.org` |
| Sepolia | 11155111 | `https://rpc.sepolia.org` |

Custom chains are supported by passing a full `chain` definition in the config.

## Wallet creation

```ts
import { createAgentWallet, resolveChainEnv } from "kard-ai";

const chainEnv = resolveChainEnv({
  chainId: 314,
  rpcUrl: "https://api.node.glif.io/rpc/v1",
});

const wallet = createAgentWallet("0xYOUR_PRIVATE_KEY", chainEnv);
console.log(wallet.address); // agent's onchain address
```
