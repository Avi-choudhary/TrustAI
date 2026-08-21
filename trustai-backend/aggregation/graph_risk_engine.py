"""
Graph-based risk fusion, shared by both the image and document pipelines.

Why a graph instead of flat weights
------------------------------------
The previous approach in each pipeline treated evidence as independent:
sum up a fixed weight for every flagged signal, and (for documents) add one
flat bonus if two or more evidence families happened to be suspicious at
once. That flat "+5 if corroborated" rule doesn't distinguish a pairing
that's genuinely diagnostic (e.g. a document with both STRUCTURAL and
METADATA anomalies, which real forgeries tend to show together) from a
pairing that's largely coincidental (e.g. LAYOUT and REFERENCE, which
rarely have anything to do with each other).

This module instead models each pipeline's evidence as nodes in a weighted
graph, with edges encoding how strongly two kinds of evidence corroborate
each other. Suspicion then *propagates* along edges: a strongly-activated
node raises its neighbors' effective activation in proportion to the edge
weight, so corroboration compounds according to how related the evidence
actually is, not by a fixed bonus.

Edge weights below are hand-set from forensic reasoning (there's no
labeled dataset to learn them from yet) — see the comment next to each
edge for the reasoning. That's noted here deliberately so it's easy to
explain to a judge, and easy to swap for learned weights later if the
team gets there (see the "feedback loop" idea from earlier planning).
"""

from __future__ import annotations

from typing import Dict, List, Tuple

import networkx as nx

# How many rounds of propagation to run. More rounds let suspicion spread
# further across indirectly-connected nodes; 2 is enough for graphs this
# small (4-8 nodes) without let a single strong signal dominate everything.
PROPAGATION_ROUNDS = 2

# Fraction of a neighbor's activation that crosses one edge per round.
# Kept well under 1.0 so propagation adds a meaningful but bounded bonus
# rather than letting scores runaway on a densely connected graph.
PROPAGATION_FACTOR = 0.35


def build_graph(node_weights: Dict[str, float], edges: List[Tuple[str, str, float]]) -> nx.Graph:
    """
    node_weights: node name -> how much this node counts in the final
                  weighted average (mirrors each family's/signal's
                  existing importance weight).
    edges:        (node_a, node_b, correlation_weight 0.0-1.0) triples.
    """
    graph = nx.Graph()
    for node, weight in node_weights.items():
        graph.add_node(node, weight=weight)
    for a, b, weight in edges:
        graph.add_edge(a, b, weight=weight)
    return graph


def _propagate(graph: nx.Graph, activations: Dict[str, float]) -> Dict[str, float]:
    """
    Spread activation across graph edges for PROPAGATION_ROUNDS rounds.
    activations: node -> initial activation in [0.0, 1.0].
    Returns node -> propagated activation in [0.0, 1.0].
    """
    current = {node: activations.get(node, 0.0) for node in graph.nodes}

    for _ in range(PROPAGATION_ROUNDS):
        next_state = dict(current)
        for node in graph.nodes:
            incoming = sum(
                current[neighbor] * graph[node][neighbor].get("weight", 0.0)
                for neighbor in graph.neighbors(node)
            )
            next_state[node] = min(1.0, current[node] + incoming * PROPAGATION_FACTOR)
        current = next_state

    return current


def graph_fused_score(
    graph: nx.Graph,
    node_scores: Dict[str, float],       # node -> raw score, 0-100
    node_confidences: Dict[str, float],  # node -> confidence, 0.0-1.0
) -> dict:
    """
    Run graph propagation over the given evidence and return a fused
    score plus a breakdown of how much of it came from propagation
    (i.e. cross-evidence corroboration), for transparency.
    """
    activations = {
        node: (node_scores.get(node, 0.0) / 100.0) * node_confidences.get(node, 0.0)
        for node in graph.nodes
    }

    propagated = _propagate(graph, activations)
    node_weights = nx.get_node_attributes(graph, "weight")
    total_weight = sum(node_weights.values()) or 1.0

    def weighted_avg(values: Dict[str, float]) -> float:
        return sum(values[node] * 100.0 * node_weights.get(node, 1.0) for node in graph.nodes) / total_weight

    raw_score = weighted_avg(activations)
    fused_score = weighted_avg(propagated)

    # Cap how much propagation alone can move the score, so one dense
    # graph can't swing the result further than the corroboration it
    # represents should reasonably justify.
    corroboration_bonus = max(0.0, min(15.0, fused_score - raw_score))

    return {
        "score": round(max(0.0, min(100.0, raw_score + corroboration_bonus)), 2),
        "raw_score": round(max(0.0, min(100.0, raw_score)), 2),
        "corroboration_bonus": round(corroboration_bonus, 2),
        "node_activations": {node: round(value, 3) for node, value in propagated.items()},
    }


# ---------------------------------------------------------------------------
# Document graph — the 8 evidence families from aggregation/family_engine.py
# ---------------------------------------------------------------------------

DOCUMENT_FAMILY_EDGES: List[Tuple[str, str, float]] = [
    # Both reflect how the file itself was produced/altered at the
    # object/metadata level — a forged PDF very often shows both.
    ("STRUCTURAL", "METADATA", 0.55),
    ("STRUCTURAL", "CONTENT_CONSISTENCY", 0.35),
    # Font and layout anomalies co-occur when a field is pasted/edited
    # in place — one rarely happens without the other.
    ("TYPOGRAPHY", "LAYOUT", 0.50),
    ("TYPOGRAPHY", "OCR_TEXT", 0.40),
    ("LAYOUT", "OCR_TEXT", 0.35),
    # A pasted/edited field usually shows up both visually (ELA/noise)
    # and typographically.
    ("VISUAL", "TYPOGRAPHY", 0.30),
    ("VISUAL", "STRUCTURAL", 0.25),
    # An edited field (name, amount, date) usually breaks some
    # independent cross-check — a QR payload, a running total, OCR text.
    ("CONTENT_CONSISTENCY", "REFERENCE", 0.40),
    ("CONTENT_CONSISTENCY", "OCR_TEXT", 0.30),
    # Weak: metadata and QR/watermark checks are largely independent.
    ("REFERENCE", "METADATA", 0.20),
]


def build_document_graph(family_weights: Dict[str, float]) -> nx.Graph:
    """family_weights: aggregation.family_engine.FAMILY_WEIGHTS."""
    return build_graph(family_weights, DOCUMENT_FAMILY_EDGES)


# ---------------------------------------------------------------------------
# Image graph — the 4 raw signal types the image pipeline produces
# (the image pipeline has no family layer, so nodes are signal types
# directly). Node weights mirror the old flat SIGNAL_WEIGHTS in
# app/services/risk_engine.py so overall scoring stays in the same range.
# ---------------------------------------------------------------------------

IMAGE_SIGNAL_NODE_WEIGHTS: Dict[str, float] = {
    "metadata": 20,
    "ela": 35,
    "ocr": 30,
    "spectral": 35,
}

IMAGE_SIGNAL_EDGES: List[Tuple[str, str, float]] = [
    # Both are pixel-level manipulation signals — strong corroboration.
    ("ela", "spectral", 0.45),
    # Edited images often show both stripped/rewritten metadata and
    # recompression artifacts.
    ("metadata", "ela", 0.30),
    ("metadata", "spectral", 0.20),
    # Weak — OCR mainly matters when the image contains text.
    ("ocr", "ela", 0.15),
]

IMAGE_GRAPH = build_graph(IMAGE_SIGNAL_NODE_WEIGHTS, IMAGE_SIGNAL_EDGES)
