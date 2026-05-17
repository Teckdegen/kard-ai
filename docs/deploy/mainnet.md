# Filecoin Mainnet Deployment

## Prerequisites

1. Funded wallet with FIL on Filecoin Mainnet (chain ID 314)
2. Deployed Alkahest escrow contracts
3. IPFS Pinning Service API endpoint with valid token
4. Node.js ≥ 20

## Configuration

```env
CHAIN_ID=314
RPC_URL=https://api.node.glif.io/rpc/v1
ALKAHEST_ESCROW=0xYOUR_DEPLOYED_ESCROW
ALKAHEST_ARBITER_TRUSTED_PARTY=0xYOUR_ARBITER
FILECOIN_PIN_ENDPOINT=https://api.web3.storage/pins
FILECOIN_PIN_TOKEN=your-production-token
BUYER_PK=0xYOUR_FUNDED_BUYER_KEY
SELLER_PK=0xYOUR_FUNDED_SELLER_KEY
ARBITER_PK=0xYOUR_ARBITER_KEY
```

## Verify connectivity

```ts
import { createAgentWallet, resolveChainEnv } from "kard";

const env = resolveChainEnv({ chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" });
const wallet = createAgentWallet("0xYOUR_KEY", env);

const balance = await wallet.publicClient.getBalance({ address: wallet.address });
console.log(`Balance: ${balance} attoFIL`);
```

## Deploy Alkahest contracts

See the [Alkahest documentation](https://github.com/arkhai-labs/alkahest) for contract deployment instructions.

## Run

```ts
import { Kard } from "kard";

const kard = await Kard.fromEnv();
// All operations are now live on Filecoin Mainnet
```
