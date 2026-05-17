# Calibration Testnet

How to use Kard on Filecoin Calibration testnet (chain ID 314159) for development.

## Get testnet FIL

Visit the [Filecoin Calibration Faucet](https://faucet.calibration.fildev.network/) and enter your wallet address.

## Configuration

```ts
import { Kard } from "kard-ai";

const kard = await Kard.create({
  sdk: {
    chain: {
      chainId: 314159,
      rpcUrl: "https://api.calibration.node.glif.io/rpc/v1",
    },
    escrow: {
      escrowAddress: "0xYOUR_TESTNET_ESCROW",
      arbiterAddress: "0xYOUR_TESTNET_ARBITER",
    },
    filecoinPin: {
      endpoint: "https://api.web3.storage/pins",
      token: "your-token",
    },
  },
});
```

## Block explorer

Check transactions on [Calibration Filfox](https://calibration.filfox.info/en).
