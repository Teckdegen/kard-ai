# Installation

## Install Kard

```bash
npm install kard-ai
```

## Requirements

- Node.js 20 or higher
- A funded wallet on Filecoin (mainnet or Calibration testnet)
- Deployed Alkahest escrow contracts
- An IPFS Pinning Service API endpoint (web3.storage, Storacha, etc.)

## Verify

```ts
import { Kard } from "kard-ai";

// If this imports without error, you're good
console.log("Kard installed");
```
