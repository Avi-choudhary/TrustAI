from fastapi import APIRouter, HTTPException

from app.services.blockchain_service import trust_ledger

router = APIRouter(prefix="/blockchain", tags=["Blockchain Audit Ledger"])


@router.get("/chain")
def get_chain_status():
    """Return non-sensitive ledger health and integrity metadata."""
    return {"status": "success", **trust_ledger.summary()}


@router.get("/verify/{doc_hash}")
def verify_document_hash(doc_hash: str):
    """Look up a SHA-256 file hash and return its public-safe attestation."""
    if len(doc_hash) != 64 or any(char not in "0123456789abcdefABCDEF" for char in doc_hash):
        raise HTTPException(status_code=400, detail="doc_hash must be a SHA-256 hex digest.")
    verification = trust_ledger.verify_document_on_chain(doc_hash.lower())
    if not verification:
        raise HTTPException(status_code=404, detail="Document hash not found on the TrustAI audit ledger.")
    return {"status": "success", "verification": verification}
