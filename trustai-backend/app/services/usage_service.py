from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.usage import Usage


FREE_DAILY_LIMIT = 10


def get_today_start() -> datetime:
    """Return the start of the current UTC day."""
    now = datetime.now(timezone.utc)

    return now.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )


def get_daily_usage(
    db: Session,
    user_id: int,
) -> int:
    """Return the number of successful verifications today."""

    today_start = get_today_start()

    count = (
        db.query(func.count(Usage.id))
        .filter(
            Usage.user_id == user_id,
            Usage.route.like("/api/verify%"),
            Usage.created_at >= today_start,
        )
        .scalar()
    )

    return int(count or 0)


def has_free_verification_available(
    db: Session,
    user_id: int,
) -> bool:
    """Check whether the user still has free verifications today."""

    return get_daily_usage(db, user_id) < FREE_DAILY_LIMIT


def record_verification_usage(
    db: Session,
    user_id: int,
    case_id: str,
    route: str = "/api/verify",
    verification_type: str = "single",
) -> None:
    """Record one successful verification."""

    usage = Usage(
        user_id=user_id,
        route=route,
        verification_type=verification_type,
        case_id=case_id,
    )

    db.add(usage)
    db.commit()
