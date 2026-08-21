from __future__ import annotations

import re
from typing import Any, Optional


MIN_TOKEN_CONFIDENCE = 0.50
MIN_FIELD_CONFIDENCE = 0.55
AMBIGUOUS_CONFIDENCE_DELTA = 0.05
LINE_Y_TOLERANCE_RATIO = 0.60

FIELD_ORDER = [
    "owner_name",
    "vehicle_number",
    "challan_number",
    "issue_date",
    "violation_date",
    "expiry_date",
    "amount",
    "amount_in_words",
    "address",
]

FIELD_CONFIG = {
    "owner_name": {
        "anchors": ["Owner Name", "Owner", "Name"],
    },
    "vehicle_number": {
        "anchors": [
            "Vehicle Number",
            "Vehicle No",
            "Vehicle Reg No",
            "Registration Number",
            "Registration No",
            "Reg No",
        ],
    },
    "challan_number": {
        "anchors": [
            "Challan Number",
            "Challan No",
            "E Challan No",
            "Reference Number",
            "Reference No",
            "Ref No",
        ],
    },
    "issue_date": {
        "anchors": [
            "Issue Date",
            "Issued Date",
            "Challan Date",
            "Date of Issue",
        ],
    },
    "violation_date": {
        "anchors": [
            "Violation Date",
            "Offence Date",
            "Offense Date",
            "Date of Violation",
            "Date of Offence",
            "Date of Offense",
        ],
    },
    "expiry_date": {
        "anchors": [
            "Expiry Date",
            "Due Date",
            "Valid Till",
            "Last Date",
            "Payment Due Date",
        ],
    },
    "amount": {
        "anchors": [
            "Total Amount",
            "Amount",
            "Fine",
            "Penalty",
            "Compounding Fee",
        ],
    },
    "amount_in_words": {
        "anchors": [
            "Amount in Words",
            "Rupees in Words",
            "In Words",
        ],
    },
    "address": {
        "anchors": [
            "Address",
            "Owner Address",
            "Residence Address",
        ],
    },
}

NEXT_ANCHOR_WORDS = {
    word
    for config in FIELD_CONFIG.values()
    for anchor in config["anchors"]
    for word in re.findall(r"[A-Za-z]+", anchor.upper())
}


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, float(value)))


def _collapse_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_label(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", " ", value.upper())
    return _collapse_spaces(cleaned)


def normalize_vehicle_number(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", value.upper())


def normalize_owner_name(value: str) -> str:
    normalized = value.upper().replace(".", " ")
    normalized = re.sub(r"[^A-Z0-9\s]", " ", normalized)
    return _collapse_spaces(normalized)


def normalize_date(value: str) -> Optional[str]:
    match = re.search(
        r"\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b",
        value,
    )
    if not match:
        return None

    day = int(match.group(1))
    month = int(match.group(2))
    year = int(match.group(3))

    if year < 100:
        year += 2000

    if not (1 <= day <= 31 and 1 <= month <= 12 and 2000 <= year <= 2099):
        return None

    return f"{year:04d}-{month:02d}-{day:02d}"


def normalize_amount(value: str) -> Optional[str]:
    match = re.search(
        r"(?:₹|RS\.?|INR)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)",
        value,
        re.IGNORECASE,
    )
    if not match:
        return None

    raw_number = match.group(1).replace(",", "")
    try:
        amount = float(raw_number)
    except ValueError:
        return None

    if amount <= 0:
        return None

    if amount.is_integer():
        return str(int(amount))

    return f"{amount:.2f}"


def _bbox_union(items: list[dict]) -> dict:
    left = min(item["x"] for item in items)
    top = min(item["y"] for item in items)
    right = max(item["right"] for item in items)
    bottom = max(item["bottom"] for item in items)
    return {
        "x": left,
        "y": top,
        "width": right - left,
        "height": bottom - top,
    }


def _bbox_percent(bbox: dict, image_size: Optional[tuple[int, int]]) -> dict:
    if not image_size:
        return {
            "x": round(bbox["x"], 2),
            "y": round(bbox["y"], 2),
            "width": round(bbox["width"], 2),
            "height": round(bbox["height"], 2),
        }

    width, height = image_size
    if width <= 0 or height <= 0:
        return {
            "x": 0.0,
            "y": 0.0,
            "width": 0.0,
            "height": 0.0,
        }

    return {
        "x": round(_clamp(bbox["x"] / width * 100.0, 0.0, 100.0), 2),
        "y": round(_clamp(bbox["y"] / height * 100.0, 0.0, 100.0), 2),
        "width": round(_clamp(bbox["width"] / width * 100.0, 0.0, 100.0), 2),
        "height": round(_clamp(bbox["height"] / height * 100.0, 0.0, 100.0), 2),
    }


def normalize_ocr_tokens(
    words: list[dict],
    *,
    page: int = 1,
) -> list[dict]:
    tokens = []

    for word in words:
        raw_text = str(word.get("text", "")).strip()
        if not raw_text:
            continue

        confidence = float(word.get("score", word.get("confidence", 0.0)))
        x = float(word.get("x", 0.0))
        y = float(word.get("y", 0.0))
        width = float(word.get("w", word.get("width", 0.0)))
        height = float(word.get("h", word.get("height", 0.0)))
        right = float(word.get("right", x + width))
        bottom = float(word.get("bottom", y + height))

        if right <= x or bottom <= y:
            continue

        tokens.append(
            {
                "text": raw_text,
                "normalized_text": normalize_label(raw_text),
                "confidence": confidence,
                "x": x,
                "y": y,
                "width": right - x,
                "height": bottom - y,
                "right": right,
                "bottom": bottom,
                "page": int(word.get("page", page)),
            }
        )

    return sorted(tokens, key=lambda item: (item["page"], item["y"], item["x"]))


def _group_lines(tokens: list[dict]) -> list[dict]:
    lines: list[list[dict]] = []

    for token in tokens:
        center_y = token["y"] + token["height"] / 2
        placed = False

        for line in lines:
            median_height = sorted(item["height"] for item in line)[len(line) // 2]
            line_center = sum(
                item["y"] + item["height"] / 2
                for item in line
            ) / len(line)

            if abs(center_y - line_center) <= max(4.0, median_height * LINE_Y_TOLERANCE_RATIO):
                line.append(token)
                placed = True
                break

        if not placed:
            lines.append([token])

    normalized_lines = []
    for line in lines:
        line.sort(key=lambda item: item["x"])
        normalized_lines.append(
            {
                "tokens": line,
                "text": _collapse_spaces(" ".join(item["text"] for item in line)),
                "normalized_text": normalize_label(
                    " ".join(item["text"] for item in line)
                ),
                "bbox": _bbox_union(line),
                "page": line[0]["page"],
            }
        )

    return sorted(normalized_lines, key=lambda item: (item["page"], item["bbox"]["y"]))


def _anchor_match(line: dict, anchor: str) -> Optional[dict]:
    anchor_words = normalize_label(anchor).split()
    token_words = [token["normalized_text"] for token in line["tokens"]]

    for start in range(0, len(token_words)):
        end = start + len(anchor_words)
        if token_words[start:end] == anchor_words:
            tokens = line["tokens"][start:end]
            return {
                "anchor": anchor,
                "bbox": _bbox_union(tokens),
                "token_start": start,
                "token_end": end,
                "confidence": sum(token["confidence"] for token in tokens) / len(tokens),
                # True when the matched anchor span covers every token on the
                # line, i.e. there is no token left over to represent "the
                # rest of the line". This happens legitimately when a label
                # has no value on the same line, but it also happens when the
                # OCR engine returned a single merged box containing both the
                # label and the value as one token (common for OCR engines
                # that detect whole printed lines rather than individual
                # words). Callers use this to fall back to a same-line
                # "merged token" extraction path instead of silently
                # dropping the field.
                "merged": (end - start) == len(line["tokens"]),
            }

    line_text = line["normalized_text"]
    if normalize_label(anchor) in line_text:
        return {
            "anchor": anchor,
            "bbox": line["bbox"],
            "token_start": 0,
            "token_end": len(line["tokens"]),
            "confidence": sum(token["confidence"] for token in line["tokens"]) / len(line["tokens"]),
            "merged": True,
        }

    return None


def _strip_inline_anchor(text: str, anchor: str) -> str:
    pattern = r"\b" + r"\s*[:#\-]?\s*".join(
        re.escape(part)
        for part in anchor.split()
    ) + r"\b\s*[:#\-]?\s*"

    stripped = re.sub(pattern, "", text, count=1, flags=re.IGNORECASE).strip()
    return stripped if stripped != text else ""


def _looks_like_anchor_line(line: dict) -> bool:
    words = set(line["normalized_text"].split())
    return bool(words & NEXT_ANCHOR_WORDS)


def _candidate_tokens_to_right(line: dict, match: dict) -> list[dict]:
    right_edge = match["bbox"]["x"] + match["bbox"]["width"]
    tokens = [
        token
        for token in line["tokens"]
        if token["x"] >= right_edge - 1
        and token["confidence"] >= MIN_TOKEN_CONFIDENCE
        and token["normalized_text"] not in {":", "#", "-"}
    ]

    if not tokens and match["token_end"] < len(line["tokens"]):
        tokens = [
            token
            for token in line["tokens"][match["token_end"]:]
            if token["confidence"] >= MIN_TOKEN_CONFIDENCE
        ]

    return tokens


def _candidate_lines_below(lines: list[dict], line_index: int, match: dict) -> list[dict]:
    source_line = lines[line_index]
    source_bbox = source_line["bbox"]
    anchor_left = match["bbox"]["x"]
    max_gap = max(source_bbox["height"] * 4.5, 60.0)
    candidates = []

    for next_line in lines[line_index + 1: line_index + 5]:
        if next_line["page"] != source_line["page"]:
            break

        vertical_gap = next_line["bbox"]["y"] - (source_bbox["y"] + source_bbox["height"])
        if vertical_gap < -2:
            continue
        if vertical_gap > max_gap:
            break
        if _looks_like_anchor_line(next_line):
            break

        horizontal_near = (
            abs(next_line["bbox"]["x"] - anchor_left) <= max(source_bbox["width"], 220.0)
            or next_line["bbox"]["x"] <= source_bbox["x"] + source_bbox["width"] + 80.0
        )
        if horizontal_near:
            candidates.append(next_line)

    return candidates


def _field_value(field: str, raw_value: str) -> tuple[Optional[str], float]:
    value = raw_value.strip(" :-#\t")
    if not value:
        return None, 0.0

    if field == "vehicle_number":
        normalized = normalize_vehicle_number(value)
        if re.fullmatch(r"[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}", normalized):
            return normalized, 1.0
        return None, 0.0

    if field == "owner_name":
        normalized = normalize_owner_name(value)
        if len(normalized.split()) >= 2 and re.search(r"[A-Z]", normalized):
            return normalized, 0.82
        return None, 0.0

    if field == "challan_number":
        normalized = re.sub(r"[^A-Za-z0-9]", "", value).upper()
        if len(normalized) >= 5 and re.search(r"\d", normalized):
            return normalized, 0.86
        return None, 0.0

    if field in {"issue_date", "violation_date", "expiry_date"}:
        normalized = normalize_date(value)
        if normalized:
            return normalized, 0.95
        return None, 0.0

    if field == "amount":
        normalized = normalize_amount(value)
        if normalized:
            return normalized, 0.90
        return None, 0.0

    if field == "amount_in_words":
        normalized = normalize_owner_name(value)
        has_money_word = bool(
            re.search(
                r"\b(RUPEES?|ONLY|HUNDRED|THOUSAND|LAKH|CRORE|FIFTY|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\b",
                normalized,
            )
        )
        if has_money_word and len(normalized.split()) >= 2:
            return normalized, 0.78
        return None, 0.0

    if field == "address":
        normalized = _collapse_spaces(value)
        if len(normalized) >= 8 and re.search(r"[A-Za-z]", normalized):
            return normalized, 0.74
        return None, 0.0

    return value, 0.5


def _make_candidate(
    field: str,
    raw_value: str,
    value_tokens: list[dict],
    *,
    anchor: str,
    anchor_confidence: float,
    relationship: str,
    image_size: Optional[tuple[int, int]],
    merged_token: bool = False,
) -> Optional[dict]:
    normalized_value, format_confidence = _field_value(field, raw_value)
    if normalized_value is None or not value_tokens:
        return None

    ocr_confidence = sum(token["confidence"] for token in value_tokens) / len(value_tokens)
    if ocr_confidence < MIN_TOKEN_CONFIDENCE:
        return None

    relationship_confidence = {
        "same_line_inline": 0.95,
        "same_line_right": 0.90,
        "below": 0.78,
        "multiline_below": 0.76,
        # Label and value shared a single OCR detection box (no separate
        # value-only token/box was available). The value text itself was
        # still recovered reliably via string stripping, but the geometry
        # (bbox, height, alignment) describes the whole label+value box,
        # not the value alone, so this is intentionally scored lower than
        # a cleanly separated same-line match.
        "same_line_inline_merged": 0.62,
    }.get(relationship, 0.65)

    confidence = (
        0.35 * ocr_confidence
        + 0.25 * anchor_confidence
        + 0.25 * relationship_confidence
        + 0.15 * format_confidence
    )

    if confidence < MIN_FIELD_CONFIDENCE:
        return None

    return {
        "field": field,
        "raw_value": _collapse_spaces(raw_value),
        "normalized_value": normalized_value,
        "confidence": round(_clamp(confidence, 0.0, 1.0), 3),
        "bbox": _bbox_percent(_bbox_union(value_tokens), image_size),
        "page": value_tokens[0]["page"],
        "source": "ocr",
        "anchor": anchor,
        "relationship": relationship,
        "ocr_confidence": round(ocr_confidence, 3),
        "anchor_confidence": round(anchor_confidence, 3),
        "format_confidence": round(format_confidence, 3),
        # Marks candidates whose bbox/tokens represent a whole label+value
        # OCR box rather than a value-only region. Downstream forensic
        # signals that depend on isolating the value's own geometry
        # (relative text size, baseline alignment) should treat this as a
        # limitation rather than computing a misleading severity.
        "merged_token": merged_token,
    }


def _dedupe_candidates(candidates: list[dict]) -> list[dict]:
    deduped = []
    seen = set()

    for candidate in sorted(
        candidates,
        key=lambda item: (
            -item["confidence"],
            item["page"],
            item["bbox"]["y"],
            item["bbox"]["x"],
        ),
    ):
        key = (
            candidate["field"],
            candidate["normalized_value"],
            candidate["page"],
            round(candidate["bbox"]["x"], 1),
            round(candidate["bbox"]["y"], 1),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(candidate)

    return deduped


def _select_candidate(candidates: list[dict]) -> tuple[Optional[dict], str]:
    if not candidates:
        return None, "no reliable anchored candidate"

    sorted_candidates = sorted(
        candidates,
        key=lambda item: item["confidence"],
        reverse=True,
    )
    best = sorted_candidates[0]

    if len(sorted_candidates) > 1:
        second = sorted_candidates[1]
        different_value = best["normalized_value"] != second["normalized_value"]
        close = best["confidence"] - second["confidence"] < AMBIGUOUS_CONFIDENCE_DELTA
        if different_value and close:
            return None, "ambiguous candidates with similar confidence"

    return best, "highest contextual confidence"


def _extract_for_anchor(
    field: str,
    lines: list[dict],
    line_index: int,
    match: dict,
    *,
    image_size: Optional[tuple[int, int]],
) -> list[dict]:
    line = lines[line_index]
    candidates = []

    inline_value = _strip_inline_anchor(line["text"], match["anchor"])
    right_tokens = _candidate_tokens_to_right(line, match)

    if inline_value and right_tokens:
        candidate = _make_candidate(
            field,
            inline_value,
            right_tokens,
            anchor=match["anchor"],
            anchor_confidence=match["confidence"],
            relationship="same_line_inline",
            image_size=image_size,
        )
        if candidate:
            candidates.append(candidate)

    if not right_tokens and inline_value and match.get("merged"):
        # No separate value-only token/box exists on this line (the OCR
        # engine returned the label and value as one merged box). The
        # value text was still recovered via string stripping, so use the
        # anchor's own token span as an approximate stand-in for geometry
        # (confidence, bbox) rather than dropping the field entirely.
        merged_tokens = line["tokens"][match["token_start"]:match["token_end"]]
        merged_tokens = [
            token for token in merged_tokens
            if token["confidence"] >= MIN_TOKEN_CONFIDENCE
        ]
        if merged_tokens:
            candidate = _make_candidate(
                field,
                inline_value,
                merged_tokens,
                anchor=match["anchor"],
                anchor_confidence=match["confidence"],
                relationship="same_line_inline_merged",
                image_size=image_size,
                merged_token=True,
            )
            if candidate:
                candidates.append(candidate)

    if right_tokens:
        right_text = _collapse_spaces(" ".join(token["text"] for token in right_tokens))
        candidate = _make_candidate(
            field,
            right_text,
            right_tokens,
            anchor=match["anchor"],
            anchor_confidence=match["confidence"],
            relationship="same_line_right",
            image_size=image_size,
        )
        if candidate:
            candidates.append(candidate)

    below_lines = _candidate_lines_below(lines, line_index, match)
    if field == "address" and below_lines:
        address_lines = below_lines[:3]
        address_tokens = [
            token
            for address_line in address_lines
            for token in address_line["tokens"]
            if token["confidence"] >= MIN_TOKEN_CONFIDENCE
        ]
        address_text = _collapse_spaces(" ".join(line["text"] for line in address_lines))
        candidate = _make_candidate(
            field,
            address_text,
            address_tokens,
            anchor=match["anchor"],
            anchor_confidence=match["confidence"],
            relationship="multiline_below",
            image_size=image_size,
        )
        if candidate:
            candidates.append(candidate)
    else:
        for below_line in below_lines:
            below_tokens = [
                token
                for token in below_line["tokens"]
                if token["confidence"] >= MIN_TOKEN_CONFIDENCE
            ]
            below_text = _collapse_spaces(" ".join(token["text"] for token in below_tokens))
            candidate = _make_candidate(
                field,
                below_text,
                below_tokens,
                anchor=match["anchor"],
                anchor_confidence=match["confidence"],
                relationship="below",
                image_size=image_size,
            )
            if candidate:
                candidates.append(candidate)

    return candidates


def extract_fields_from_ocr(
    words: list[dict],
    *,
    image_size: Optional[tuple[int, int]] = None,
    page: int = 1,
) -> dict:
    tokens = normalize_ocr_tokens(words, page=page)
    lines = _group_lines(tokens)

    fields = {}

    for field in FIELD_ORDER:
        candidates = []
        for line_index, line in enumerate(lines):
            line_matches = []
            for anchor in FIELD_CONFIG[field]["anchors"]:
                match = _anchor_match(line, anchor)
                if not match:
                    continue
                line_matches.append(match)

            if not line_matches:
                continue

            max_anchor_words = max(
                len(normalize_label(match["anchor"]).split())
                for match in line_matches
            )

            for match in line_matches:
                if len(normalize_label(match["anchor"]).split()) < max_anchor_words:
                    continue
                candidates.extend(
                    _extract_for_anchor(
                        field,
                        lines,
                        line_index,
                        match,
                        image_size=image_size,
                    )
                )

        candidates = _dedupe_candidates(candidates)
        selected, reason = _select_candidate(candidates)
        fields[field] = {
            "field": field,
            "candidates": candidates,
            "selected": selected,
            "selection_reason": reason,
        }

    return {
        "source": "ocr",
        "tokens": tokens,
        "fields": fields,
        "field_order": FIELD_ORDER,
    }