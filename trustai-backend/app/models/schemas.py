"""
Pydantic schemas for TrustAI.

These mirror the `VerificationResult` shape documented in the frontend at
src/api/verifyApi.js — keep the two in sync. Field names are camelCase
on purpose (Pydantic aliases) so responses match the JS contract exactly
without any mapping layer on the frontend.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

FileType = Literal["image", "document"]
SignalType = Literal["metadata", "ela", "ocr", "spectral"]
SignalStatus = Literal["clear", "info", "flag"]
RiskBucket = Literal["LOW", "MEDIUM", "HIGH"]


class CamelModel(BaseModel):
    """Base model that (de)serializes using camelCase keys."""

    model_config = ConfigDict(populate_by_name=True)


class Hotzone(CamelModel):
    x: float
    y: float
    width: float
    height: float
    confidence: float
    note: Optional[str] = None


class Signal(CamelModel):
    type: SignalType
    label: str
    status: SignalStatus
    summary: str
    details: Optional[List[str]] = None
    hotzones: Optional[List[Hotzone]] = None


class VerificationResult(CamelModel):
    id: str
    file_name: str = Field(alias="fileName")
    file_type: FileType = Field(alias="fileType")
    submitted_at: str = Field(alias="submittedAt")
    risk_score: float = Field(alias="riskScore", ge=0, le=100)
    risk_bucket: RiskBucket = Field(alias="riskBucket")
    signals: List[Signal]
    preview_url: str = Field(alias="previewUrl")

    # Document-pipeline extras (populated by the document-detection
    # endpoint; left unset — None — by the image-detection endpoint).
    verdict: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    document_type: Optional[str] = Field(default=None, alias="documentType")
    evidence_coverage: Optional[Dict[str, Any]] = Field(default=None, alias="evidenceCoverage")
    evidence_families: Optional[Dict[str, Any]] = Field(default=None, alias="evidenceFamilies")
    suspicious_regions: Optional[List[Dict[str, Any]]] = Field(default=None, alias="suspiciousRegions")
    fields: Optional[Dict[str, Any]] = None
    phase1_forensics: Optional[Dict[str, Any]] = Field(default=None, alias="phase1Forensics")
    phase3_field_forensics: Optional[Dict[str, Any]] = Field(default=None, alias="phase3FieldForensics")

    # Graph-based risk engine breakdown (aggregation/graph_risk_engine.py).
    # Populated by BOTH endpoints — image and document — so the frontend
    # can show "why" a corroborated result scored higher without needing
    # to branch on fileType. None if the engine found nothing to
    # corroborate (e.g. zero or one signal flagged).
    graph_corroboration_bonus: Optional[float] = Field(default=None, alias="graphCorroborationBonus")
    graph_node_activations: Optional[Dict[str, float]] = Field(default=None, alias="graphNodeActivations")

    # Blockchain extras
    document_hash: Optional[str] = Field(default=None, alias="documentHash")
    blockchain_receipt: Optional[Dict[str, Any]] = Field(default=None, alias="blockchainReceipt")


class ErrorResponse(CamelModel):
    detail: str
