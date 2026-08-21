from __future__ import annotations

import json
import os
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL = "gemini-3.6-flash"


def run_gemini_forensics(image_path: str) -> list[dict]:
    """
    Gemini acts as an independent visual-forensics signal.

    IMPORTANT:
    Gemini does NOT make the final TRUSTAI verdict.
    Its findings are passed into the existing evidence-family
    aggregation system for corroboration with local signals.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        print("[Gemini] API key not configured.")
        return []

    if not os.path.isfile(image_path):
        print(f"[Gemini] Image not found: {image_path}")
        return []

    try:
        client = genai.Client(api_key=api_key)

        with open(image_path, "rb") as f:
            image_bytes = f.read()

        mime_type = _get_mime_type(image_path)

        prompt = """
You are the visual-forensics engine for TrustAI, a document authenticity system.

Analyze the supplied document image specifically for signs of digital manipulation, compositing,
editing, replacement, inconsistent rendering, pasted regions, altered text, inconsistent fonts,
inconsistent spacing, abnormal edges, resampling artifacts, compression inconsistencies,
background inconsistencies, or other evidence suggesting the document may have been modified.

Do NOT assume the document is authentic.
Do NOT assume the document is fake.

Only report anomalies that are visually observable in the supplied image.

For every observable anomaly, return:
- type
- severity: 0.0 to 1.0
- confidence: 0.0 to 1.0
- reason
- details

Return JSON only:

{
  "anomalies": [
    {
      "type": "visual_manipulation",
      "severity": 0.0,
      "confidence": 0.0,
      "reason": "...",
      "details": "..."
    }
  ]
}

If there genuinely is no observable anomaly, return:
{
  "anomalies": []
}

Do not invent evidence merely to increase the risk score.
"""

        response = client.models.generate_content(
            model=MODEL,
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type,
                ),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        raw = response.text or "{}"

        print("\n========== GEMINI RAW RESPONSE ==========")
        print(raw)
        print("=========================================\n")

        data = json.loads(raw)

        anomalies = data.get("anomalies", [])

        if not isinstance(anomalies, list):
            return []

        signals: list[dict] = []

        for anomaly in anomalies:
            if not isinstance(anomaly, dict):
                continue

            severity = _clamp(anomaly.get("severity", 0.0))
            confidence = _clamp(anomaly.get("confidence", 0.0))

            # Ignore weak observations.
            if severity < 0.30 or confidence < 0.40:
                continue

            bbox = _normalise_bbox(anomaly.get("bbox"))

            signals.append(
                {
                    "type": "gemini_visual_anomaly",
                    "label": "AI Visual Forensics",
                    "status": (
                        "flag"
                        if severity >= 0.60
                        else "info"
                    ),
                    "summary": (
                        "AI visual analysis detected a "
                        "possible localized anomaly."
                    ),
                    "details": [
                        str(
                            anomaly.get(
                                "reason",
                                "Possible visual anomaly detected.",
                            )
                        )
                    ],
                    "severity": severity,
                    "confidence": confidence,
                    "evidence_available": True,
                    "bbox": bbox,
                    "source": MODEL,
                }
            )

        print(
            f"[Gemini] Completed visual analysis: "
            f"{len(signals)} usable anomaly signal(s)."
        )

        return signals

    except Exception as exc:
        # Gemini is optional.
        # API/network/quota/model errors must NEVER break TRUSTAI.
        print(
            f"[Gemini] unavailable: "
            f"{type(exc).__name__}: {exc}"
        )
        return []


def _get_mime_type(path: str) -> str:
    extension = os.path.splitext(path)[1].lower()

    if extension in {".jpg", ".jpeg"}:
        return "image/jpeg"

    if extension == ".webp":
        return "image/webp"

    return "image/png"


def _normalise_bbox(value: Any) -> dict:
    """
    Gemini bbox:
        [ymin, xmin, ymax, xmax]
        in 0-1000 coordinates.

    TRUSTAI bbox:
        x/y/width/height
        in 0-100 percentages.
    """

    if (
        not isinstance(value, list)
        or len(value) != 4
    ):
        return {
            "x": 0.0,
            "y": 0.0,
            "width": 0.0,
            "height": 0.0,
        }

    try:
        ymin, xmin, ymax, xmax = [
            _clamp_1000(float(v))
            for v in value
        ]
    except (TypeError, ValueError):
        return {
            "x": 0.0,
            "y": 0.0,
            "width": 0.0,
            "height": 0.0,
        }

    return {
        "x": round(xmin / 10.0, 2),
        "y": round(ymin / 10.0, 2),
        "width": round(
            max(0.0, xmax - xmin) / 10.0,
            2,
        ),
        "height": round(
            max(0.0, ymax - ymin) / 10.0,
            2,
        ),
    }


def _clamp(value: Any) -> float:
    try:
        return max(
            0.0,
            min(1.0, float(value)),
        )
    except (TypeError, ValueError):
        return 0.0


def _clamp_1000(value: float) -> float:
    return max(
        0.0,
        min(1000.0, value),
    )