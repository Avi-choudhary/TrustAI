from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Header, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.schemas import VerificationResult
from app.models.user import User
from app.routers.verify_document import verify_document
from app.routers.verify_image import verify_image
from app.services.auth_service import decode_access_token
from app.services.subscription_service import is_premium_user
from app.services.usage_service import (
    has_free_verification_available,
    record_verification_usage,
)

router = APIRouter(
    prefix="/api",
    tags=["verify"],
)


@router.post("/verify", response_model=VerificationResult, response_model_by_alias=True)
async def verify_file(
    file: UploadFile = File(...),
    fileType: str = Form("image"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> VerificationResult:
    """
    Unified verification endpoint compatible with frontend and extension.
    Routes to document or image forensics pipeline based on fileType.
    """
    user_id: Optional[int] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            user_id = decode_access_token(token)
        except Exception:
            pass

    if user_id is not None:
        user = db.get(User, user_id)
        if user and not is_premium_user(user):
            if not has_free_verification_available(db, user.id):
                raise HTTPException(
                    status_code=429,
                    detail="Daily free verification limit reached. Upgrade to Premium for unlimited verification.",
                )

    if fileType.lower() in ("document", "pdf", "docx", "doc"):
        result = await verify_document(file=file)
    else:
        result = await verify_image(file=file)

    if user_id is not None:
        try:
            record_verification_usage(
                db,
                user_id=user_id,
                case_id=result.id,
                route="/api/verify",
                verification_type=fileType,
            )
        except Exception:
            pass

    return result
