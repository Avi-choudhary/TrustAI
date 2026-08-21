"""Local spectral consistency analysis for image-forensics evidence.

This service runs entirely on the uploaded image. It does not call a cloud
model and it does not classify an image as AI-generated. Instead, it looks
for unusual frequency-energy distribution that can warrant manual review.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from app.models.schemas import Signal


def _spectrum_metrics(image: Image.Image) -> dict:
    gray = cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2GRAY)
    if min(gray.shape) < 32:
        raise ValueError("Image is too small for reliable spectral analysis.")

    # Use a fixed working size so measurements are comparable across uploads.
    scale = min(1.0, 768 / max(gray.shape))
    if scale < 1.0:
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

    spectrum = np.fft.fftshift(np.fft.fft2(gray.astype(np.float32)))
    power = np.abs(spectrum) ** 2
    rows, cols = gray.shape
    y, x = np.ogrid[:rows, :cols]
    radius = np.sqrt((x - cols / 2) ** 2 + (y - rows / 2) ** 2)
    normalized_radius = radius / max(radius.max(), 1.0)

    # Ignore the centre/DC area and measure the outer frequency band.
    high_band = power[normalized_radius >= 0.35]
    total_energy = float(power.sum()) + 1e-12
    high_energy_ratio = float(high_band.sum() / total_energy)

    # Radial-band variation highlights repetitive frequency peaks rather
    # than merely penalising sharp, natural photographs.
    bands = []
    for lower, upper in zip(np.arange(0.1, 0.9, 0.1), np.arange(0.2, 1.0, 0.1)):
        values = power[(normalized_radius >= lower) & (normalized_radius < upper)]
        bands.append(float(values.mean()) if values.size else 0.0)
    banding = float(np.std(bands) / (np.mean(bands) + 1e-12))

    # This is an anomaly score, not a generated-image probability. The
    # thresholds are conservative and are intended to prompt review only.
    anomaly = max(0.0, min(100.0, (high_energy_ratio - 0.05) * 500 + (banding - 0.55) * 45))
    return {"score": anomaly, "high_energy_ratio": high_energy_ratio, "banding": banding}


def analyze(file_path: Path, file_type: str) -> Signal:
    if file_type != "image":
        return Signal(
            type="spectral",
            label="Spectral Consistency Analysis",
            status="info",
            summary="Spectral analysis is available for images only.",
            details=[],
        )

    try:
        with Image.open(file_path) as image:
            metrics = _spectrum_metrics(image)
    except Exception as exc:
        return Signal(
            type="spectral",
            label="Spectral Consistency Analysis",
            status="info",
            summary="The image could not be analysed in the frequency domain.",
            details=[f"Analysis note: {exc}"],
        )

    flagged = metrics["score"] >= 45.0
    summary = (
        "An atypical frequency-energy distribution was found; manual review is recommended."
        if flagged
        else "No strong spectral inconsistency was found in the analysed image."
    )
    return Signal(
        type="spectral",
        label="Spectral Consistency Analysis",
        status="flag" if flagged else "clear",
        summary=summary,
        details=[
            f"High-band energy ratio: {metrics['high_energy_ratio']:.4f}",
            f"Radial-band variation: {metrics['banding']:.4f}",
            "Method: local 2D Fourier spectrum analysis; this is an anomaly signal, not a standalone authenticity verdict.",
        ],
    )
