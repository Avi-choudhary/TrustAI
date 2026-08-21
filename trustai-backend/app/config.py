"""
Central configuration for TrustAI Backend.
Reads from environment variables (via .env in local dev and environment variables in Render/production).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Allowed frontend origins for CORS. Supports JSON list or comma-separated string.
    cors_origins: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://trustai.vercel.app",
    ]

    # Where uploaded files are persisted on disk.
    storage_dir: Path = BASE_DIR / "storage"
    upload_dir: Path = BASE_DIR / "storage" / "uploads"

    # Base URL this API is served from — used to build previewUrl.
    public_base_url: str = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:8000")

    # Database URL (SQLite locally, PostgreSQL on Render/production)
    database_url: str = "sqlite:///./trustai.db"

    # JWT authentication
    jwt_secret_key: str = "default_secret_key_change_in_production_32bytes_long"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # Razorpay Payment Gateway (Optional / Fiat)
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""

    # Sightengine cloud API creds (Optional, used by deepfake_service Layer 4)
    sightengine_api_user: str = ""
    sightengine_api_secret: str = ""

    # Gemini API Key (Optional, used by gemini_forensics Layer)
    gemini_api_key: str = ""

    # X402 Payment Protocol Configuration (Web3 Micropayments)
    x402_merchant_address: str = "0x71C8366420A0926793fe14b17bEE06941866420A"
    x402_facilitator_url: str = "https://facilitator.x402.org"
    x402_default_network: str = "eip155:8453"  # Base
    x402_usdc_price_premium: float = 4.99     # 3-Month Plan in USDC (~₹399)
    x402_usdc_price_scan: float = 0.10        # Per-scan micropayment in USDC

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Fix Render's postgres:// prefix for SQLAlchemy 2.0."""
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[List[str], str]) -> List[str]:
        """Support comma-separated strings for CORS_ORIGINS."""
        if isinstance(v, str):
            # Check if JSON format or comma-separated
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()

# Ensure storage directories exist
settings.storage_dir.mkdir(parents=True, exist_ok=True)
settings.upload_dir.mkdir(parents=True, exist_ok=True)
