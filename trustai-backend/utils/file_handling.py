"""
Upload/preview helpers for the document-detection pipeline
(pipelines/document_pipeline.py, routers/verify.py).

This file was referenced by routers/verify.py (`from utils.file_handling
import validate_and_save, prepare_image, image_to_data_url, cleanup`) but
was missing from the handoff — written to match that pipeline's contract:

    validate_and_save(file) -> (raw_path, ext)
        Save the raw upload to disk exactly as received. `ext` is the
        lowercased file extension (e.g. ".pdf", ".jpg", ".png").

    prepare_image(raw_path, ext) -> image_path
        Return a path to a raster image the OCR/ELA/QR code can open with
        PIL/OpenCV. PDFs get their first page rendered to PNG (via
        PyMuPDF, matching RENDER_DPI used elsewhere in the pipeline);
        anything else is already an image and is returned unchanged.

    image_to_data_url(image_path) -> str
        Base64 data: URL for the frontend's <img>/<embed> preview — no
        static file server needed for this pipeline's temp files.

    cleanup(*paths) -> None
        Best-effort removal of temp files (rendered PDF page, extracted
        embedded images, etc). Never raises.
"""

from __future__ import annotations

import base64
import mimetypes
import os
import tempfile
import uuid
from typing import Optional

import fitz  # PyMuPDF

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB
RENDER_DPI = 200  # matches pipelines/pdf_forensics.py


def _upload_dir() -> str:
    directory = os.path.join(tempfile.gettempdir(), "trustai-document-uploads")
    os.makedirs(directory, exist_ok=True)
    return directory


def validate_and_save(file) -> tuple[str, str]:
    """Validate content type/size and persist the raw upload to disk."""
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file extension '{ext}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    raw = file.file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ValueError("File exceeds the 20 MB upload limit.")
    if not raw:
        raise ValueError("Uploaded file is empty.")

    case_id = uuid.uuid4().hex[:12]
    dest_path = os.path.join(_upload_dir(), f"{case_id}{ext}")
    with open(dest_path, "wb") as out_file:
        out_file.write(raw)

    return dest_path, ext


def prepare_image(raw_path: str, ext: str) -> str:
    """Return a raster image path the rest of the pipeline can open."""
    normalized_ext = (ext or os.path.splitext(raw_path)[1]).lower()

    if normalized_ext != ".pdf":
        return raw_path

    with fitz.open(raw_path) as doc:
        if doc.page_count == 0:
            raise ValueError("PDF has no pages to render.")
        page = doc.load_page(0)
        zoom = RENDER_DPI / 72.0
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        image_path = os.path.splitext(raw_path)[0] + "_page1.png"
        pix.save(image_path)

    return image_path


def image_to_data_url(image_path: str) -> str:
    """Base64-encode an image for direct use in an <img>/<embed> src."""
    mime_type = mimetypes.guess_type(image_path)[0] or "image/png"
    with open(image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def cleanup(*paths: Optional[str]) -> None:
    """Best-effort removal of temp files. Never raises."""
    for path in paths:
        if not path:
            continue
        try:
            os.remove(path)
        except OSError:
            pass
