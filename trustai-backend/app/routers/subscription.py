from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.payment_service import (
    create_razorpay_order,
    verify_payment_signature,
)

router = APIRouter(
    prefix="/api/subscription",
    tags=["subscription"],
)


PLAN_AMOUNT = 39900  # ₹399 in paise
PLAN_CURRENCY = "INR"
PLAN_DURATION_DAYS = 90


class PaymentVerificationRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/create-order")
def create_order(
    current_user: User = Depends(get_current_user),
):
    """
    Create a Razorpay order for the ₹399 / 90-day Premium plan.
    """

    try:
        order = create_razorpay_order(
            amount=PLAN_AMOUNT,
            currency=PLAN_CURRENCY,
            receipt=f"trustai_{current_user.id}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to create payment order: {exc}",
        )

    return {
        "order_id": order["id"],
        "amount": PLAN_AMOUNT,
        "currency": PLAN_CURRENCY,
        "plan": "PREMIUM",
        "duration_days": PLAN_DURATION_DAYS,
        "razorpay_key_id": settings.razorpay_key_id,
    }


@router.post("/verify")
def verify_payment(
    request: PaymentVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verify Razorpay payment and activate Premium for 90 days.
    """

    is_valid = verify_payment_signature(
        razorpay_order_id=request.razorpay_order_id,
        razorpay_payment_id=request.razorpay_payment_id,
        razorpay_signature=request.razorpay_signature,
    )

    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid payment signature",
        )

    now = datetime.now(timezone.utc)

    # Extend an already-active subscription instead of
    # throwing away the user's remaining time.
    if (
        current_user.subscription_tier == "PREMIUM"
        and current_user.subscription_expires_at is not None
    ):
        expires_at = current_user.subscription_expires_at

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at > now:
            new_expiry = expires_at + timedelta(
                days=PLAN_DURATION_DAYS
            )
        else:
            new_expiry = now + timedelta(
                days=PLAN_DURATION_DAYS
            )
    else:
        new_expiry = now + timedelta(
            days=PLAN_DURATION_DAYS
        )

    current_user.subscription_tier = "PREMIUM"
    current_user.subscription_expires_at = new_expiry

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Payment verified successfully",
        "plan": "PREMIUM",
        "subscription_tier": current_user.subscription_tier,
        "subscription_expires_at": current_user.subscription_expires_at,
        "razorpay_payment_id": request.razorpay_payment_id,
    }
