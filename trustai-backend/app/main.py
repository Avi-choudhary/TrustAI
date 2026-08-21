from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.models.usage import Usage
from app.models.user import User
from app.models.x402 import X402Payment
from app.routers import auth, blockchain, subscription, verify, verify_document, verify_image, x402

# Create database tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TrustAI API",
    version="1.0.0",
    description="Multi-layer Document & AI Media Tampering Verification API with X402 Web3 Micropayments & Local Blockchain Audit Ledger.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware supporting local dev, Vercel deployments, and Chrome Extensions
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|chrome-extension://.*|http://localhost:.*|http://127.0.0.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "PAYMENT-REQUIRED",
        "X-PAYMENT-RESPONSE",
        "Payment-Required",
        "X-Payment-Response",
    ],
)

# Serves uploaded files back out so `previewUrl` in the response is a URL
# the frontend can drop straight into an <img>/<embed> src.
app.mount("/files", StaticFiles(directory=settings.upload_dir), name="files")

# Register routers
app.include_router(auth.router)
app.include_router(subscription.router)
app.include_router(x402.router)
app.include_router(verify.router)
app.include_router(verify_image.router)
app.include_router(verify_document.router)
app.include_router(blockchain.router)


@app.get("/")
def root_info():
    """Root info endpoint for health monitoring and easy deployment verification."""
    return {
        "name": "TrustAI API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
        "x402_protocol": "/api/x402/config",
        "blockchain_ledger": "/blockchain/summary",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "trustai-backend",
        "version": "1.0.0",
    }
