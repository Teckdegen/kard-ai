import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Kard",
  description: "Trust infrastructure for autonomous economies.",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
  ],
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Guide", link: "/guide/introduction" },
      { text: "API", link: "/api/overview" },
      { text: "GitHub", link: "https://github.com/yourusername/kard" },
      { text: "NPM", link: "https://www.npmjs.com/package/kard" },
    ],
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Introduction", link: "/guide/introduction" },
          { text: "Installation", link: "/guide/installation" },
          { text: "Configuration", link: "/guide/configuration" },
          { text: "Quick Start", link: "/guide/quickstart" },
        ],
      },
      {
        text: "Core Concepts",
        items: [
          { text: "Architecture", link: "/concepts/architecture" },
          { text: "Protocol Flow", link: "/concepts/protocol-flow" },
          { text: "Security Model", link: "/concepts/security" },
          { text: "Event Sourcing", link: "/concepts/events" },
        ],
      },
      {
        text: "Protocol Layers",
        items: [
          { text: "Alkahest Escrow", link: "/layers/escrow" },
          { text: "OpenClaw Orchestration", link: "/layers/orchestration" },
          { text: "Aomi Execution", link: "/layers/execution" },
          { text: "Filecoin Memory", link: "/layers/memory" },
          { text: "Proofs & Verification", link: "/layers/proofs" },
          { text: "Arbitration", link: "/layers/arbitration" },
          { text: "Reputation", link: "/layers/reputation" },
          { text: "Swarm Economies", link: "/layers/swarm" },
        ],
      },
      {
        text: "API Reference",
        items: [
          { text: "Overview", link: "/api/overview" },
          { text: "Kard", link: "/api/kard" },
          { text: "Escrow", link: "/api/escrow" },
          { text: "Execution", link: "/api/execution" },
          { text: "Orchestrator", link: "/api/orchestrator" },
          { text: "Memory", link: "/api/memory" },
        ],
      },
      {
        text: "Deployment",
        items: [
          { text: "Filecoin Mainnet", link: "/deploy/mainnet" },
          { text: "Calibration Testnet", link: "/deploy/testnet" },
          { text: "Publishing to NPM", link: "/deploy/npm" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/yourusername/kard" },
    ],
    footer: {
      message: "MIT Licensed",
      copyright: "Kard Protocol",
    },
    search: {
      provider: "local",
    },
  },
});
