# Calibration Testnet Deployment

## Get testnet FIL

1. Visit the [Filecoin Calibration Faucet](https://faucet.calibration.fildev.network/)
2. Enter your wallet address
3. Receive tFIL for testing

## Configuration

```env
CHAIN_ID=314159
RPC_URL=https://api.calibration.node.glif.io/rpc/v1
ALKAHEST_ESCROW=0xYOUR_TESTNET_ESCROW
ALKAHEST_ARBITER_TRUSTED_PARTY=0xYOUR_TESTNET_ARBITER
FILECOIN_PIN_ENDPOINT=https://api.web3.storage/pins
FILECOIN_PIN_TOKEN=your-token
BUYER_PK=0xYOUR_TESTNET_BUYER_KEY
SELLER_PK=0xYOUR_TESTNET_SELLER_KEY
ARBITER_PK=0xYOUR_TESTNET_ARBITER_KEY
```

## Run

```ts
import { Kard } from "kard";

const kard = await Kard.fromEnv();
// Operations run on Filecoin Calibration testnet
```

## Verify

Check transactions on [Calibration Filfox](https://calibration.filfox.info/en).
