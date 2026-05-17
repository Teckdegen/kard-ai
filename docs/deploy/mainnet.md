# Filecoin Mainnet

How to use Kard on Filecoin Mainnet (chain ID 314).

## Prerequisites

1. Wallets funded with FIL
2. Deployed Alkahest escrow contracts on Filecoin
3. An IPFS Pinning Service API endpoint with a valid token

## Configuration

```ts
import { Kard } from "kard-ai";

const kard = await Kard.create({
  sdk: {
    chain: {
      chainId: 314,
      rpcUrl: "https://api.node.glif.io/rpc/v1",
    },
    escrow: {
      escrowAddress: "0xYOUR_ESCROW_CONTRACT",
      arbiterAddress: "0xYOUR_ARBITER",
    },
    filecoinPin: {
      endpoint: "https://api.web3.storage/pins",
      token: "your-production-token",
    },
  },
});
```

## Verify connectivity

```ts
import { createAgentWallet, resolveChainEnv } from "kard-ai";

const env = resolveChainEnv({ chainId: 314, rpcUrl: "https://api.node.glif.io/rpc/v1" });
const wallet = createAgentWallet("0xYOUR_KEY", env);

const balance = await wallet.publicClient.getBalance({ address: wallet.address });
console.log(`Balance: ${balance} attoFIL`);
```

## Block explorer

Check transactions on [Filfox](https://filfox.info/en).
