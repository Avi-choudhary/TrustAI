"""Local provenance-trace inspection for image metadata."""

from __future__ import annotations

from pathlib import Path

from PIL import ExifTags, Image

from app.models.schemas import Signal

EDITING_MARKERS = ("photoshop", "gimp", "canva", "lightroom", "snapseed", "pixlr")


def analyze(file_path: Path, file_type: str) -> Signal:
    if file_type != "image":
        return Signal(type="metadata", label="Provenance Trace Analysis", status="info", summary="Embedded provenance inspection is available for images only.", details=[])

    try:
        with Image.open(file_path) as image:
            exif = {ExifTags.TAGS.get(key, str(key)): value for key, value in image.getexif().items()}
            details = [f"Format: {image.format or 'unknown'}", f"Dimensions: {image.width} x {image.height}"]
    except Exception as exc:
        return Signal(type="metadata", label="Provenance Trace Analysis", status="info", summary="Embedded metadata could not be read.", details=[f"Analysis note: {exc}"])

    software = str(exif.get("Software", "")).strip()
    capture_time = str(exif.get("DateTimeOriginal", exif.get("DateTime", ""))).strip()
    if software:
        details.append(f"Software tag: {software}")
    if capture_time:
        details.append(f"Capture timestamp: {capture_time}")
    if not exif:
        details.append("No EXIF block is embedded in this file.")

    if software and any(marker in software.lower() for marker in EDITING_MARKERS):
        return Signal(type="metadata", label="Provenance Trace Analysis", status="flag", summary="The embedded software tag indicates that the image was processed in an editing application.", details=details)
    return Signal(type="metadata", label="Provenance Trace Analysis", status="clear", summary="No editing-software signature was found in the readable embedded metadata.", details=details)
