import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Kard",
  description: "Trust infrastructure for autonomous economies.",
  appearance: "dark",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
  ],
  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "Kard",
    nav: [],
    sidebar: {
      "/guide/": [
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
            { text: "Proofs and Verification", link: "/layers/proofs" },
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
          ],
        },
      ],
      "/concepts/": "auto",
      "/layers/": "auto",
      "/api/": "auto",
      "/deploy/": "auto",
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/Teckdegen/kard-ai" },
    ],
    search: {
      provider: "local",
    },
  },
});
