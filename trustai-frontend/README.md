# TrustAI — Frontend Application

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?style=flat&logo=React&logoColor=white)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5.3.4-646CFF.svg?style=flat&logo=Vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.6-38B2AC.svg?style=flat&logo=TailwindCSS&logoColor=white)](https://tailwindcss.com)
[![X402 Protocol](https://img.shields.io/badge/X402-Web3%20Wallet%20Ready-0052FF.svg)](https://x402.org)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-000000.svg?logo=vercel&logoColor=white)](https://vercel.com)

Interactive web client for TrustAI — digital media and document authenticity verification platform. Features a modern dark/light UI, live multi-layer forensic results with interactive Error Level Analysis (ELA) heatmaps, Web3 wallet connection, and native **X402 Web3 micropayments**.

---

## Key Features

- **Interactive Verification Studio (`/check`)**:
  - Drag-and-drop intake for images (JPG, PNG, WEBP), scanned documents, and PDFs.
  - Multi-layer analysis progress indicator with real-time signal breakdown.
- **Detailed Forensic Reports (`/results/:id`)**:
  - Overall tamper risk score & bucket stamp (Low, Medium, High).
  - EXIF metadata tampering alerts and visual artifact signals.
  - Interactive ELA visual hotzones rendered directly over images.
  - Tamper-evident blockchain ledger receipt verification.
  - 1-Click PDF evidence report export.
- **X402 Web3 Protocol & Wallet Integration (`/pricing`, `/checkout`, `/wallet`)**:
  - Support for MetaMask, Coinbase Wallet, Phantom, and an instant Devnet Sandbox Wallet with testnet faucet.
  - 1-Click crypto payments for subscriptions ($4.99 USDC) and on-demand micro-scans ($0.10 USDC) on Base L2, Solana, Ethereum, and Polygon.
  - Dual checkout options: Web3 (x402 protocol) and Fiat (Cards/UPI via Razorpay).
  - In-app wallet management and verified blockchain transaction audit ledger.

---

## Local Development

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or pnpm / yarn

### 2. Install Dependencies
```bash
cd trustai-frontend
npm install
```

### 3. Environment Setup
Create a `.env` file (or copy `.env.example`):
```bash
cp .env.example .env
```
Contents:
```ini
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:8000
```

### 4. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in `dist/`.

---

## Deployment on Vercel

### Step-by-Step Vercel Deployment

1. **Push your code to GitHub**.
2. Log in to [Vercel](https://vercel.com) and click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `trustai-frontend` (if deploying from monorepo) or `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://your-backend-app.onrender.com`
6. Click **Deploy**.

> [!NOTE]
> `vercel.json` is already included in `trustai-frontend/vercel.json` with SPA routing rewrites and security headers, ensuring all direct client-side routes (`/check`, `/pricing`, `/checkout`, `/wallet`, `/subscription`) work cleanly upon reload without 404s.

---

## Project Structure

```
src/
├── api/                     # Backend API client integrations
│   └── verifyApi.js         # Document and image verification service
├── components/              # Reusable UI elements
│   ├── AuthGateModal.jsx    # Authentication modal
│   ├── BlockchainReceipt.jsx# Ledger proof display
│   ├── Dropzone.jsx         # Drag-and-drop file uploader
│   ├── ImageHotzoneOverlay  # Interactive ELA visual overlay
│   ├── Navbar.jsx           # Main navigation bar with Web3 wallet pill
│   ├── WalletConnectModal   # Web3 network & wallet connection modal
│   └── landing/             # Marketing landing page components
├── context/                 # Application state providers
│   ├── AuthContext.jsx      # User authentication & session management
│   ├── ThemeContext.jsx     # Dark/light theme state
│   └── WalletContext.jsx    # Web3 & x402 wallet connection state
├── pages/                   # Application views & routes
│   ├── LandingPage.jsx      # Marketing homepage
│   ├── PricingPage.jsx      # Pricing plans with x402 toggle
│   ├── CheckoutPage.jsx     # Dual-mode checkout (x402 & Razorpay)
│   ├── WalletPage.jsx       # Web3 wallet dashboard & x402 tester
│   ├── UploadPage.jsx       # Document & media verification
│   ├── ResultsPage.jsx      # Forensic analysis report
│   ├── HistoryPage.jsx      # Case search and log
│   └── SubscriptionPage.jsx # Account billing management
└── utils/                   # Helper functions, x402 protocol, and PDF generator
```
