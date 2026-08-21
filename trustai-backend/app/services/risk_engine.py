"""
Combines individual signals into the single riskScore (0-100) and
riskBucket ('LOW' | 'MEDIUM' | 'HIGH') the frontend stamps on the
results page.

Scoring now runs through the shared graph-based fusion engine (see
aggregation/graph_risk_engine.py) instead of a flat per-signal weight
sum: the four image signals (metadata, ela, ocr, spectral) are nodes in
a small correlation graph, so e.g. ELA + deepfake both flagging together
counts for more than either flag would in isolation, proportional to how
related those two kinds of evidence actually are.

Bucket thresholds are unchanged and still mirror the ones the frontend
mock already uses (mockData.js): >=70 HIGH, >=35 MEDIUM, else LOW.
"""

from __future__ import annotations

from typing import List

from aggregation.graph_risk_engine import IMAGE_GRAPH, graph_fused_score
from app.models.schemas import Signal

HIGH_THRESHOLD = 70
MEDIUM_THRESHOLD = 35

# Signal.status doesn't carry a numeric confidence today (the individual
# services are still placeholders — see their TODOs), so status maps to
# a coarse activation: a real "flag" counts fully, an unresolved "info"
# placeholder nudges the score up slightly rather than not at all, and
# "clear" contributes nothing.
STATUS_TO_SCORE = {"flag": 100.0, "info": 15.0, "clear": 0.0}
STATUS_TO_CONFIDENCE = {"flag": 1.0, "info": 0.3, "clear": 1.0}


def compute_risk(signals: List[Signal]) -> tuple[float, str, dict]:
    node_scores = {signal.type: STATUS_TO_SCORE.get(signal.status, 0.0) for signal in signals}
    node_confidences = {signal.type: STATUS_TO_CONFIDENCE.get(signal.status, 0.0) for signal in signals}

    fused = graph_fused_score(IMAGE_GRAPH, node_scores, node_confidences)
    score = fused["score"]

    if score >= HIGH_THRESHOLD:
        bucket = "HIGH"
    elif score >= MEDIUM_THRESHOLD:
        bucket = "MEDIUM"
    else:
        bucket = "LOW"

    graph_breakdown = {
        "graph_corroboration_bonus": fused["corroboration_bonus"],
        "graph_node_activations": fused["node_activations"],
    }

    return round(score, 2), bucket, graph_breakdown
