from __future__ import annotations

import io
import os
from collections import defaultdict
from typing import Any, Optional

import cv2
import fitz 
import numpy as np
from PIL import ExifTags, Image

from services.gemini_forensics import run_gemini_forensics
from pipelines.field_extractor import extract_fields_from_ocr
from pipelines.field_forensics import analyze_field_forensics
from pipelines.pdf_forensics import analyze_pdf_structure
from aggregation.family_engine import (
    build_evidence_families,
    evidence_coverage,
    aggregate_document_risk,
)  

try:
    from paddleocr import PaddleOCR
except ImportError:  # pragma: no cover
    PaddleOCR = None

# ---------------------------------------------------------------------------
# Scoring configuration
# ---------------------------------------------------------------------------
METADATA_MAX = 20.0
ELA_MAX = 30.0
OCR_MAX = 50.0
LOW_THRESHOLD = 35.0
HIGH_THRESHOLD = 70.0

# ELA is only treated as a strong supporting signal for original JPEGs.
ELA_JPEG_QUALITY = 90
ELA_PERCENTILE = 99.5
MIN_HOTZONE_AREA_RATIO = 0.0002
MAX_HOTZONE_AREA_RATIO = 0.08

# PaddleOCR recognition confidence threshold.
MIN_OCR_SCORE = 0.50
MIN_WORDS_FOR_LAYOUT = 5

EDITING_SOFTWARE = (
    "photoshop",
    "adobe photoshop",
    "gimp",
    "paint.net",
    "pixlr",
    "affinity",
    "coreldraw",
    "illustrator",
    "lightroom",
    "canva",
)

# Load PaddleOCR lazily once and reuse it for subsequent requests.
_OCR: Any = None


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------
def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, float(value)))


def _score_status(score: float, maximum: float) -> str:
    ratio = score / maximum if maximum else 0.0

    if ratio <= 0.25:
        return "clear"
    if ratio <= 0.60:
        return "info"
    return "flag"


def _bbox_percent(
    x: float,
    y: float,
    w: float,
    h: float,
    iw: int,
    ih: int,
) -> dict:
    """Convert pixel coordinates into the frontend's 0-100 percentages."""

    if iw <= 0 or ih <= 0:
        return {
            "x": 0.0,
            "y": 0.0,
            "width": 0.0,
            "height": 0.0,
        }

    return {
        "x": round(_clamp(x / iw * 100.0, 0.0, 100.0), 2),
        "y": round(_clamp(y / ih * 100.0, 0.0, 100.0), 2),
        "width": round(_clamp(w / iw * 100.0, 0.0, 100.0), 2),
        "height": round(_clamp(h / ih * 100.0, 0.0, 100.0), 2),
    }


def _load_rgb(path: str) -> Image.Image:
    if not os.path.isfile(path):
        raise FileNotFoundError(path)

    with Image.open(path) as src:
        src.load()
        return src.convert("RGB")


def _clean_signal(signal: dict) -> dict:
    """Remove internal scoring fields before returning the API result."""
    return {
        key: value
        for key, value in signal.items()
        if not key.startswith("_")
    }


def _without_temp_paths(value: Any) -> Any:
    if isinstance(value, list):
        return [_without_temp_paths(item) for item in value]

    if isinstance(value, dict):
        return {
            key: _without_temp_paths(item)
            for key, item in value.items()
            if key != "path"
        }

    return value


def _temp_paths_from_pdf_forensics(forensics: dict) -> list[str]:
    paths = []

    for image in forensics.get("extracted_images", []):
        path = image.get("path")
        if path:
            paths.append(path)

    return paths


def _image_size(path: str) -> Optional[tuple[int, int]]:
    try:
        with Image.open(path) as image:
            return image.size
    except Exception:
        return None


def _preferred_pdf_ocr_image(
    pdf_forensics: dict,
    fallback_image_path: str,
) -> str:
    extracted_images = pdf_forensics.get("extracted_images", [])

    for image in extracted_images:
        if image.get("image_extracted") and image.get("path"):
            return image["path"]

    for image in extracted_images:
        if image.get("path"):
            return image["path"]

    return fallback_image_path


# ---------------------------------------------------------------------------
# Metadata
# ---------------------------------------------------------------------------
def _image_metadata(
    path: str,
) -> tuple[list[str], float]:
    """Read EXIF metadata from JPG/PNG images."""

    details: list[str] = []
    score = 0.0

    if not os.path.isfile(path):
        raise FileNotFoundError(path)

    with Image.open(path) as image:
        exif = image.getexif()

        metadata: dict[str, str] = {}

        for tag_id, value in exif.items():
            name = ExifTags.TAGS.get(tag_id, str(tag_id))
            metadata[name] = str(value)

        info = getattr(image, "info", {}) or {}
        software = str(
            metadata.get("Software")
            or info.get("software")
            or ""
        ).strip()

    if not metadata and not software:
        return [
            "No embedded EXIF metadata was found; this is common for scanned/exported documents.",
            "Missing metadata is not treated as evidence of tampering.",
        ], 2.0

    if software:
        lower = software.lower()

        if any(keyword in lower for keyword in EDITING_SOFTWARE):
            score += 12.0
            details.append(
                f"Editing software is present in metadata: {software}."
            )
        else:
            score += 2.0
            details.append(
                f"Embedded software metadata: {software}."
            )

    original = metadata.get("DateTimeOriginal", "").strip()
    modified = metadata.get("DateTime", "").strip()

    if original and modified and original != modified:
        score += 4.0
        details.append(
            "Original capture time and file timestamp differ."
        )
    elif original:
        details.append(
            "Original capture timestamp is present."
        )

    make = metadata.get("Make", "").strip()
    model = metadata.get("Model", "").strip()

    if make or model:
        details.append(
            "Capture device metadata is present."
        )

    return details, _clamp(score, 0.0, METADATA_MAX)


def _pdf_metadata(path: str) -> tuple[list[str], float]:
    """Read PDF Info/XMP metadata from the original PDF."""

    details: list[str] = []
    score = 0.0

    with fitz.open(path) as doc:
        metadata = doc.metadata or {}
        xmp = doc.get_xml_metadata() or ""

    creator = str(metadata.get("creator") or "").strip()
    producer = str(metadata.get("producer") or "").strip()
    created = str(metadata.get("creationDate") or "").strip()
    modified = str(metadata.get("modDate") or "").strip()

    if creator:
        details.append(
            f"PDF creator metadata: {creator}."
        )

        if any(
            keyword in creator.lower()
            for keyword in EDITING_SOFTWARE
        ):
            score += 8.0

    if producer:
        details.append(
            f"PDF producer metadata: {producer}."
        )

        if any(
            keyword in producer.lower()
            for keyword in EDITING_SOFTWARE
        ):
            score += 8.0

    if created and modified and created != modified:
        score += 3.0
        details.append(
            "PDF creation and modification timestamps differ."
        )

    if xmp:
        details.append(
            "Embedded XMP metadata is present."
        )

    if not details:
        details = [
            "No useful PDF metadata was found.",
            "Missing PDF metadata is not treated as evidence of tampering.",
        ]
        score = 2.0

    return details, _clamp(score, 0.0, METADATA_MAX)


def run_metadata_check(
    image_path: str,
    raw_path: Optional[str] = None,
    ext: Optional[str] = None,
) -> dict:
    try:
        normalized_ext = (
            ext
            or os.path.splitext(raw_path or image_path)[1]
        ).lower()

        if normalized_ext == ".pdf":
            if not raw_path:
                raise ValueError(
                    "Original PDF path is required for PDF metadata analysis."
                )

            details, score = _pdf_metadata(raw_path)
        else:
            details, score = _image_metadata(image_path)

        status = _score_status(
            score,
            METADATA_MAX,
        )

        if status == "flag":
            summary = (
                "Metadata contains information associated with "
                "possible post-processing."
            )
        elif status == "info":
            summary = (
                "Metadata contains some information worth considering "
                "with the image-level evidence."
            )
        else:
            summary = (
                "No strong metadata indicators of manipulation were found."
            )

        return {
            "type": "metadata",
            "label": "Metadata / EXIF",
            "status": status,
            "summary": summary,
            "details": details,
            "_score": score,
            "_max": METADATA_MAX,
        }

    except Exception as exc:
        return {
            "type": "metadata",
            "label": "Metadata / EXIF",
            "status": "info",
            "summary": "Metadata analysis could not be completed.",
            "details": [
                f"Metadata parser error: {type(exc).__name__}."
            ],
            "_score": 0.0,
            "_max": METADATA_MAX,
        }


# ---------------------------------------------------------------------------
# ELA
# ---------------------------------------------------------------------------
def _ela_map(image: Image.Image) -> np.ndarray:
    """Create a JPEG recompression difference map."""

    buffer = io.BytesIO()

    image.save(
        buffer,
        format="JPEG",
        quality=ELA_JPEG_QUALITY,
    )

    buffer.seek(0)

    with Image.open(buffer) as recompressed_image:
        recompressed = recompressed_image.convert("RGB")

    original_array = np.asarray(
        image,
        dtype=np.int16,
    )
    recompressed_array = np.asarray(
        recompressed,
        dtype=np.int16,
    )

    return np.mean(
        np.abs(original_array - recompressed_array),
        axis=2,
    ).astype(np.float32)


def run_ela_check(
    image_path: str,
    ext: Optional[str] = None,
) -> dict:
    """
    Run ELA for original JPEG inputs.

    PNG/PDF-rendered images are not treated as equivalent JPEG forensic
    sources, so ELA contributes zero risk for those formats in this MVP.
    """

    normalized_ext = (
        ext
        or os.path.splitext(image_path)[1]
    ).lower()

    if normalized_ext not in {".jpg", ".jpeg"}:
        return {
            "type": "ela",
            "label": "Error Level Analysis",
            "status": "info",
            "summary": (
                "ELA was not used as strong evidence because the "
                "original source is not a JPEG image."
            ),
            "hotzones": [],
            "_score": 0.0,
            "_max": ELA_MAX,
        }

    try:
        image = _load_rgb(image_path)

        original_width, original_height = image.size

        max_dimension = 2200

        scale = min(
            1.0,
            max_dimension / max(
                original_width,
                original_height,
            ),
        )

        if scale < 1.0:
            image = image.resize(
                (
                    max(1, int(original_width * scale)),
                    max(1, int(original_height * scale)),
                ),
                Image.Resampling.LANCZOS,
            )

        diff = _ela_map(image)

        if not np.any(diff > 0):
            return {
                "type": "ela",
                "label": "Error Level Analysis",
                "status": "clear",
                "summary": (
                    "No localized recompression anomaly was detected."
                ),
                "hotzones": [],
                "_score": 0.0,
                "_max": ELA_MAX,
            }

        smoothed = cv2.GaussianBlur(
            diff,
            (5, 5),
            0,
        )

        positive = smoothed[smoothed > 0]

        threshold = max(
            float(
                np.percentile(
                    positive,
                    ELA_PERCENTILE,
                )
            ),
            1.0,
        )

        mask = (
            (smoothed >= threshold)
            .astype(np.uint8)
            * 255
        )

        kernel = np.ones(
            (5, 5),
            np.uint8,
        )

        mask = cv2.morphologyEx(
            mask,
            cv2.MORPH_CLOSE,
            kernel,
        )

        mask = cv2.dilate(
            mask,
            kernel,
            iterations=1,
        )

        contours, _ = cv2.findContours(
            mask,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE,
        )

        analysis_height, analysis_width = diff.shape
        total_pixels = analysis_width * analysis_height

        hotzones = []

        for contour in contours:
            x, y, width, height = cv2.boundingRect(contour)

            ratio = (
                (width * height)
                / max(total_pixels, 1)
            )

            if ratio < MIN_HOTZONE_AREA_RATIO:
                continue

            if ratio > MAX_HOTZONE_AREA_RATIO:
                continue

            roi = smoothed[
                y:y + height,
                x:x + width
            ]

            mean_error = (
                float(np.mean(roi))
                if roi.size
                else 0.0
            )

            confidence = _clamp(
                0.55
                + (
                    (mean_error - threshold)
                    / max(threshold, 1.0)
                ),
                0.0,
                0.99,
            )

            original_x = x / scale
            original_y = y / scale
            original_box_width = width / scale
            original_box_height = height / scale

            hotzones.append(
                {
                    **_bbox_percent(
                        original_x,
                        original_y,
                        original_box_width,
                        original_box_height,
                        original_width,
                        original_height,
                    ),
                    "confidence": round(
                        confidence,
                        3,
                    ),
                    "note": (
                        "Localized recompression difference; "
                        "ELA alone does not prove manipulation."
                    ),
                    "_mean": mean_error,
                }
            )

        hotzones.sort(
            key=lambda zone: zone["_mean"],
            reverse=True,
        )

        hotzones = hotzones[:5]

        for zone in hotzones:
            zone.pop("_mean", None)

        if not hotzones:
            score = 0.0
        else:
            strongest = hotzones[0]["confidence"]

            corroboration = min(
                1.0,
                0.45 + 0.18 * len(hotzones),
            )

            score = _clamp(
                strongest
                * corroboration
                * ELA_MAX,
                0.0,
                ELA_MAX,
            )

        status = _score_status(
            score,
            ELA_MAX,
        )

        if hotzones:
            summary = (
                f"{len(hotzones)} localized recompression "
                "region(s) were detected."
            )
        else:
            summary = (
                "No significant localized recompression "
                "anomaly was detected."
            )

        return {
            "type": "ela",
            "label": "Error Level Analysis",
            "status": status,
            "summary": summary,
            "hotzones": hotzones,
            "_score": score,
            "_max": ELA_MAX,
        }

    except Exception as exc:
        return {
            "type": "ela",
            "label": "Error Level Analysis",
            "status": "info",
            "summary": "ELA analysis could not be completed.",
            "hotzones": [],
            "_score": 0.0,
            "_max": ELA_MAX,
            "_error": type(exc).__name__,
        }


# ---------------------------------------------------------------------------
# PaddleOCR
# ---------------------------------------------------------------------------
def _get_ocr() -> Any:
    """Initialize PaddleOCR once and reuse it."""

    global _OCR

    if _OCR is not None:
        return _OCR

    if PaddleOCR is None:
        raise RuntimeError(
            "PaddleOCR is not installed. "
            "Install paddleocr and paddlepaddle first."
        )

    _OCR = PaddleOCR(
        lang="en",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=True,
    )

    return _OCR


def _json_from_result(result: Any) -> dict:
    """Normalize PaddleOCR result objects across supported result wrappers."""

    if hasattr(result, "json"):
        value = result.json

        if callable(value):
            value = value()

        if isinstance(value, dict):
            return value

    if isinstance(result, dict):
        return result

    if hasattr(result, "res") and isinstance(
        result.res,
        dict,
    ):
        return result.res

    raise RuntimeError(
        "Unexpected PaddleOCR result format."
    )


def _ocr_words(image_path: str) -> list[dict]:
    """Run PaddleOCR and normalize text boxes."""

    ocr = _get_ocr()

    outputs = ocr.predict(
        input=image_path,
    )

    words: list[dict] = []

    for output in outputs:
        data = _json_from_result(output)

        data = data.get(
            "res",
            data,
        )

        texts = data.get(
            "rec_texts",
            [],
        )

        scores = data.get(
            "rec_scores",
            [],
        )

        # Avoid implicit truth-value testing on NumPy arrays from PaddleOCR outputs.
        boxes = data.get("rec_boxes")
        if boxes is None:
            boxes = data.get("rec_polys")
        if boxes is None:
            boxes = []

        for text, score, box in zip(
            texts,
            scores,
            boxes,
        ):
            score = float(score)

            if score < MIN_OCR_SCORE:
                continue

            array = np.asarray(
                box,
                dtype=float,
            )

            if array.ndim == 2:
                x1 = float(array[:, 0].min())
                y1 = float(array[:, 1].min())
                x2 = float(array[:, 0].max())
                y2 = float(array[:, 1].max())
            else:
                values = array.flatten()

                if len(values) < 4:
                    continue

                x1, y1, x2, y2 = map(
                    float,
                    values[:4],
                )

            if x2 <= x1 or y2 <= y1:
                continue

            words.append(
                {
                    "text": str(text).strip(),
                    "score": score,
                    "x": x1,
                    "y": y1,
                    "w": x2 - x1,
                    "h": y2 - y1,
                    "right": x2,
                    "bottom": y2,
                }
            )

    return words


def _layout_score(
    words: list[dict],
) -> tuple[float, list[dict], list[str]]:
    """Detect relative text-layout outliers."""

    if len(words) < MIN_WORDS_FOR_LAYOUT:
        return (
            0.0,
            [],
            [
                "Not enough reliable OCR text was detected "
                "for layout comparison."
            ],
        )

    heights = np.asarray(
        [word["h"] for word in words],
        dtype=float,
    )

    median_height = float(
        np.median(heights)
    )

    mad = max(
        float(
            np.median(
                np.abs(
                    heights - median_height
                )
            )
        ),
        1.0,
    )

    anomalies: list[
        tuple[dict, float, str]
    ] = []

    for word in words:
        robust_z = (
            abs(
                word["h"] - median_height
            )
            / mad
        )

        if robust_z >= 4.0:
            anomalies.append(
                (
                    word,
                    _clamp(
                        robust_z / 5.0,
                        0.0,
                        0.95,
                    ),
                    (
                        "Unusual text height relative "
                        "to surrounding OCR text."
                    ),
                )
            )

    lines: list[list[dict]] = []

    for word in sorted(
        words,
        key=lambda item: (
            item["y"],
            item["x"],
        ),
    ):
        center_y = (
            word["y"]
            + word["h"] / 2
        )

        placed = False

        for line in lines:
            reference_y = float(
                np.median(
                    [
                        item["y"]
                        + item["h"] / 2
                        for item in line
                    ]
                )
            )

            if abs(
                center_y - reference_y
            ) <= max(
                median_height * 0.5,
                4.0,
            ):
                line.append(word)
                placed = True
                break

        if not placed:
            lines.append([word])

    for line in lines:
        if len(line) < 3:
            continue

        line.sort(
            key=lambda item: item["x"]
        )

        bottoms = np.asarray(
            [
                item["bottom"]
                for item in line
            ],
            dtype=float,
        )

        median_bottom = float(
            np.median(bottoms)
        )

        for word in line:
            deviation = abs(
                word["bottom"]
                - median_bottom
            )

            if deviation > max(
                3.0,
                median_height * 0.40,
            ):
                anomalies.append(
                    (
                        word,
                        _clamp(
                            deviation
                            / max(
                                median_height * 1.5,
                                1.0,
                            ),
                            0.0,
                            0.95,
                        ),
                        (
                            "Vertical alignment differs "
                            "from neighboring text."
                        ),
                    )
                )

        gaps = [
            max(
                0.0,
                right["x"]
                - left["right"],
            )
            for left, right in zip(
                line,
                line[1:],
            )
        ]

        positive_gaps = [
            gap
            for gap in gaps
            if gap > 0
        ]

        if len(positive_gaps) >= 3:
            median_gap = float(
                np.median(positive_gaps)
            )

            if median_gap >= 2.0:
                for index, gap in enumerate(gaps):
                    if gap > median_gap * 4:
                        left = line[index]
                        right = line[index + 1]

                        synthetic = {
                            "x": left["right"],
                            "y": min(
                                left["y"],
                                right["y"],
                            ),
                            "w": max(
                                1.0,
                                right["x"]
                                - left["right"],
                            ),
                            "h": max(
                                left["h"],
                                right["h"],
                            ),
                            "right": right["x"],
                            "bottom": max(
                                left["bottom"],
                                right["bottom"],
                            ),
                        }

                        anomalies.append(
                            (
                                synthetic,
                                _clamp(
                                    gap
                                    / max(
                                        median_gap * 8,
                                        1.0,
                                    ),
                                    0.0,
                                    0.9,
                                ),
                                (
                                    "Unusual horizontal spacing "
                                    "between neighboring text."
                                ),
                            )
                        )

    selected: list[
        tuple[dict, float, str]
    ] = []

    for item in sorted(
        anomalies,
        key=lambda value: value[1],
        reverse=True,
    ):
        word = item[0]

        duplicate = False

        for existing, _, _ in selected:
            intersection_width = max(
                0.0,
                min(
                    word["right"],
                    existing["right"],
                )
                - max(
                    word["x"],
                    existing["x"],
                ),
            )

            intersection_height = max(
                0.0,
                min(
                    word["bottom"],
                    existing["bottom"],
                )
                - max(
                    word["y"],
                    existing["y"],
                ),
            )

            if (
                intersection_width
                * intersection_height
                > 0
            ):
                duplicate = True
                break

        if not duplicate:
            selected.append(item)

        if len(selected) >= 8:
            break

    anomaly_ratio = (
        len(selected)
        / max(len(words), 1)
    )

    ratio_score = min(
        1.0,
        anomaly_ratio / 0.20,
    )

    strength_score = (
        float(
            np.mean(
                [
                    item[1]
                    for item in selected
                ]
            )
        )
        if selected
        else 0.0
    )

    score = _clamp(
        (
            0.55 * ratio_score
            + 0.45 * strength_score
        )
        * OCR_MAX,
        0.0,
        OCR_MAX,
    )

    reasons = []

    counts = defaultdict(int)

    for _, _, reason in selected:
        counts[reason] += 1

    height_reason = (
        "Unusual text height relative "
        "to surrounding OCR text."
    )

    alignment_reason = (
        "Vertical alignment differs "
        "from neighboring text."
    )

    spacing_reason = (
        "Unusual horizontal spacing "
        "between neighboring text."
    )

    if counts[height_reason]:
        reasons.append(
            f"{counts[height_reason]} text region(s) "
            "have unusual relative height."
        )

    if counts[alignment_reason]:
        reasons.append(
            f"{counts[alignment_reason]} text region(s) "
            "show vertical alignment differences."
        )

    if counts[spacing_reason]:
        reasons.append(
            f"{counts[spacing_reason]} text gap(s) "
            "are unusually wide."
        )

    return score, selected, reasons


def run_ocr_check(
    image_path: str,
    *,
    words: Optional[list[dict]] = None,
    ocr_error: Optional[Exception] = None,
) -> dict:
    try:
        if ocr_error is not None:
            raise ocr_error

        if words is None:
            _load_rgb(image_path)
            words = _ocr_words(image_path)

        if not words:
            return {
                "type": "ocr",
                "label": "OCR & Layout Consistency",
                "status": "info",
                "summary": (
                    "OCR did not return enough reliable "
                    "text for layout analysis."
                ),
                "details": [
                    "No sufficiently confident text "
                    "regions were detected."
                ],
                "_score": 0.0,
                "_max": OCR_MAX,
            }

        score, anomalies, reasons = _layout_score(words)
        score = score * 0.35

        average_confidence = float(
            np.mean(
                [
                    word["score"]
                    for word in words
                ]
            )
        )

        details = [
            f"Detected {len(words)} reliable text region(s).",
            (
                "Average OCR confidence: "
                f"{average_confidence:.1%}."
            ),
        ]

        details.extend(reasons)

        status = _score_status(
            score,
            OCR_MAX,
        )

        if status == "flag":
            summary = (
                "Potential text-layout inconsistencies "
                "were detected in localized regions."
            )
        elif status == "info":
            summary = (
                "Some text-layout differences were detected, "
                "but they are not strong enough to be a major flag."
            )
        else:
            summary = (
                "No significant text-layout inconsistencies "
                "were detected."
            )

        return {
            "type": "ocr",
            "label": "OCR & Layout Consistency",
            "status": status,
            "summary": summary,
            "details": details,
            "_score": score,
            "_max": OCR_MAX,
        }

    except Exception as exc:
        return {
            "type": "ocr",
            "label": "OCR & Layout Consistency",
            "status": "info",
            "summary": (
                "OCR/layout analysis could not be completed."
            ),
            "details": [
                f"OCR analysis error: {type(exc).__name__}."
            ],
            "_score": 0.0,
            "_max": OCR_MAX,
        }


# ---------------------------------------------------------------------------
# Score aggregation
# ---------------------------------------------------------------------------
def combine_into_score(
    signals: list[dict],
) -> tuple[float, str]:
    """Combine bounded evidence scores into aggregate score and risk bucket."""

    score = sum(
        _clamp(
            float(signal.get("_score", 0.0)),
            0.0,
            float(signal.get("_max", 0.0)),
        )
        for signal in signals
    )

    score = round(
        _clamp(
            score,
            0.0,
            100.0,
        ),
        1,
    )

    flag_count = sum(
        1
        for signal in signals
        if signal.get("status") == "flag"
    )

    non_clear_count = sum(
        1
        for signal in signals
        if signal.get("status")
        in {"flag", "info"}
    )

    corroborated_high = (
        flag_count >= 2
        or (
            flag_count >= 1
            and non_clear_count >= 2
        )
    )

    if (
        score >= HIGH_THRESHOLD
        and corroborated_high
    ):
        bucket = "HIGH"
    elif score >= LOW_THRESHOLD:
        bucket = "MEDIUM"
    else:
        bucket = "LOW"

    return score, bucket

def _suspicious_regions(phase3_forensics: Optional[dict]) -> list[dict]:
    """
    Convert Phase 3 field anomalies into frontend-friendly suspicious regions.

    Multiple anomalies belonging to the same field are consolidated into
    one region. Missing/limitation evidence is ignored.
    """
    if not phase3_forensics:
        return []

    regions: list[dict] = []

    for field_name, field_result in (
        phase3_forensics.get("fields", {}).items()
    ):
        if not isinstance(field_result, dict):
            continue

        # Support both current Phase 3 "signals" output and older
        # "anomalies" naming.
        anomalies = field_result.get("signals")
        if anomalies is None:
            anomalies = field_result.get("anomalies", [])

        if not isinstance(anomalies, list):
            continue

        valid_signals = []

        for signal in anomalies:
            if not isinstance(signal, dict):
                continue

            if signal.get("type") == "limitation":
                continue

            try:
                severity = float(signal.get("severity", 0.0))
            except (TypeError, ValueError):
                continue

            if severity <= 0:
                continue

            valid_signals.append({
                "type": signal.get("type", "unknown"),
                "severity": round(severity * 100.0, 1),
                "explanation": signal.get("explanation"),
            })

        if not valid_signals:
            continue

        bbox = field_result.get("bbox")

        max_severity = max(
            signal["severity"]
            for signal in valid_signals
        )

        regions.append({
            "field": field_name,
            "page": field_result.get("page"),
            "bbox": bbox,
            "severity": max_severity,
            "signals": valid_signals,
        })

    return regions
# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def analyze(
    image_path: str,
    raw_path: Optional[str] = None,
    ext: Optional[str] = None,
) -> dict:
    """Analyze the rendered page image and optional original upload file."""

    normalized_ext = (
        ext
        or os.path.splitext(raw_path or image_path)[1]
    ).lower()

    pdf_forensics = None
    preferred_ocr_image = image_path

    if normalized_ext == ".pdf" and raw_path:
        pdf_forensics = analyze_pdf_structure(
            raw_path,
            extract_images=True,
            output_dir=os.path.dirname(image_path) or ".",
        )
        preferred_ocr_image = _preferred_pdf_ocr_image(
            pdf_forensics,
            image_path,
        )

    ocr_words: list[dict] = []
    ocr_error: Optional[Exception] = None

    try:
        _load_rgb(preferred_ocr_image)
        ocr_words = _ocr_words(preferred_ocr_image)
    except Exception as exc:
        ocr_error = exc

    signals = [
      run_metadata_check(
        image_path,
        raw_path=raw_path,
        ext=ext,
      ),
      run_ela_check(
           preferred_ocr_image,
           ext=(
             os.path.splitext(preferred_ocr_image)[1].lower()
             if normalized_ext == ".pdf"
             else ext
           ),
      ),
      run_ocr_check(
        preferred_ocr_image,
        words=ocr_words,
        ocr_error=ocr_error,
      ),
   ]
    legacy_signals = list(signals)

    fields = extract_fields_from_ocr(
      ocr_words,
      image_size=_image_size(preferred_ocr_image),
      page=1,
   )

    phase3_forensics = analyze_field_forensics(
      fields,
      image_path=preferred_ocr_image,
      image_size=_image_size(preferred_ocr_image),
      pdf_forensics=pdf_forensics,
    )

    phase3_signals = []

    for field_name, field_result in (
        phase3_forensics.get("fields", {}).items()
    ):
        field_bbox = field_result.get("bbox")

        for signal in field_result.get("signals", []):
            if not signal:
                continue

            # Limitations mean the detector did not have enough
            # evidence. They must NOT contribute risk.
            if signal.get("type") == "limitation":
                continue

            normalized_signal = dict(signal)

            normalized_signal["field"] = field_name

            if field_bbox:
                normalized_signal["bbox"] = field_bbox

            phase3_signals.append(
                normalized_signal
            )

    # Add Phase 3 evidence to the generic signal stream.
    signals.extend(phase3_signals)

        # Independent AI visual-forensics evidence.
    gemini_signals = run_gemini_forensics(
        preferred_ocr_image
    )

    signals.extend(gemini_signals)
        # P1: Build generic evidence-family representation
       # Generic evidence-family representation
    evidence_families = build_evidence_families(signals)
    coverage = evidence_coverage(evidence_families)

    risk = aggregate_document_risk(evidence_families)

    # Generic evidence result.
    # Use the existing signals/families without requiring a
    # document-specific schema.
    evidence_result = {
      "risk": {
         "score": risk["score"],
         "bucket": risk["bucket"],
         "verdict": risk["verdict"],
         "confidence": risk["confidence"],
         "graphCorroborationBonus": risk["graph_corroboration_bonus"],
         "graphNodeActivations": risk["graph_node_activations"],
        },
     "evidenceCoverage": risk["coverage"],
     "evidenceFamilies": evidence_families,
     "suspiciousRegions": _suspicious_regions(
        phase3_forensics
       ),  
    }

    document_type = (
        pdf_forensics.get("document_type")
        if pdf_forensics
        else "IMAGE"
    )

    result = {
     "riskScore": evidence_result["risk"]["score"],
     "riskBucket": evidence_result["risk"]["bucket"],
     "verdict": evidence_result["risk"]["verdict"],
     "confidence": evidence_result["risk"]["confidence"],
     "graphCorroborationBonus": evidence_result["risk"]["graphCorroborationBonus"],
     "graphNodeActivations": evidence_result["risk"]["graphNodeActivations"],

     "documentType": document_type,
     "evidenceCoverage": evidence_result["evidenceCoverage"],
     "evidenceFamilies": evidence_result["evidenceFamilies"],
     "suspiciousRegions": evidence_result["suspiciousRegions"],

    # Legacy compatibility
     "signals": [_clean_signal(s) for s in legacy_signals],
     "phase1Forensics": pdf_forensics,
     "_tempFiles": (
        [
            item.get("path")
            for item in (pdf_forensics or {}).get("extracted_images", [])
            if item.get("path")
        ]
     ),

    # Existing Phase 2/3
     "fields": fields,
     "phase3FieldForensics": phase3_forensics,
    }

    return result
