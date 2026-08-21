"""
Signal: OCR & layout consistency.

Real implementation (TODO — owner: OCR/document verification teammate):
    - Run PaddleOCR over the document to extract text boxes + font/baseline
      metrics per line.
    - Check for: font-weight mismatches between fields, baseline offsets
      vs. the surrounding table/grid, letter-spacing outliers, misaligned
      rows — the kinds of inconsistencies a copy-paste/field edit leaves
      behind even when it "reads" fine.
    - Only meaningful for `file_type == "document"` — for plain images,
      mirror the "not applicable" placeholder below.

This stub returns a deterministic placeholder so the rest of the pipeline
can be built and tested end-to-end before the real detector lands. Swap
the body of `analyze()` only — the return type is the contract.
"""

from __future__ import annotations

from pathlib import Path

from app.models.schemas import Signal


def analyze(file_path: Path, file_type: str) -> Signal:
    if file_type != "document":
        return Signal(
            type="ocr",
            label="OCR & Layout Consistency",
            status="info",
            summary="No text regions detected — not applicable to this file.",
            details=[],
        )

    # --- PLACEHOLDER LOGIC — replace with real PaddleOCR layout analysis ---
    return Signal(
        type="ocr",
        label="OCR & Layout Consistency",
        status="info",
        summary="OCR analysis not yet implemented — placeholder result.",
        details=[
            f"Received file: {file_path.name}",
            "TODO: real PaddleOCR extraction + font/baseline consistency checks",
        ],
    )
