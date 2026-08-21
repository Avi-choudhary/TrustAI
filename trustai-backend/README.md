# TrustAI — Backend API

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://python.org)
[![X402 Protocol](https://img.shields.io/badge/X402-Protocol%20v1.0-0052FF.svg)](https://x402.org)
[![Deploy on Render](https://img.shields.io/badge/Deploy-Render-46E3B7.svg?logo=render&logoColor=white)](https://render.com)

High-performance Python backend powering the TrustAI document and AI-generated media verification platform. Integrates multi-layer forensic analysis (EXIF metadata, Error Level Analysis, OCR layout heuristics, Gemini visual inspection, and deepfake screening), an immutable local blockchain audit ledger, and internet-native **X402 Web3 payment protocol** micropayments.

---

## Features

- **Document & Image Verification**:
  - `POST /api/verify/document`: Multi-layer PDF and document forgery analysis.
  - `POST /api/verify/image`: Error Level Analysis (ELA), EXIF tampering, and AI generation screening.
- **X402 Web3 Payment Protocol**:
  - `GET /api/x402/config`: Gateway specifications and accepted blockchain networks (Base, Ethereum, Polygon, Solana, Devnet).
  - `POST /api/x402/challenge`: Returns standard `HTTP 402 Payment Required` challenge with `PAYMENT-REQUIRED` headers.
  - `POST /api/x402/settle`: Verifies client cryptographic authorizations (`X-Payment`), upgrades subscription tier, and returns `X-PAYMENT-RESPONSE`.
  - `GET /api/x402/history`: User transaction audit history.
  - `GET /api/x402/verify-receipt/{tx_hash}`: Public on-chain verification proof.
- **Tamper-Evident Blockchain Ledger**:
  - SHA-256 hash chaining with proof-of-work minting verification receipts (`/blockchain/verify/{hash}`).
- **Authentication & Subscription**:
  - Argon2 password hashing + JWT session authentication (`/api/auth/register`, `/api/auth/login`).
  - Dual payment support: Web3 x402 Protocol (USDC) and Fiat Cards/UPI (Razorpay).

---

## Local Development

### 1. Prerequisites
- Python 3.10 or higher
- pip & virtualenv

### 2. Setup Virtual Environment & Install Dependencies
```bash
# Navigate to backend directory
cd trustai-backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
Key configuration settings in `.env`:
```ini
PORT=8000
PUBLIC_BASE_URL=http://localhost:8000
DATABASE_URL=sqlite:///./trustai.db
JWT_SECRET_KEY=your_super_secret_jwt_key_here
X402_MERCHANT_ADDRESS=0x71C8366420A0926793fe14b17bEE06941866420A
```

### 4. Run the Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API will be accessible at: `http://localhost:8000`
- Interactive Swagger UI documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 5. Run Automated Tests
```bash
python test_x402_integration.py
```

---

## Deployment on Render

### Method 1: Using Render Blueprint (`render.yaml`) — Recommended
1. Push your repository to GitHub.
2. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically read `render.yaml` and configure the `trustai-backend` web service.

### Method 2: Manual Web Service on Render
1. In Render Dashboard, click **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name**: `trustai-backend`
   - **Root Directory**: `trustai-backend`
   - **Environment**: `Python` (or `Docker`)
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Add the following **Environment Variables** in the Render dashboard:
   - `PYTHON_VERSION`: `3.10.12`
   - `PUBLIC_BASE_URL`: `https://your-backend-name.onrender.com`
   - `JWT_SECRET_KEY`: *(generate a long random 32-character string)*
   - `CORS_ORIGINS`: `https://your-frontend.vercel.app,http://localhost:5173`
   - `X402_MERCHANT_ADDRESS`: `0x71C8366420A0926793fe14b17bEE06941866420A`
5. Click **Create Web Service**.

---

## API Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/` | API status and root documentation links | No |
| `GET` | `/health` | Service health check | No |
| `POST` | `/api/auth/register` | Create a new user account | No |
| `POST` | `/api/auth/login` | Login and receive JWT access token | No |
| `POST` | `/api/verify/document` | Run document tampering & OCR forensics | Yes |
| `POST` | `/api/verify/image` | Run image ELA & EXIF forensics | Yes |
| `GET` | `/api/x402/config` | Get X402 payment gateway specifications | No |
| `POST` | `/api/x402/challenge` | Issue HTTP 402 Payment Required challenge | Optional |
| `POST` | `/api/x402/settle` | Settle payment and upgrade plan tier | Optional |
| `GET` | `/api/x402/history` | Get user's X402 transaction history | Yes |
| `GET` | `/api/x402/verify-receipt/{tx_hash}` | Public blockchain audit receipt verification | No |
| `GET` | `/blockchain/summary` | Tamper-evident ledger status & block count | No |
| `GET` | `/blockchain/verify/{hash}` | Verify specific document hash on ledger | No |
