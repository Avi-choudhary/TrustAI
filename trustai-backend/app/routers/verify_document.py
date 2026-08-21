"""
POST /api/verify/document

Owned by: AI document detection teammate.

Runs the full document forensics pipeline (pipelines/document_pipeline.py):
metadata/EXIF or PDF-metadata check, ELA, PaddleOCR + layout/field-level
forensics, PDF structural analysis, QR forensics, and an independent
Gemini visual-forensics pass — all combined by the evidence-family
aggregator in aggregation/family_engine.py into a single risk score.

Response contract (must not change the base fields — the frontend depends
on this exact shape, see src/api/verifyApi.js in the frontend repo):
    VerificationResult { id, fileName, fileType, submittedAt,
                          riskScore, riskBucket, signals[], previewUrl }
The extra evidence fields (verdict, confidence, documentType,
evidenceCoverage, evidenceFamilies, suspiciousRegions, fields,
phase1Forensics, phase3FieldForensics) are additive and optional — older
frontend code that only reads the base fields keeps working unchanged.
"""

from __future__ import annotations

import time
import hashlib

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.schemas import VerificationResult
from pipelines import document_pipeline
from utils.file_handling import cleanup, image_to_data_url, prepare_image, validate_and_save
from app.services.blockchain_service import trust_ledger  # <-- Imported blockchain ledger

router = APIRouter(prefix="/api/verify", tags=["verify-document"])


@router.post("/document", response_model=VerificationResult, response_model_by_alias=True)
async def verify_document(file: UploadFile = File(...)) -> VerificationResult:
    try:
        # 1. Read file into memory to compute hash, then reset cursor
        contents = await file.read()
        doc_hash = hashlib.sha256(contents).hexdigest()
        await file.seek(0)  # Critical: Reset cursor so validate_and_save can read the file
        
        # 2. Save file
        raw_path, ext = validate_and_save(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    image_path = None
    try:
        # 3. Prepare image and run the REAL AI Pipeline
        image_path = prepare_image(raw_path, ext)
        pipeline_result = document_pipeline.analyze(image_path, raw_path=raw_path, ext=ext)
        preview_url = image_to_data_url(image_path)
        
        # 4. Mint verification record onto the Blockchain
        blockchain_receipt = trust_ledger.record_verification(
            document_hash=doc_hash,
            filename=file.filename or "uploaded_document",
            risk_score=pipeline_result["riskScore"],
            verdict=pipeline_result.get("verdict", "UNKNOWN"),
            details={"flags": pipeline_result.get("signals", [])}  # Passing AI signals to ledger
        )
        
    except Exception:
        cleanup(raw_path, image_path)
        raise

    # 5. Build the final response
    result = VerificationResult(
        id=f"TRA-{int(time.time() * 1000):X}",
        fileName=file.filename or "uploaded_document",
        fileType="document",
        submittedAt=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        riskScore=pipeline_result["riskScore"],
        riskBucket=pipeline_result["riskBucket"],
        verdict=pipeline_result.get("verdict"),
        confidence=pipeline_result.get("confidence"),
        documentType=pipeline_result.get("documentType"),
        evidenceCoverage=pipeline_result.get("evidenceCoverage"),
        evidenceFamilies=pipeline_result.get("evidenceFamilies"),
        suspiciousRegions=pipeline_result.get("suspiciousRegions"),
        signals=pipeline_result["signals"],
        previewUrl=preview_url,
        fields=pipeline_result.get("fields"),
        phase1Forensics=pipeline_result.get("phase1Forensics"),
        phase3FieldForensics=pipeline_result.get("phase3FieldForensics"),
        graphCorroborationBonus=pipeline_result.get("graphCorroborationBonus"),
        graphNodeActivations=pipeline_result.get("graphNodeActivations"),
        
        # 6. Add Blockchain Fields
        documentHash=doc_hash,
        blockchainReceipt=blockchain_receipt
    )

    # 7. Cleanup temp files
    cleanup(
        raw_path,
        image_path if image_path != raw_path else None,
        *pipeline_result.get("_tempFiles", []),
    )

    return result