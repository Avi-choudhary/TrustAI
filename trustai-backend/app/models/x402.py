from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class X402Payment(Base):
    __tablename__ = "x402_payments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    order_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=True,
    )

    payer_address: Mapped[str] = mapped_column(
        String(128),
        index=True,
        nullable=False,
    )

    pay_to_address: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )

    network: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="eip155:8453",
    )

    asset: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="USDC",
    )

    amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="USDC",
    )

    plan: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="PREMIUM",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="SETTLED",
    )

    tx_hash: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
    )

    signature: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    blockchain_block_hash: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )

    blockchain_block_index: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    settled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
