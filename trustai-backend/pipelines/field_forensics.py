from __future__ import annotations

import math
from collections import Counter, defaultdict
from typing import Optional

from PIL import Image, ImageStat


IMPORTANT_FIELDS = {
    "owner_name",
    "vehicle_number",
    "challan_number",
    "issue_date",
    "violation_date",
    "expiry_date",
    "amount",
    "amount_in_words",
    "address",
}


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, float(value)))


def _bbox_to_pixels(
    bbox: dict,
    image_size: Optional[tuple[int, int]],
) -> Optional[tuple[int, int, int, int]]:
    if not bbox or not image_size:
        return None

    image_width, image_height = image_size
    if image_width <= 0 or image_height <= 0:
        return None

    x = float(bbox.get("x", 0.0))
    y = float(bbox.get("y", 0.0))
    width = float(bbox.get("width", 0.0))
    height = float(bbox.get("height", 0.0))

    if x <= 100 and y <= 100 and width <= 100 and height <= 100:
        x = x / 100.0 * image_width
        y = y / 100.0 * image_height
        width = width / 100.0 * image_width
        height = height / 100.0 * image_height

    left = max(0, int(round(x)))
    top = max(0, int(round(y)))
    right = min(image_width, int(round(x + width)))
    bottom = min(image_height, int(round(y + height)))

    if right <= left or bottom <= top:
        return None

    return left, top, right, bottom


def _signal(
    signal_type: str,
    severity: float,
    explanation: str,
    *,
    evidence: Optional[dict] = None,
) -> dict:
    return {
        "type": signal_type,
        "severity": round(_clamp(severity), 3),
        "explanation": explanation,
        "evidence": evidence or {},
    }


def _limitation(message: str) -> dict:
    return {
        "type": "limitation",
        "severity": 0.0,
        "explanation": message,
        "evidence": {},
    }


def _value_tokens(candidate: dict, tokens: list[dict]) -> list[dict]:
    if not candidate:
        return []

    page = candidate.get("page")
    raw_words = set(str(candidate.get("raw_value", "")).upper().split())
    normalized = str(candidate.get("normalized_value", "")).upper()

    normalized_compact = "".join(ch for ch in normalized if ch.isalnum())

    matched = []
    for token in tokens:
        if page is not None and token.get("page") != page:
            continue

        text = str(token.get("text", "")).upper()
        compact = "".join(ch for ch in text if ch.isalnum())
        # Two directions are checked because OCR token granularity varies:
        # - token is a fragment of the value (word-level OCR): token's own
        #   compact text is a substring of the candidate's normalized value.
        # - token is a merged label+value box (line-level OCR): the
        #   candidate's normalized value is a substring of the token's text.
        if (
            text in raw_words
            or (compact and compact in normalized)
            or (compact and normalized_compact and normalized_compact in compact)
        ):
            matched.append(token)

    return matched


def _neighbor_tokens(
    candidate: dict,
    tokens: list[dict],
    *,
    vertical_factor: float = 1.5,
) -> list[dict]:
    value_tokens = _value_tokens(candidate, tokens)
    if not value_tokens:
        return []

    page = candidate.get("page")
    top = min(token["y"] for token in value_tokens)
    bottom = max(token["bottom"] for token in value_tokens)
    height = max(bottom - top, 1.0)
    center_y = (top + bottom) / 2.0
    value_left = min(token["x"] for token in value_tokens)
    value_right = max(token["right"] for token in value_tokens)

    neighbors = []
    for token in tokens:
        if page is not None and token.get("page") != page:
            continue
        if token in value_tokens:
            continue

        token_center = (token["y"] + token["bottom"]) / 2.0
        same_band = abs(token_center - center_y) <= max(height * vertical_factor, 8.0)
        near_x = token["right"] >= value_left - 260 and token["x"] <= value_right + 260
        if same_band and near_x:
            neighbors.append(token)

    return neighbors


def _ocr_signal(candidate: Optional[dict]) -> dict:
    if not candidate:
        return _limitation("Field was not reliably located by Phase 2.")

    confidence = float(candidate.get("ocr_confidence", candidate.get("confidence", 0.0)))
    severity = _clamp(1.0 - confidence)
    return _signal(
        "ocr_confidence",
        severity,
        "OCR confidence for the selected field value.",
        evidence={"ocr_confidence": round(confidence, 3)},
    )


def _text_size_signal(candidate: dict, tokens: list[dict]) -> Optional[dict]:
    if candidate.get("merged_token"):
        return _limitation(
            "Field value shares a single OCR detection box with its label; "
            "the value's own text height cannot be isolated, so relative "
            "size evidence is not available."
        )

    value_tokens = _value_tokens(candidate, tokens)
    neighbors = _neighbor_tokens(candidate, tokens)
    if not value_tokens or len(neighbors) < 2:
        return _limitation("Not enough neighboring OCR text for relative size comparison.")

    value_height = sum(token["height"] for token in value_tokens) / len(value_tokens)
    neighbor_height = sum(token["height"] for token in neighbors) / len(neighbors)
    ratio = value_height / max(neighbor_height, 1.0)
    severity = _clamp(abs(ratio - 1.0) / 0.6)

    return _signal(
        "relative_text_size",
        severity,
        "Text height compared with nearby OCR text.",
        evidence={
            "value_height": round(value_height, 2),
            "neighbor_height": round(neighbor_height, 2),
            "ratio": round(ratio, 3),
        },
    )


def _alignment_signal(candidate: dict, tokens: list[dict]) -> Optional[dict]:
    if candidate.get("merged_token"):
        return _limitation(
            "Field value shares a single OCR detection box with its label; "
            "the value's own baseline cannot be isolated, so alignment "
            "evidence is not available."
        )

    value_tokens = _value_tokens(candidate, tokens)
    neighbors = _neighbor_tokens(candidate, tokens)
    if not value_tokens or len(neighbors) < 2:
        return _limitation("Not enough neighboring OCR text for baseline comparison.")

    value_bottom = sum(token["bottom"] for token in value_tokens) / len(value_tokens)
    neighbor_bottoms = [token["bottom"] for token in neighbors]
    neighbor_bottoms.sort()
    median_neighbor = neighbor_bottoms[len(neighbor_bottoms) // 2]
    delta = abs(value_bottom - median_neighbor)
    reference_height = max(
        sum(token["height"] for token in value_tokens) / len(value_tokens),
        1.0,
    )
    severity = _clamp(delta / max(reference_height * 0.8, 1.0))

    return _signal(
        "baseline_alignment",
        severity,
        "Field baseline compared with nearby OCR text.",
        evidence={
            "value_bottom": round(value_bottom, 2),
            "neighbor_median_bottom": round(median_neighbor, 2),
            "delta": round(delta, 2),
        },
    )


def _spacing_signal(candidate: dict, tokens: list[dict]) -> Optional[dict]:
    value_tokens = sorted(_value_tokens(candidate, tokens), key=lambda token: token["x"])
    if len(value_tokens) < 2:
        return _limitation("Field value has too few OCR tokens for internal spacing comparison.")

    gaps = [
        max(0.0, right["x"] - left["right"])
        for left, right in zip(value_tokens, value_tokens[1:])
    ]
    if not gaps:
        return _limitation("No internal token gaps were available for spacing comparison.")

    avg_gap = sum(gaps) / len(gaps)
    avg_height = sum(token["height"] for token in value_tokens) / len(value_tokens)
    severity = _clamp(avg_gap / max(avg_height * 2.0, 1.0))

    return _signal(
        "internal_spacing",
        severity,
        "Spacing between OCR tokens inside the selected field value.",
        evidence={"average_gap": round(avg_gap, 2), "average_height": round(avg_height, 2)},
    )


def _crop_stats(
    image_path: Optional[str],
    bbox: dict,
    image_size: Optional[tuple[int, int]],
) -> Optional[dict]:
    pixel_box = _bbox_to_pixels(bbox, image_size)
    if not image_path or not pixel_box:
        return None

    try:
        with Image.open(image_path).convert("RGB") as image:
            crop = image.crop(pixel_box)
            if crop.width <= 0 or crop.height <= 0:
                return None
            stat = ImageStat.Stat(crop)
            gray = crop.convert("L")
            gray_stat = ImageStat.Stat(gray)
            return {
                "mean_rgb": [round(value, 2) for value in stat.mean],
                "stddev_rgb": [round(value, 2) for value in stat.stddev],
                "mean_luma": round(gray_stat.mean[0], 2),
                "stddev_luma": round(gray_stat.stddev[0], 2),
                "pixel_box": list(pixel_box),
            }
    except Exception:
        return None


def _expanded_bbox(pixel_box: tuple[int, int, int, int], image_size: tuple[int, int], pad: int = 12) -> tuple[int, int, int, int]:
    left, top, right, bottom = pixel_box
    width, height = image_size
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(width, right + pad),
        min(height, bottom + pad),
    )


def _background_signal(
    candidate: dict,
    image_path: Optional[str],
    image_size: Optional[tuple[int, int]],
) -> dict:
    pixel_box = _bbox_to_pixels(candidate.get("bbox", {}), image_size)
    if not image_path or not image_size or not pixel_box:
        return _limitation("No rendered image region was available for local background analysis.")

    try:
        with Image.open(image_path).convert("RGB") as image:
            field_crop = image.crop(pixel_box)
            expanded = image.crop(_expanded_bbox(pixel_box, image_size))
            field_luma = ImageStat.Stat(field_crop.convert("L"))
            expanded_luma = ImageStat.Stat(expanded.convert("L"))
            mean_delta = abs(field_luma.mean[0] - expanded_luma.mean[0])
            std_delta = abs(field_luma.stddev[0] - expanded_luma.stddev[0])
            severity = _clamp((mean_delta / 50.0) + (std_delta / 80.0))
            return _signal(
                "local_background",
                severity,
                "Local field background compared with the surrounding region.",
                evidence={
                    "field_mean_luma": round(field_luma.mean[0], 2),
                    "surrounding_mean_luma": round(expanded_luma.mean[0], 2),
                    "field_stddev_luma": round(field_luma.stddev[0], 2),
                    "surrounding_stddev_luma": round(expanded_luma.stddev[0], 2),
                    "pixel_box": list(pixel_box),
                },
            )
    except Exception as exc:
        return _limitation(f"Local background analysis failed: {type(exc).__name__}.")


def _native_font_signal(candidate: dict, pdf_forensics: Optional[dict]) -> dict:
    if not pdf_forensics:
        return _limitation("No PDF structural evidence was available.")

    document_type = pdf_forensics.get("document_type")
    if document_type == "RASTER":
        return _limitation("Native font evidence is unavailable for rasterized PDFs.")

    value = str(candidate.get("raw_value") or candidate.get("normalized_value") or "").upper()
    if not value:
        return _limitation("No selected field value was available for native font lookup.")

    matched_spans = []
    all_spans = []
    for page in pdf_forensics.get("pages", []):
        for span in page.get("text_spans", []):
            text = str(span.get("text", ""))
            if text:
                all_spans.append(span)
            if text.upper() and text.upper() in value:
                matched_spans.append(span)

    if not matched_spans:
        return _limitation("Selected value was not found in native PDF text spans.")

    fonts = sorted({span.get("font") for span in matched_spans if span.get("font")})
    sizes = [float(span.get("size", 0.0)) for span in matched_spans if span.get("size")]
    all_sizes = [float(span.get("size", 0.0)) for span in all_spans if span.get("size")]
    if not sizes or not all_sizes:
        return _limitation("Native font size evidence was incomplete.")

    avg_size = sum(sizes) / len(sizes)
    reference_size = sum(all_sizes) / len(all_sizes)
    severity = _clamp(abs(avg_size - reference_size) / max(reference_size * 0.5, 1.0))

    return _signal(
        "native_pdf_font",
        severity,
        "Native PDF font and size evidence for the selected value.",
        evidence={
            "fonts": fonts,
            "average_size": round(avg_size, 2),
            "document_average_size": round(reference_size, 2),
            "matched_span_count": len(matched_spans),
        },
    )


def _pdf_object_signal(candidate: dict, pdf_forensics: Optional[dict]) -> dict:
    if not pdf_forensics:
        return _limitation("No PDF object evidence was available.")

    page_number = candidate.get("page")
    page = None
    for item in pdf_forensics.get("pages", []):
        if item.get("page") == page_number:
            page = item
            break

    if not page:
        return _limitation("No page-level PDF object evidence was available for the field.")

    evidence = {
        "page_type": page.get("page_type"),
        "image_count": page.get("image_count"),
        "drawing_count": page.get("drawing_count"),
        "text_span_count": page.get("text_span_count"),
    }
    severity = 0.0
    explanation = "PDF object/layer context for the field page."

    if page.get("page_type") == "RASTER":
        explanation = "Field is located on a rasterized page image, so native text-object evidence is unavailable."
        severity = 0.25
    elif page.get("drawing_count", 0) > 0:
        explanation = "Page contains vector drawing objects that may be relevant to local overlays."
        severity = min(0.4, page.get("drawing_count", 0) / 20.0)

    return _signal("pdf_object_context", severity, explanation, evidence=evidence)


def _repeated_value_signal(field: str, candidate: dict, fields: dict) -> dict:
    field_data = fields.get("fields", {}).get(field, {})
    candidates = field_data.get("candidates") or []
    if not candidate:
        return _limitation("No selected field value was available for repeated-value analysis.")

    values = [item.get("normalized_value") for item in candidates if item.get("normalized_value")]
    if not values:
        return _limitation("No repeated field candidates were available.")

    counts = Counter(values)
    selected_value = candidate.get("normalized_value")
    different_values = sorted(value for value in counts if value != selected_value)
    severity = 0.0 if not different_values else min(1.0, 0.4 + 0.2 * len(different_values))

    return _signal(
        "repeated_occurrence",
        severity,
        "Repeated occurrences of the field value within Phase 2 candidates.",
        evidence={
            "selected_value": selected_value,
            "occurrences": counts.get(selected_value, 0),
            "different_candidate_values": different_values,
        },
    )


def _qr_signal(candidate: dict, pdf_forensics: Optional[dict]) -> dict:
    qr_items = (pdf_forensics or {}).get("qr") or []
    found = [item for item in qr_items if item.get("found")]
    if not found:
        return _limitation("No decoded QR/reference payload was available for this field.")

    payloads = [item.get("data") for item in found if item.get("data")]
    value = str(candidate.get("normalized_value") or candidate.get("raw_value") or "")
    payload_contains_value = any(value and value in payload for payload in payloads)
    severity = 0.0 if payload_contains_value else 0.15

    return _signal(
        "qr_reference_available",
        severity,
        "QR payload is available as raw reference evidence; no mandatory verification is performed in Phase 3.",
        evidence={
            "payload_count": len(payloads),
            "payload_contains_value": payload_contains_value,
        },
    )


def _field_confidence(signals: list[dict]) -> float:
    evidence_signals = [
        signal
        for signal in signals
        if signal.get("type") != "limitation"
    ]
    if not evidence_signals:
        return 0.0

    max_severity = max(signal.get("severity", 0.0) for signal in evidence_signals)
    support = min(1.0, len(evidence_signals) / 6.0)
    return round(_clamp((0.55 * max_severity) + (0.45 * support)), 3)


def analyze_field_forensics(
    fields: dict,
    *,
    image_path: Optional[str] = None,
    image_size: Optional[tuple[int, int]] = None,
    pdf_forensics: Optional[dict] = None,
) -> dict:
    tokens = fields.get("tokens", [])
    results = {}

    for field in fields.get("field_order", []):
        field_data = fields.get("fields", {}).get(field, {})
        selected = field_data.get("selected")
        signals = [_ocr_signal(selected)]

        if selected:
            signals.extend(
                [
                    _text_size_signal(selected, tokens),
                    _alignment_signal(selected, tokens),
                    _spacing_signal(selected, tokens),
                    _background_signal(selected, image_path, image_size),
                    _native_font_signal(selected, pdf_forensics),
                    _pdf_object_signal(selected, pdf_forensics),
                    _repeated_value_signal(field, selected, fields),
                    _qr_signal(selected, pdf_forensics),
                ]
            )

        anomalies = [
            signal
            for signal in signals
            if signal.get("type") != "limitation"
            and signal.get("severity", 0.0) >= 0.6
        ]
        limitations = [
            signal
            for signal in signals
            if signal.get("type") == "limitation"
        ]

        results[field] = {
            "field": field,
            "value": selected.get("normalized_value") if selected else None,
            "raw_value": selected.get("raw_value") if selected else None,
            "page": selected.get("page") if selected else None,
            "bbox": selected.get("bbox") if selected else None,
            "signals": signals,
            "anomalies": anomalies,
            "confidence": _field_confidence(signals),
            "evidence": {
                "candidate_count": len(field_data.get("candidates") or []),
                "selection_reason": field_data.get("selection_reason"),
            },
            "limitations": limitations,
        }

    return {
        "source": "phase3_field_forensics",
        "fields": results,
        "summary": {
            "field_count": len(results),
            "located_field_count": sum(
                1 for field in results.values() if field.get("value")
            ),
            "fields_with_anomalies": [
                name
                for name, field in results.items()
                if field.get("anomalies")
            ],
        },
    }