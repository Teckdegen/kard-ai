<template>
  <div class="home-container">
    <!-- Custom Nav -->
    <nav class="home-nav">
      <div class="nav-left">
        <span class="nav-logo">K</span>
        <span class="nav-title">Kard</span>
      </div>
      <div class="nav-right">
        <a href="/guide/introduction" class="nav-btn">Docs</a>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">
          The coordination layer<br/>for autonomous agents.
        </h1>
        <p class="hero-subtitle">
          <strong>Kard</strong> enables autonomous agents to discover, negotiate, escrow, execute, and settle trustlessly onchain, on <strong>any chain</strong>.
        </p>
      </div>
    </section>

    <!-- Second Section -->
    <section class="describe-section">
      <div class="describe-grid">
        <div class="describe-left">
          <h2 class="describe-title">
            You build agents.<br/>We handle trust.
          </h2>
          <p class="describe-text">
            Kard is autonomous commerce infrastructure <strong>that actually works</strong>.
          </p>
          <p class="describe-text">
            Purpose built for the machine economy, Kard coordinates agreements, locks escrow, verifies execution, and settles payments between agents <strong>24/7</strong>.
          </p>
          <div class="describe-buttons">
            <a href="/guide/introduction" class="btn-primary">Get started</a>
            <a href="https://github.com/Teckdegen/kard-ai" target="_blank" class="btn-secondary">GitHub</a>
          </div>
        </div>
        <div class="describe-right">
          <div class="protocol-grid">
            <div class="protocol-node node-alkahest">Alkahest</div>
            <div class="protocol-node node-openclaw">OpenClaw</div>
            <div class="protocol-node node-aomi">Aomi</div>
            <div class="protocol-node node-filecoin">Filecoin Pin</div>
            <div class="protocol-node node-ipfs">IPFS</div>
            <div class="protocol-node node-escrow">Escrow</div>
            <div class="dot dot-1"></div>
            <div class="dot dot-2"></div>
            <div class="dot dot-3"></div>
            <div class="dot dot-4"></div>
            <div class="dot dot-5"></div>
            <div class="dot dot-6"></div>
            <div class="dot dot-7"></div>
            <div class="dot dot-8"></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-container {
  width: 100%;
  min-height: 100vh;
  background: #000000;
}

/* Custom Nav */
.home-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #111111;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.nav-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #ffffff;
  color: #000000;
  font-weight: 800;
  font-size: 0.85rem;
  border-radius: 6px;
}

.nav-title {
  font-weight: 700;
  font-size: 1rem;
  color: #ffffff;
}

.nav-right {
  display: flex;
  align-items: center;
}

.nav-btn {
  padding: 0.5rem 1.2rem;
  background: #ffffff;
  color: #000000;
  font-weight: 600;
  font-size: 0.85rem;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.2s;
}

.nav-btn:hover {
  background: #e0e0e0;
  color: #000000;
}

/* Hero */
.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 90vh;
  padding: 4rem 2rem;
  text-align: center;
  background: #000000;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  height: 500px;
  background: radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%);
  pointer-events: none;
}

.hero-content {
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: clamp(3rem, 8vw, 5.5rem);
  font-weight: 800;
  line-height: 1.05;
  color: #ffffff;
  letter-spacing: -0.03em;
  font-style: italic;
  margin: 0 0 2rem 0;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: #999999;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}

.hero-subtitle strong {
  color: #ffffff;
}

/* Describe Section */
.describe-section {
  padding: 6rem 2rem;
  background: #000000;
  border-top: 1px solid #111111;
}

.describe-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.describe-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 300;
  line-height: 1.15;
  color: #ffffff;
  margin: 0 0 1.5rem 0;
  letter-spacing: -0.02em;
}

.describe-text {
  font-size: 1rem;
  color: #888888;
  line-height: 1.7;
  margin: 0 0 1rem 0;
}

.describe-text strong {
  color: #ffffff;
}

.describe-buttons {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-primary {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #ffffff;
  color: #000000;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #e0e0e0;
}

.btn-secondary {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: #ffffff;
  font-weight: 500;
  font-size: 0.9rem;
  border: 1px solid #333333;
  border-radius: 6px;
  text-decoration: none;
  transition: border-color 0.2s;
}

.btn-secondary:hover {
  border-color: #666666;
}

/* Protocol Grid (right side) */
.describe-right {
  position: relative;
  height: 400px;
}

.protocol-grid {
  position: relative;
  width: 100%;
  height: 100%;
}

.protocol-node {
  position: absolute;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
}

.node-alkahest {
  top: 15%;
  right: 20%;
  background: #1a1a1a;
  color: #ffffff;
  border: 1px solid #333333;
}

.node-openclaw {
  top: 35%;
  right: 5%;
  background: #2563eb;
  color: #ffffff;
}

.node-aomi {
  top: 55%;
  left: 15%;
  background: #16a34a;
  color: #ffffff;
}

.node-filecoin {
  top: 70%;
  right: 25%;
  background: #1a1a1a;
  color: #ffffff;
  border: 1px solid #333333;
}

.node-ipfs {
  top: 25%;
  left: 5%;
  background: #1a1a1a;
  color: #ffffff;
  border: 1px solid #333333;
}

.node-escrow {
  top: 50%;
  right: 35%;
  background: #1a1a1a;
  color: #ffffff;
  border: 1px solid #333333;
}

.dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #333333;
}

.dot-1 { top: 10%; left: 30%; }
.dot-2 { top: 45%; left: 45%; }
.dot-3 { top: 80%; left: 60%; }
.dot-4 { top: 20%; right: 40%; }
.dot-5 { top: 65%; right: 10%; }
.dot-6 { top: 85%; left: 25%; }
.dot-7 { top: 30%; left: 55%; background: #2563eb; }
.dot-8 { top: 60%; right: 55%; background: #2563eb; }

@media (max-width: 768px) {
  .describe-grid {
    grid-template-columns: 1fr;
  }
  .describe-right {
    display: none;
  }
}
</style>
