"""
Upload handling helpers.

Saves the incoming file to disk under storage/uploads/<case_id>/ and hands
back a URL the frontend can render directly in <img>/<embed> — the frontend
contract just needs `previewUrl` to be *something the browser can load*, so
serving the saved file back via a static mount is enough for local dev.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.config import settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_DOCUMENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


def generate_case_id() -> str:
    """Mirrors the frontend's mock id style, e.g. TRA-9F2A1."""
    return f"TRA-{uuid4().hex[:8].upper()}"


def validate_content_type(content_type: str, file_type: str) -> bool:
    if file_type == "image":
        return content_type in ALLOWED_IMAGE_TYPES
    if file_type == "document":
        return content_type in ALLOWED_DOCUMENT_TYPES
    return False


async def save_upload(upload: UploadFile, case_id: str) -> Path:
    """Persist the uploaded file to storage/uploads/<case_id>/<filename> and
    return the path on disk for downstream analysis services to read."""
    case_dir = settings.upload_dir / case_id
    case_dir.mkdir(parents=True, exist_ok=True)

    dest_path = case_dir / upload.filename
    with dest_path.open("wb") as out_file:
        # copyfileobj streams instead of loading the whole file into memory
        shutil.copyfileobj(upload.file, out_file)

    return dest_path


def build_preview_url(case_id: str, filename: str) -> str:
    """Public URL the frontend can drop straight into an <img>/<embed> src."""
    return f"{settings.public_base_url}/files/{case_id}/{filename}"
