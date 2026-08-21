"""Local JPEG recompression-residual analysis for image-forensics evidence."""

from __future__ import annotations

import io
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageStat

from app.models.schemas import Hotzone, Signal


def analyze(file_path: Path, file_type: str) -> Signal:
    if file_type != "image":
        return Signal(type="ela", label="Compression Residual Analysis", status="info", summary="Compression-residual analysis is available for images only.", hotzones=[])

    try:
        with Image.open(file_path) as source:
            image = source.convert("RGB")
            buffer = io.BytesIO()
            image.save(buffer, "JPEG", quality=90)
            buffer.seek(0)
            recompressed = Image.open(buffer).convert("RGB")
            difference = ImageChops.difference(image, recompressed)
            mean_error = float(sum(ImageStat.Stat(difference).mean) / 3)
            error_map = np.asarray(difference.convert("L"), dtype=np.float32)
    except Exception as exc:
        return Signal(type="ela", label="Compression Residual Analysis", status="info", summary="The image could not be evaluated for recompression residuals.", details=[f"Analysis note: {exc}"], hotzones=[])

    threshold = max(22.0, float(error_map.mean() + 3.0 * error_map.std()))
    flagged_pixels = np.argwhere(error_map >= threshold)
    hotzones = []
    if flagged_pixels.size:
        top, left = flagged_pixels.min(axis=0)
        bottom, right = flagged_pixels.max(axis=0)
        coverage = flagged_pixels.shape[0] / error_map.size
        if coverage >= 0.003:
            height, width = error_map.shape
            hotzones = [Hotzone(x=round(left / width * 100, 2), y=round(top / height * 100, 2), width=round((right - left + 1) / width * 100, 2), height=round((bottom - top + 1) / height * 100, 2), confidence=round(min(0.95, coverage * 12), 2), note="Elevated recompression residual region")]

    if hotzones:
        summary = "Elevated recompression residuals were found in a concentrated image region."
        status = "flag"
    else:
        summary = "No concentrated recompression-residual region was found at the selected threshold."
        status = "clear"
    return Signal(type="ela", label="Compression Residual Analysis", status=status, summary=summary, details=[f"Mean recompression residual: {mean_error:.2f}", f"Pixel threshold: {threshold:.2f}"], hotzones=hotzones)
