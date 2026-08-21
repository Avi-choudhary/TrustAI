from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.x402 import X402Payment
from app.services.blockchain_service import trust_ledger
from app.services.x402_service import (
    create_x402_challenge,
    encode_payment_required_header,
    encode_payment_response_header,
    get_x402_config,
    verify_and_settle_x402_payment,
)

router = APIRouter(
    prefix="/api/x402",
    tags=["X402 Payment Protocol"],
)


class ChallengeRequest(BaseModel):
    plan: str = "PREMIUM"
    purpose: str = "SUBSCRIPTION"
    amount: Optional[float] = None


from typing import Annotated, Any, Dict, List, Optional


class SettlePaymentRequest(BaseModel):
    model_config = {"populate_by_name": True, "extra": "ignore"}

    order_id: Annotated[str, Field(alias="orderId")]
    payer_address: Annotated[str, Field(alias="payerAddress")]
    network: str = "eip155:8453"
    amount: float
    asset: str = "USDC"
    plan: str = "PREMIUM"
    signature: Optional[str] = None
    tx_hash: Optional[Annotated[str, Field(alias="txHash")]] = None


@router.get("/config")
def get_config():
    """Returns X402 merchant configuration, accepted networks, and pricing rates."""
    return get_x402_config()


@router.post("/challenge")
def get_payment_challenge(
    request: ChallengeRequest,
    response: Response,
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Returns an RFC-compliant HTTP 402 'Payment Required' response
    with PAYMENT-REQUIRED header and detailed payment options.
    """
    challenge = create_x402_challenge(
        plan=request.plan,
        amount=request.amount,
        purpose=request.purpose,
        user_id=current_user.id if current_user else None,
    )

    encoded_header = encode_payment_required_header(challenge)
    response.status_code = status.HTTP_402_PAYMENT_REQUIRED
    response.headers["PAYMENT-REQUIRED"] = encoded_header
    response.headers["Access-Control-Expose-Headers"] = "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE"

    return challenge


@router.post("/settle")
def settle_payment(
    request: SettlePaymentRequest,
    response: Response,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_payment: Optional[str] = Header(None, alias="X-Payment"),
):
    """
    Verify payment authorization and settle.
    Mints an immutable audit record to the blockchain ledger,
    activates Premium tier, and returns X-PAYMENT-RESPONSE proof.
    """
    try:
        settlement = verify_and_settle_x402_payment(
            order_id=request.order_id,
            payer_address=request.payer_address,
            network=request.network,
            amount=request.amount,
            asset=request.asset,
            plan=request.plan,
            signature=request.signature or x_payment,
            tx_hash=request.tx_hash,
            user=current_user,
            db=db,
        )

        encoded_resp = encode_payment_response_header(settlement)
        response.headers["X-PAYMENT-RESPONSE"] = encoded_resp
        response.headers["Access-Control-Expose-Headers"] = "X-PAYMENT-RESPONSE, PAYMENT-REQUIRED"

        return settlement

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"X402 Settlement Failed: {str(exc)}",
        )


@router.get("/history")
def get_user_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns all X402 payments settled by the current user."""
    payments = (
        db.query(X402Payment)
        .filter(X402Payment.user_id == current_user.id)
        .order_by(X402Payment.created_at.desc())
        .all()
    )

    return [
        {
            "id": p.id,
            "orderId": p.order_id,
            "payerAddress": p.payer_address,
            "payToAddress": p.pay_to_address,
            "network": p.network,
            "asset": p.asset,
            "amount": p.amount,
            "currency": p.currency,
            "plan": p.plan,
            "status": p.status,
            "txHash": p.tx_hash,
            "blockchainBlockHash": p.blockchain_block_hash,
            "blockchainBlockIndex": p.blockchain_block_index,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
            "settledAt": p.settled_at.isoformat() if p.settled_at else None,
        }
        for p in payments
    ]


@router.get("/verify-receipt/{tx_hash}")
def verify_receipt_on_chain(
    tx_hash: str,
    db: Session = Depends(get_db),
):
    """
    Public attestation endpoint: verifies the x402 settlement on the blockchain audit ledger.
    """
    payment = (
        db.query(X402Payment)
        .filter(X402Payment.tx_hash == tx_hash)
        .first()
    )

    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    ledger_summary = trust_ledger.summary()

    return {
        "verified": True,
        "txHash": payment.tx_hash,
        "orderId": payment.order_id,
        "status": payment.status,
        "payerAddress": payment.payer_address,
        "amount": payment.amount,
        "asset": payment.asset,
        "network": payment.network,
        "plan": payment.plan,
        "blockchain": {
            "blockIndex": payment.blockchain_block_index,
            "blockHash": payment.blockchain_block_hash,
            "isChainValid": ledger_summary.get("is_chain_valid", True),
            "ledgerType": "local_tamper_evident_ledger",
        },
        "settledAt": payment.settled_at.isoformat() if payment.settled_at else None,
    }
