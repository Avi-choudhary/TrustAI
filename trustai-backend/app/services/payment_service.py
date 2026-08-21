from __future__ import annotations

import razorpay

from app.config import settings


def get_razorpay_client() -> razorpay.Client:
    return razorpay.Client(
        auth=(
            settings.razorpay_key_id,
            settings.razorpay_key_secret,
        )
    )


def create_razorpay_order(
    amount: int,
    currency: str,
    receipt: str,
):
    """
    Create a Razorpay order.

    amount is in the smallest currency unit.
    ₹399 = 39900 paise.
    """
    client = get_razorpay_client()
    data = {
        "amount": amount,
        "currency": currency,
        "receipt": receipt,
    }

    return client.order.create(data=data)


def verify_payment_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> bool:
    """
    Verify the Razorpay Checkout signature.
    """
    client = get_razorpay_client()
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        )

        return True

    except razorpay.errors.SignatureVerificationError:
        return False
