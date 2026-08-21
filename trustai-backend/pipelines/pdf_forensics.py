from __future__ import annotations

import os
import uuid
from io import BytesIO
from typing import Any, Optional

import fitz
from PIL import ExifTags, Image

from pipelines.qr_forensics import detect_qr_in_image


MEANINGFUL_IMAGE_AREA_RATIO = 0.05
RENDER_DPI = 200


def _round_rect(rect: fitz.Rect) -> tuple[float, float, float, float]:
    return (
        round(rect.x0, 2),
        round(rect.y0, 2),
        round(rect.x1, 2),
        round(rect.y1, 2),
    )


def _image_metadata(image_bytes: bytes) -> dict:
    metadata: dict[str, Any] = {}

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            metadata["mode"] = image.mode
            metadata["format"] = image.format

            exif = image.getexif()
            if exif:
                metadata["exif"] = {
                    ExifTags.TAGS.get(tag_id, str(tag_id)): str(value)
                    for tag_id, value in exif.items()
                }

            info = {
                str(key): str(value)
                for key, value in (getattr(image, "info", {}) or {}).items()
                if key not in {"icc_profile", "exif"}
            }
            if info:
                metadata["info"] = info
    except Exception as exc:
        metadata["error"] = type(exc).__name__

    return metadata


def _image_rects(page: fitz.Page, xref: int) -> list[tuple[float, float, float, float]]:
    rects = []

    for rect in page.get_image_rects(xref):
        rects.append(_round_rect(rect))

    return rects


def _largest_meaningful_image(page: fitz.Page, images: list[dict]) -> Optional[dict]:
    page_area = max(page.rect.width * page.rect.height, 1.0)
    candidates = []

    for image in images:
        rect_areas = []
        for rect in page.get_image_rects(image["xref"]):
            rect_areas.append(max(rect.width * rect.height, 0.0))

        displayed_area = max(rect_areas) if rect_areas else 0.0
        pixel_area = image.get("width", 0) * image.get("height", 0)
        area_ratio = displayed_area / page_area

        if area_ratio >= MEANINGFUL_IMAGE_AREA_RATIO or not rect_areas:
            candidates.append((displayed_area, pixel_area, image))

    if not candidates:
        return None

    candidates.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return candidates[0][2]


def _render_page_image(
    page: fitz.Page,
    output_dir: str,
    pdf_stem: str,
    page_number: int,
) -> dict:
    matrix = fitz.Matrix(RENDER_DPI / 72, RENDER_DPI / 72)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)

    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(
        output_dir,
        f"{pdf_stem}_page{page_number}_render_{uuid.uuid4().hex}.png",
    )
    pixmap.save(path)

    return {
        "page": page_number,
        "image_extracted": False,
        "fallback_rendered": True,
        "path": path,
        "width": pixmap.width,
        "height": pixmap.height,
        "format": "png",
        "source": "page_render",
        "metadata": {},
    }


def _extract_embedded_image(
    doc: fitz.Document,
    image: dict,
    output_dir: str,
    pdf_stem: str,
    page_number: int,
) -> dict:
    extracted = doc.extract_image(image["xref"])
    image_bytes = extracted.get("image", b"")
    image_ext = (extracted.get("ext") or "bin").lower()

    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(
        output_dir,
        f"{pdf_stem}_page{page_number}_xref{image['xref']}_{uuid.uuid4().hex}.{image_ext}",
    )

    with open(path, "wb") as handle:
        handle.write(image_bytes)

    return {
        "page": page_number,
        "image_extracted": True,
        "fallback_rendered": False,
        "path": path,
        "width": int(extracted.get("width") or image.get("width") or 0),
        "height": int(extracted.get("height") or image.get("height") or 0),
        "format": image_ext,
        "source": "embedded_image",
        "xref": image["xref"],
        "metadata": _image_metadata(image_bytes),
    }


def _classify_page(text_span_count: int, meaningful_image_count: int) -> str:
    if text_span_count > 0 and meaningful_image_count > 0:
        return "MIXED"
    if text_span_count > 0:
        return "NATIVE"
    if meaningful_image_count > 0:
        return "RASTER"
    return "UNKNOWN"


def _classify_document(page_types: list[str]) -> str:
    if not page_types:
        return "UNKNOWN"

    unique_types = set(page_types)
    if unique_types == {"NATIVE"}:
        return "NATIVE"
    if unique_types == {"RASTER"}:
        return "RASTER"
    if "MIXED" in unique_types:
        return "MIXED"
    if "NATIVE" in unique_types and "RASTER" in unique_types:
        return "MIXED"
    return "UNKNOWN"


def _limitations(document_type: str) -> list[str]:
    if document_type == "RASTER":
        return [
            "No extractable text layer",
            "Native PDF font analysis unavailable",
        ]
    if document_type == "MIXED":
        return [
            "Some evidence may come from rasterized page images",
            "Native PDF font analysis may be incomplete",
        ]
    if document_type == "UNKNOWN":
        return [
            "No meaningful text or embedded page image was detected",
        ]
    return []


def analyze_pdf_structure(
    pdf_path: str,
    *,
    extract_images: bool = False,
    output_dir: Optional[str] = None,
) -> dict:
    """
    Extract structural forensic information from a PDF.

    This does NOT decide whether the document is genuine or tampered.
    It only identifies structural routing evidence for later checks.
    """

    result = {
        "file": pdf_path,
        "pages": [],
        "page_count": 0,
        "total_text_spans": 0,
        "total_images": 0,
        "total_drawings": 0,
        "metadata": {},
        "document_type": "UNKNOWN",
        "is_rasterized": False,
        "structural_forensics_available": False,
        "limitations": [],
        "extracted_images": [],
        "qr": [],
        "errors": [],
        "warnings": [],
    }

    if not os.path.isfile(pdf_path):
        result["errors"].append("PDF file does not exist.")
        return result

    try:
        doc = fitz.open(pdf_path)
    except Exception as exc:
        result["errors"].append(f"PDF open error: {type(exc).__name__}.")
        return result

    pdf_stem = os.path.splitext(os.path.basename(pdf_path))[0]

    try:
        result["metadata"] = doc.metadata or {}
        result["page_count"] = len(doc)
        page_types = []

        for page_number, page in enumerate(doc, start=1):
            page_width = round(page.rect.width, 2)
            page_height = round(page.rect.height, 2)

            page_data = {
                "page": page_number,
                "page_dimensions": {
                    "width": page_width,
                    "height": page_height,
                },
                "text_spans": [],
                "text_span_count": 0,
                "images": [],
                "image_count": 0,
                "meaningful_image_count": 0,
                "drawings": [],
                "drawing_count": 0,
                "fonts": [],
                "page_type": "UNKNOWN",
                "extracted_image": None,
                "qr": [],
            }

            text_dict = page.get_text("dict")

            for block in text_dict.get("blocks", []):
                if block.get("type") != 0:
                    continue

                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        if not text:
                            continue

                        span_data = {
                            "text": text,
                            "font": span.get("font"),
                            "size": float(span.get("size", 0)),
                            "bbox": tuple(round(x, 2) for x in span.get("bbox", [])),
                            "flags": span.get("flags"),
                            "color": span.get("color"),
                        }

                        page_data["text_spans"].append(span_data)
                        result["total_text_spans"] += 1

            font_names = sorted(
                {
                    span.get("font")
                    for span in page_data["text_spans"]
                    if span.get("font")
                }
            )
            page_data["fonts"] = font_names

            images = page.get_images(full=True)
            page_area = max(page.rect.width * page.rect.height, 1.0)

            for image in images:
                xref = image[0]
                rects = _image_rects(page, xref)
                displayed_areas = [
                    max((rect[2] - rect[0]) * (rect[3] - rect[1]), 0.0)
                    for rect in rects
                ]
                largest_displayed_area = max(displayed_areas) if displayed_areas else 0.0

                image_data = {
                    "xref": xref,
                    "width": image[2],
                    "height": image[3],
                    "bits_per_component": image[4],
                    "colorspace": image[5],
                    "name": image[7] if len(image) > 7 else None,
                    "rects": rects,
                    "displayed_area_ratio": round(
                        largest_displayed_area / page_area,
                        4,
                    ),
                    "meaningful": (
                        largest_displayed_area / page_area
                        >= MEANINGFUL_IMAGE_AREA_RATIO
                    ),
                }

                page_data["images"].append(image_data)
                result["total_images"] += 1

            drawings = page.get_drawings()

            for drawing in drawings:
                drawing_data = {
                    "type": drawing.get("type"),
                    "rect": _round_rect(drawing["rect"]),
                    "fill": drawing.get("fill"),
                    "color": drawing.get("color"),
                }

                page_data["drawings"].append(drawing_data)
                result["total_drawings"] += 1

            page_data["text_span_count"] = len(page_data["text_spans"])
            page_data["image_count"] = len(page_data["images"])
            page_data["drawing_count"] = len(page_data["drawings"])
            page_data["meaningful_image_count"] = sum(
                1 for image in page_data["images"] if image["meaningful"]
            )
            page_data["page_type"] = _classify_page(
                page_data["text_span_count"],
                page_data["meaningful_image_count"],
            )
            page_types.append(page_data["page_type"])

            should_extract = (
                extract_images
                and page_data["page_type"] in {"RASTER", "MIXED"}
            )

            if should_extract:
                if not output_dir:
                    output_dir = os.path.dirname(pdf_path) or "."

                selected = _largest_meaningful_image(page, page_data["images"])
                extracted_image = None

                if selected is not None:
                    try:
                        extracted_image = _extract_embedded_image(
                            doc,
                            selected,
                            output_dir,
                            pdf_stem,
                            page_number,
                        )
                    except Exception as exc:
                        result["warnings"].append(
                            "Embedded image extraction failed on "
                            f"page {page_number}: {type(exc).__name__}."
                        )

                if extracted_image is None:
                    extracted_image = _render_page_image(
                        page,
                        output_dir,
                        pdf_stem,
                        page_number,
                    )

                page_data["extracted_image"] = extracted_image
                result["extracted_images"].append(extracted_image)

                qr_result = detect_qr_in_image(
                    extracted_image["path"],
                    page=page_number,
                )
                page_data["qr"].append(qr_result)
                result["qr"].append(qr_result)

            result["pages"].append(page_data)

        result["document_type"] = _classify_document(page_types)
        result["is_rasterized"] = result["document_type"] == "RASTER"
        result["structural_forensics_available"] = result["document_type"] in {
            "NATIVE",
            "MIXED",
        }
        result["limitations"] = _limitations(result["document_type"])

    except Exception as exc:
        result["errors"].append(f"PDF analysis error: {type(exc).__name__}.")
    finally:
        doc.close()

    return result
