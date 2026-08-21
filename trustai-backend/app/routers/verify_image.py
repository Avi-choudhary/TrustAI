"""
POST /api/verify/image

Owned by: AI image detection teammate.

This endpoint handles ONLY images. Everything under app/services/ that's
relevant to images is fair game here.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.schemas import Signal, VerificationResult
from app.services import ela_service, metadata_service, risk_engine, spectral_service
from app.utils.file_handling import (
    ALLOWED_IMAGE_TYPES,
    build_preview_url,
    generate_case_id,
    save_upload,
)
from app.services.blockchain_service import trust_ledger  # <-- Imported blockchain ledger

router = APIRouter(prefix="/api/verify", tags=["verify-image"])

ENABLE_SPECTRAL_SIGNAL = True


@router.post("/image", response_model=VerificationResult, response_model_by_alias=True)
async def verify_image(file: UploadFile = File(...)) -> VerificationResult:
    if (file.content_type or "") not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type '{file.content_type}' for image upload",
        )

    # 1. Read file into memory to compute hash, then reset cursor
    contents = await file.read()
    image_hash = hashlib.sha256(contents).hexdigest()
    await file.seek(0)  # Critical: Reset cursor so save_upload can read the file

    case_id = generate_case_id()
    saved_path = await save_upload(file, case_id)

    # --- image detection pipeline — edit freely -------------------------
    signals: list[Signal] = [
        metadata_service.analyze(saved_path, "image"),
        ela_service.analyze(saved_path, "image"),
    ]

    if ENABLE_SPECTRAL_SIGNAL:
        signals.append(spectral_service.analyze(saved_path, "image"))
    # ---------------------------------------------------------------------

    risk_score, risk_bucket, graph_breakdown = risk_engine.compute_risk(signals)

    # Derive an audit-ledger verdict from the evidence fusion result.
    verdict = "AUTHENTIC" if risk_bucket == "LOW" else "FLAGGED"
    
    # Extract just the summaries of flagged signals for the blockchain record
    flag_summaries = [sig.summary for sig in signals if sig.status == "flag"]

    # 2. Mint verification record onto the Blockchain
    blockchain_receipt = trust_ledger.record_verification(
        document_hash=image_hash,
        filename=file.filename or "uploaded_image",
        risk_score=risk_score,
        verdict=verdict,
        details={"flags": flag_summaries}
    )

    return VerificationResult(
        id=case_id,
        fileName=file.filename,
        fileType="image",
        submittedAt=datetime.now(timezone.utc).isoformat(),
        riskScore=risk_score,
        riskBucket=risk_bucket,
        signals=signals,
        previewUrl=build_preview_url(case_id, file.filename),
        graphCorroborationBonus=graph_breakdown["graph_corroboration_bonus"],
        graphNodeActivations=graph_breakdown["graph_node_activations"],
        
        # Add Verdict and Blockchain Fields to response
        verdict=verdict,
        documentHash=image_hash,
        blockchainReceipt=blockchain_receipt
    )
