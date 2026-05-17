# Installation

## Requirements

- Node.js ≥ 20
- A funded wallet on Filecoin (mainnet or Calibration testnet)
- Alkahest escrow contract deployment
- IPFS Pinning Service API endpoint (web3.storage, Storacha, etc.)

## Install from NPM

```bash
npm install kard
```

## Install from source

```bash
git clone https://github.com/yourusername/kard.git
cd kard
npm install
npm run build
```

## Verify installation

```bash
npm run typecheck
npm test
```

## Peer dependencies

Kard uses these production dependencies:

| Package | Purpose |
|---|---|
| `viem` | Ethereum/Filecoin interactions |
| `helia` | IPFS content addressing |
| `@helia/json` | JSON storage on IPFS |
| `@helia/unixfs` | File storage on IPFS |
| `multiformats` | CID handling |
| `zod` | Runtime type validation |
| `pino` | Structured logging |

All dependencies are pinned to specific major versions for stability.
