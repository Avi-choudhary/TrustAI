from __future__ import annotations

from typing import Any

from aggregation.graph_risk_engine import build_document_graph, graph_fused_score


# ---------------------------------------------------------------------------
# Evidence families
# ---------------------------------------------------------------------------

EVIDENCE_FAMILIES = (
    "STRUCTURAL",
    "TYPOGRAPHY",
    "VISUAL",
    "LAYOUT",
    "OCR_TEXT",
    "CONTENT_CONSISTENCY",
    "REFERENCE",
    "METADATA",
)


# ---------------------------------------------------------------------------
# Family weights
# ---------------------------------------------------------------------------

FAMILY_WEIGHTS = {
    "STRUCTURAL": 1.20,
    "TYPOGRAPHY": 1.00,
    "VISUAL": 1.10,
    "LAYOUT": 0.90,
    "OCR_TEXT": 0.80,
    "CONTENT_CONSISTENCY": 1.00,
    "REFERENCE": 1.10,
    "METADATA": 0.70,
}


# ---------------------------------------------------------------------------
# Existing forensic signals -> generic evidence family
# ---------------------------------------------------------------------------

SIGNAL_FAMILY_MAP = {
    # Legacy pipeline
    "metadata": "METADATA",
    "ela": "VISUAL",
    "ocr": "OCR_TEXT",
    "gemini_visual_anomaly": "VISUAL",

    # OCR / text
    "ocr_confidence": "OCR_TEXT",
    "merged_token_confusion": "OCR_TEXT",
    "character_edge_sharpness": "OCR_TEXT",
    "font_to_ocr_bbox_delta": "OCR_TEXT",
    "text_layer_discrepancy": "OCR_TEXT",

    # Typography
    "relative_text_size": "TYPOGRAPHY",
    "native_pdf_font": "TYPOGRAPHY",
    "font_family_mismatch": "TYPOGRAPHY",
    "font_size_variance": "TYPOGRAPHY",
    "font_weight_anomaly": "TYPOGRAPHY",
    "glyph_bounding_mismatch": "TYPOGRAPHY",

    # Layout
    "baseline_alignment": "LAYOUT",
    "baseline_skew_deviation": "LAYOUT",
    "internal_spacing": "LAYOUT",
    "bounding_box_overlap": "LAYOUT",
    "margin_grid_displacement": "LAYOUT",
    "column_alignment_err": "LAYOUT",

    # Visual
    "local_background": "VISUAL",
    "ela_high_frequency_contrast": "VISUAL",
    "noise_variance_map": "VISUAL",
    "noise_variance": "VISUAL",
    "resampling_artifacts": "VISUAL",
    "jpeg_quantization_mismatch": "VISUAL",

    # Structural
    "pdf_object_context": "STRUCTURAL",
    "pdf_object": "STRUCTURAL",
    "pdf_incremental_updates": "STRUCTURAL",
    "xref_table_reconstruction": "STRUCTURAL",
    "stream_length_mismatch": "STRUCTURAL",
    "orphan_objects": "STRUCTURAL",

    # Content consistency
    "repeated_occurrence": "CONTENT_CONSISTENCY",
    "cross_field_contradiction": "CONTENT_CONSISTENCY",
    "date_chronology_conflict": "CONTENT_CONSISTENCY",
    "amount_sum_mismatch": "CONTENT_CONSISTENCY",
    "table_total_variance": "CONTENT_CONSISTENCY",

    # Reference / QR / barcode
    "qr_reference_available": "REFERENCE",
    "qr_code_payload_mismatch": "REFERENCE",
    "barcode_checksum_fail": "REFERENCE",
    "visual_text_vs_qr_delta": "REFERENCE",
    "watermark_discrepancy": "REFERENCE",

    # Metadata
    "creation_mod_date_mismatch": "METADATA",
    "editing_software_signature": "METADATA",
    "exif_camera_model_mismatch": "METADATA",
    "pdf_producer_anomaly": "METADATA",

    # Optional pretrained forensic model
    "ai_visual_detector": "VISUAL",
    "forgery_model": "VISUAL",
    "trufor": "VISUAL",
    "seed": "VISUAL",
}


# ---------------------------------------------------------------------------
# Signal helpers
# ---------------------------------------------------------------------------

def get_signal_family(signal_type: str) -> str:
    """
    Map a raw forensic signal type to one of TrustAI's generic
    evidence families.

    Unknown signals are deliberately mapped to STRUCTURAL rather
    than being silently discarded.
    """
    return SIGNAL_FAMILY_MAP.get(
        str(signal_type).lower(),
        "STRUCTURAL",
    )


def _legacy_score_to_severity(
    signal: dict[str, Any],
) -> float:
    """
    Convert legacy score/max representation into normalized
    severity in the range 0.0 - 1.0.
    """
    score = float(signal.get("_score", 0.0))
    maximum = float(signal.get("_max", 0.0))

    if maximum <= 0:
        return 0.0

    return max(
        0.0,
        min(1.0, score / maximum),
    )


def normalize_evidence_signal(
    signal: dict[str, Any],
) -> dict[str, Any]:
    """
    Convert an existing TrustAI signal into the generic evidence
    representation.

    Internally severity is always represented as 0.0 - 1.0.
    """

    signal_type = str(
        signal.get("type", "unknown")
    )

    normalized = dict(signal)

    normalized["family"] = get_signal_family(
        signal_type
    )

    # -------------------------------------------------------
    # Severity
    # -------------------------------------------------------

    raw_severity = signal.get("severity")

    if raw_severity is None:
        severity = _legacy_score_to_severity(
            signal
        )
    else:
        try:
            severity = float(raw_severity)
        except (TypeError, ValueError):
            severity = 0.0

        # Accept both:
        #   0.0 - 1.0
        # and
        #   0 - 100
        if severity > 1.0:
            severity /= 100.0

        severity = max(
            0.0,
            min(1.0, severity),
        )

    normalized["severity"] = severity

    # -------------------------------------------------------
    # Availability
    # -------------------------------------------------------

    normalized["evidence_available"] = (
        signal_type != "limitation"
        and not signal.get(
            "unavailable",
            False,
        )
    )

    # -------------------------------------------------------
    # Confidence
    # -------------------------------------------------------

    confidence = signal.get(
        "confidence",
        1.0,
    )

    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 1.0

    normalized["confidence"] = max(
        0.0,
        min(1.0, confidence),
    )

    return normalized


# ---------------------------------------------------------------------------
# Family construction
# ---------------------------------------------------------------------------

def build_evidence_families(
    signals: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """
    Group raw forensic signals into evidence families.

    Local forensic signals remain the primary deterministic evidence.
    Gemini visual forensics are treated as a strong secondary signal.

    Gemini does NOT replace local evidence, but strong Gemini findings
    can materially increase the VISUAL family score.
    """

    families: dict[str, dict[str, Any]] = {
        family: {
            "family": family,
            "signals": [],
            "available": False,
            "signal_count": 0,
            "score": 0.0,
            "confidence": 0.0,
            "max_severity": 0.0,
            "evidence": [],
            "local_score": 0.0,
            "gemini_score": 0.0,
            "gemini_contribution": 0.0,
        }
        for family in EVIDENCE_FAMILIES
    }

    # -------------------------------------------------------
    # Put signals into families
    # -------------------------------------------------------

    for raw_signal in signals:

        signal = normalize_evidence_signal(raw_signal)

        family_name = signal["family"]
        family = families[family_name]

        family["signals"].append(signal)

        if not signal["evidence_available"]:
            continue

        family["available"] = True
        family["signal_count"] += 1

        severity = float(signal["severity"])

        family["max_severity"] = max(
            family["max_severity"],
            severity,
        )

        # Keep meaningful anomalies for the UI.
        if severity >= 0.25:
            family["evidence"].append(
                {
                    "type": signal.get("type"),
                    "severity": round(severity * 100, 1),
                    "reason": signal.get("reason"),
                    "details": signal.get("details"),
                }
            )

    # -------------------------------------------------------
    # Aggregate signals within each family
    # -------------------------------------------------------

    def _union_score(
        family_signals: list[dict[str, Any]],
    ) -> float:
        """
        Dampened probability union.

        Returns 0-100.
        """

        if not family_signals:
            return 0.0

        probability_no_anomaly = 1.0

        for signal in family_signals:

            severity = float(
                signal.get("severity", 0.0)
            )

            confidence = float(
                signal.get("confidence", 0.0)
            )

            probability_no_anomaly *= (
                1.0
                - severity * confidence
            )

        return (
            1.0 - probability_no_anomaly
        ) * 100.0

    for family in families.values():

        available_signals = [
            signal
            for signal in family["signals"]
            if signal.get("evidence_available")
        ]

        if not available_signals:
            continue

        # ---------------------------------------------------
        # Separate local evidence from Gemini
        # ---------------------------------------------------

        gemini_signals = [
            signal
            for signal in available_signals
            if signal.get("type") == "gemini_visual_anomaly"
        ]

        local_signals = [
            signal
            for signal in available_signals
            if signal.get("type") != "gemini_visual_anomaly"
        ]

        local_score = _union_score(local_signals)
        gemini_raw_score = _union_score(gemini_signals)

        # ---------------------------------------------------
        # Gemini contribution
        #
        # Gemini can contribute up to 40 points to its family.
        # This is deliberately much stronger than the old 15-point
        # cap, while still preventing Gemini from controlling 100%
        # of the score.
        # ---------------------------------------------------

        gemini_contribution = min(
            gemini_raw_score * 0.60,
            40.0,
        )

        # ---------------------------------------------------
        # Gemini corroboration
        #
        # Strong Gemini + meaningful local evidence means
        # multiple independent signals point toward tampering.
        # ---------------------------------------------------

        corroboration_bonus = 0.0

        if (
            local_score >= 15.0
            and gemini_raw_score >= 40.0
        ):
            corroboration_bonus = 8.0

        # ---------------------------------------------------
        # Final family score
        # ---------------------------------------------------

        family_score = min(
            100.0,
            local_score
            + gemini_contribution
            + corroboration_bonus,
        )

        confidence_sum = sum(
            float(
                signal.get(
                    "confidence",
                    0.0,
                )
            )
            for signal in available_signals
        )

        family_confidence = (
            confidence_sum
            / len(available_signals)
        )

        family["local_score"] = round(
            local_score,
            2,
        )

        family["gemini_score"] = round(
            gemini_raw_score,
            2,
        )

        family["gemini_contribution"] = round(
            gemini_contribution,
            2,
        )

        family["corroboration_bonus"] = round(
            corroboration_bonus,
            2,
        )

        family["score"] = round(
            max(
                0.0,
                min(
                    100.0,
                    family_score,
                ),
            ),
            2,
        )

        family["confidence"] = round(
            max(
                0.0,
                min(
                    1.0,
                    family_confidence,
                ),
            ),
            3,
        )

        family["max_severity"] = round(
            family["max_severity"] * 100.0,
            2,
        )

    return families


# ---------------------------------------------------------------------------
# Coverage
# ---------------------------------------------------------------------------

def evidence_coverage(
    families: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """
    Report how much of the evidence space was actually available.

    Missing evidence is NOT treated as suspicious.
    """

    available = sum(
        1
        for family in families.values()
        if family.get("available")
    )

    total = len(EVIDENCE_FAMILIES)

    ratio = (
        available / total
        if total
        else 0.0
    )

    return {
        "available": available,
        "total": total,
        "ratio": round(
            ratio,
            3,
        ),
    }


# ---------------------------------------------------------------------------
# Document-level risk aggregation
# ---------------------------------------------------------------------------

def aggregate_document_risk(
    families: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """
    Combine evidence families into the final TrustAI risk score.

    Deterministic forensic evidence remains important.

    Gemini visual forensics receive stronger influence when available,
    but Gemini alone cannot automatically produce a maximum-risk score.
    """

    active_families = [
        family
        for family in families.values()
        if family.get("available")
        and family.get("confidence", 0.0) > 0.0
    ]

    coverage = evidence_coverage(families)

    # -------------------------------------------------------
    # No evidence
    # -------------------------------------------------------

    if not active_families:
        return {
            "score": 0.0,
            "bucket": "MEDIUM",
            "verdict": "INCONCLUSIVE",
            "confidence": 0.0,
            "coverage": coverage,
            "active_families": 0,
            "corroborated": False,
        }

    # -------------------------------------------------------
    # Base deterministic family fusion
    # -------------------------------------------------------

    weighted_score = 0.0
    total_weight = 0.0
    confidence_sum = 0.0

    for family in active_families:

        family_name = family["family"]

        family_score = float(
            family.get(
                "score",
                0.0,
            )
        )

        family_confidence = float(
            family.get(
                "confidence",
                0.0,
            )
        )

        family_weight = FAMILY_WEIGHTS.get(
            family_name,
            1.0,
        )

        effective_weight = (
            family_weight
            * family_confidence
        )

        weighted_score += (
            family_score
            * effective_weight
        )

        total_weight += effective_weight

        confidence_sum += family_confidence

    base_score = (
        weighted_score / total_weight
        if total_weight > 0
        else 0.0
    )

    base_score = max(
        0.0,
        min(
            100.0,
            base_score,
        ),
    )

    # -------------------------------------------------------
    # Gemini-aware document fusion
    # -------------------------------------------------------

    visual_family = families.get(
        "VISUAL",
        {},
    )

    gemini_score = float(
        visual_family.get(
            "gemini_score",
            0.0,
        )
    )

    gemini_contribution = float(
        visual_family.get(
            "gemini_contribution",
            0.0,
        )
    )

    gemini_confidence = 0.0

    gemini_signals = [
        signal
        for signal in visual_family.get(
            "signals",
            [],
        )
        if signal.get("type")
        == "gemini_visual_anomaly"
        and signal.get("evidence_available")
    ]

    if gemini_signals:
        gemini_confidence = sum(
            float(
                signal.get(
                    "confidence",
                    0.0,
                )
            )
            for signal in gemini_signals
        ) / len(gemini_signals)

    final_score = base_score

    # -------------------------------------------------------
    # Strong Gemini evidence
    #
    # Gemini becomes a meaningful part of the final decision,
    # but it does NOT completely replace deterministic evidence.
    # -------------------------------------------------------

    if gemini_score > 0.0:

        # 55% Gemini / 45% deterministic base.
        #
        # This is the key change that prevents strong Gemini
        # findings from being diluted by unavailable/weak families.
        final_score = (
            base_score * 0.45
            + gemini_score * 0.55
        )

        # Strong Gemini confidence + strong anomaly score.
        if (
            gemini_score >= 50.0
            and gemini_confidence >= 0.60
        ):
            final_score += 8.0

    # -------------------------------------------------------
    # Cross-family corroboration (graph-based)
    # -------------------------------------------------------
    #
    # Suspicion propagates across evidence families along a hand-tuned
    # correlation graph (aggregation/graph_risk_engine.py) instead of a
    # flat "+5 if 2+ families are flagged" rule. A pairing that real
    # forgeries actually tend to show together (e.g. STRUCTURAL +
    # METADATA) now counts for more than a pairing that's largely
    # coincidental (e.g. LAYOUT + REFERENCE), proportional to the edge
    # weight between them.

    family_scores = {name: float(family.get("score", 0.0)) for name, family in families.items()}
    family_confidences = {name: float(family.get("confidence", 0.0)) for name, family in families.items()}

    document_graph = build_document_graph(FAMILY_WEIGHTS)
    graph_result = graph_fused_score(document_graph, family_scores, family_confidences)
    graph_corroboration_bonus = graph_result["corroboration_bonus"]

    # Gemini's own strong-evidence nudge is kept separate and unchanged —
    # Gemini isn't a family-graph node, it's folded into VISUAL upstream,
    # so this preserves the original standalone signal for "Gemini plus
    # at least one other independent family agreeing."
    gemini_corroboration_bonus = 5.0 if (gemini_score >= 50.0 and len(active_families) >= 2) else 0.0

    total_corroboration_bonus = graph_corroboration_bonus + gemini_corroboration_bonus
    corroborated = total_corroboration_bonus > 0.0

    final_score += total_corroboration_bonus

    # -------------------------------------------------------
    # Clamp
    # -------------------------------------------------------

    final_score = max(
        0.0,
        min(
            100.0,
            final_score,
        ),
    )

    # -------------------------------------------------------
    # Document confidence
    # -------------------------------------------------------

    average_confidence = (
        confidence_sum
        / len(active_families)
        if active_families
        else 0.0
    )

    # More evidence coverage = more confidence.
    coverage_ratio = float(
        coverage.get(
            "ratio",
            0.0,
        )
    )

    document_confidence = (
        average_confidence
        * (
            0.70
            + 0.30 * coverage_ratio
        )
    )

    # Strong Gemini evidence slightly improves confidence,
    # but does not dominate it.
    if gemini_score >= 50.0:
        document_confidence += 0.05

    document_confidence = max(
        0.0,
        min(
            1.0,
            document_confidence,
        ),
    )

    # -------------------------------------------------------
    # Risk bucket
    # -------------------------------------------------------

    if final_score >= 70.0:
     bucket = "HIGH"

    elif final_score >= 40.0:
     bucket = "MEDIUM"

    else:
     bucket = "LOW"

# -------------------------------------------------------
# Verdict
# -------------------------------------------------------

    if final_score >= 70.0:
     verdict = "LIKELY_TAMPERED"

    elif final_score >= 40.0:
     verdict = "SUSPICIOUS "

    elif coverage_ratio < 0.50:
     verdict = "INCONCLUSIVE"

    else:
     verdict = "LIKELY_AUTHENTIC"
    # -------------------------------------------------------
    # Strong anomaly override
    #
    # If Gemini has multiple high-confidence anomalies,
    # don't let a low deterministic base score call the
    # document "LIKELY_AUTHENTIC".
    # -------------------------------------------------------

    high_confidence_gemini = sum(
        1
        for signal in gemini_signals
        if float(
            signal.get(
                "severity",
                0.0,
            )
        ) >= 0.50
        and float(
            signal.get(
                "confidence",
                0.0,
            )
        ) >= 0.60
    )

    if (
        high_confidence_gemini >= 2
        and final_score >= 50.0
    ):
        verdict = "LIKELY_TAMPERED"

    return {
        "score": round(
            final_score,
            2,
        ),
        "bucket": bucket,
        "verdict": verdict,
        "confidence": round(
            document_confidence,
            3,
        ),
        "coverage": coverage,
        "active_families": len(
            active_families
        ),
        "corroborated": corroborated,
        "base_score": round(
            base_score,
            2,
        ),
        "gemini_score": round(
            gemini_score,
            2,
        ),
        "gemini_confidence": round(
            gemini_confidence,
            3,
        ),
        "graph_corroboration_bonus": round(
            graph_corroboration_bonus,
            2,
        ),
        "graph_node_activations": graph_result["node_activations"],
    }