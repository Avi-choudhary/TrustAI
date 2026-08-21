"""Tamper-evident local audit ledger used for TrustAI verification receipts.

This is intentionally a local ledger, not a public-chain integration. It
provides hash chaining and proof-of-work for an auditable demo deployment;
production immutability requires external anchoring and signed records.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import BASE_DIR


class LedgerIntegrityError(RuntimeError):
    """Raised when a persisted ledger fails its integrity check."""


class Block:
    def __init__(self, index: int, timestamp: float, data: Dict[str, Any], previous_hash: str, nonce: int = 0, hash_val: Optional[str] = None):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = hash_val if hash_val else self.compute_hash()

    def compute_hash(self) -> str:
        payload = {"index": self.index, "timestamp": self.timestamp, "data": self.data, "previous_hash": self.previous_hash, "nonce": self.nonce}
        # Keep Python's default JSON separators for compatibility with records
        # already written by the original ledger implementation.
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {"index": self.index, "timestamp": self.timestamp, "data": self.data, "previous_hash": self.previous_hash, "nonce": self.nonce, "hash": self.hash}


class TrustLedger:
    def __init__(self, storage_path: Path | None = None, difficulty: int = 2):
        self.chain: List[Block] = []
        self.storage_path = storage_path or BASE_DIR / "storage" / "ledger.json"
        self.difficulty = difficulty
        self._lock = threading.RLock()
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.load_from_disk()

    def create_genesis_block(self) -> None:
        self.chain = [Block(0, time.time(), {"system": "TrustAI Audit Ledger Initialized", "version": "1.1"}, "0" * 64)]
        self.save_to_disk()

    @property
    def last_block(self) -> Block:
        return self.chain[-1]

    def proof_of_work(self, block: Block) -> str:
        target = "0" * self.difficulty
        block.nonce = 0
        while True:
            candidate = block.compute_hash()
            if candidate.startswith(target):
                return candidate
            block.nonce += 1

    def record_verification(self, document_hash: str, filename: str, risk_score: float, verdict: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Append a verification record and return the client-safe receipt."""
        with self._lock:
            if not self.is_chain_valid():
                raise LedgerIntegrityError("The audit ledger failed integrity validation.")
            record_data = {"document_hash": document_hash, "filename": filename, "risk_score": risk_score, "verdict": verdict, "flags": details.get("flags", []) if details else [], "verified_at": time.time()}
            new_block = Block(len(self.chain), time.time(), record_data, self.last_block.hash)
            new_block.hash = self.proof_of_work(new_block)
            self.chain.append(new_block)
            self.save_to_disk()
            return self._receipt(new_block)

    def _receipt(self, block: Block) -> Dict[str, Any]:
        return {"ledger_type": "local_tamper_evident_ledger", "block_index": block.index, "block_hash": block.hash, "previous_hash": block.previous_hash, "timestamp": block.timestamp, "document_hash": block.data["document_hash"], "nonce": block.nonce}

    def verify_document_on_chain(self, document_hash: str) -> Optional[Dict[str, Any]]:
        """Return a public-safe attestation without filenames or forensic details."""
        with self._lock:
            for block in reversed(self.chain):
                if block.data.get("document_hash") == document_hash:
                    return {"is_stamped": True, "is_chain_valid": self.is_chain_valid(), "receipt": self._receipt(block), "verdict": block.data.get("verdict"), "risk_score": block.data.get("risk_score"), "verified_at": block.data.get("verified_at")}
        return None

    def is_chain_valid(self) -> bool:
        if not self.chain:
            return False
        genesis = self.chain[0]
        if genesis.index != 0 or genesis.previous_hash != "0" * 64 or genesis.hash != genesis.compute_hash():
            return False
        target = "0" * self.difficulty
        for index in range(1, len(self.chain)):
            current, previous = self.chain[index], self.chain[index - 1]
            if current.index != index or current.hash != current.compute_hash():
                return False
            if current.previous_hash != previous.hash or not current.hash.startswith(target):
                return False
        return True

    def summary(self) -> Dict[str, Any]:
        with self._lock:
            return {"ledger_type": "local_tamper_evident_ledger", "total_blocks": len(self.chain), "is_chain_valid": self.is_chain_valid(), "latest_block_hash": self.last_block.hash if self.chain else None, "difficulty": self.difficulty}

    def save_to_disk(self) -> None:
        """Atomically replace the JSON file to avoid partial writes on crashes."""
        payload = json.dumps([block.to_dict() for block in self.chain], indent=2)
        fd, temporary_path = tempfile.mkstemp(prefix="ledger-", suffix=".json", dir=self.storage_path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_path, self.storage_path)
        except Exception:
            try:
                os.unlink(temporary_path)
            except FileNotFoundError:
                pass
            raise

    def load_from_disk(self) -> None:
        with self._lock:
            if not self.storage_path.exists():
                self.create_genesis_block()
                return
            try:
                blocks = json.loads(self.storage_path.read_text(encoding="utf-8"))
                self.chain = [Block(block["index"], block["timestamp"], block["data"], block["previous_hash"], block["nonce"], block["hash"]) for block in blocks]
            except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
                raise LedgerIntegrityError("The persisted audit ledger cannot be read.") from error


trust_ledger = TrustLedger()
