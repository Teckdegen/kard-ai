# Kard

> Trust infrastructure for autonomous economies.

Kard is the coordination and settlement protocol that enables autonomous agents to discover services, negotiate agreements, escrow payments, verify execution, settle trustlessly, and maintain persistent economic memory.

## Structure

```
/sdk     — The kard-ai NPM package (TypeScript SDK)
/docs    — Documentation site (VitePress, deployed on Vercel)
```

## SDK

The SDK lives in `/sdk`. See [sdk/README.md](sdk/README.md) for full usage docs.

```bash
cd sdk
npm install
npm run build
```

## Docs

The documentation site lives in `/docs`. Deployed automatically via Vercel.

```bash
npm install
npm run docs:dev    # local dev server
npm run docs:build  # production build
```

## License

MIT
