from datetime import datetime, timezone

from app.models.user import User


def is_premium_user(user: User) -> bool:
    if user.subscription_tier != "PREMIUM":
        return False

    if user.subscription_expires_at is None:
        return False

    expires_at = user.subscription_expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    return expires_at > datetime.now(timezone.utc)
