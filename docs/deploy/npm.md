# Publishing to NPM

## Build

```bash
npm run clean
npm run build
```

This compiles TypeScript to `dist/src/` with full type declarations and source maps.

## Verify build

```bash
ls dist/src/index.js
ls dist/src/index.d.ts
```

## Publish

```bash
npm publish
```

The package ships:
- `dist/src/` — compiled JavaScript + type declarations
- `README.md`
- `LICENSE`
- `.env.example`
- `CHANGELOG.md`

## Package exports

Users can import from the main entrypoint or sub-paths:

```ts
// Main
import { Kard } from "kard";

// Sub-paths
import { AlkahestEscrow } from "kard/escrow";
import { OpenClaw } from "kard/orchestrator";
import { AomiRuntime } from "kard/execution";
import { FilecoinPinClient } from "kard/memory";
```

## Versioning

Follow semver:
- `1.x.x` — current stable protocol (v1 schemas)
- Breaking changes → major version bump
- New features → minor version bump
- Bug fixes → patch version bump

## Hosting docs on Vercel

```bash
npm run docs:build
```

Deploy the `docs/.vitepress/dist` directory to Vercel:

1. Connect your repo to Vercel
2. Set build command: `npm run docs:build`
3. Set output directory: `docs/.vitepress/dist`
4. Deploy
