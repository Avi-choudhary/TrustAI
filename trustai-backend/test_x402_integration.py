"""Automated verification test for X402 payment protocol endpoints."""

import sys
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.x402 import X402Payment
from app.services.auth_service import hash_password, create_access_token

client = TestClient(app)

def run_tests():
    print("=========================================")
    print("Testing TrustAI X402 Protocol Integration")
    print("=========================================")

    # 1. Test Gateway Config
    resp = client.get("/api/x402/config")
    assert resp.status_code == 200, f"Config failed: {resp.text}"
    config = resp.json()
    assert config["x402Version"] == "1.0"
    assert "merchantAddress" in config
    assert "eip155:8453" in config["supportedNetworks"]
    print("[PASS] 1. /api/x402/config (Merchant & Supported Networks verified)")

    # 2. Setup a test user
    db = SessionLocal()
    test_email = "x402_tester@trustai.dev"
    user = db.query(User).filter(User.email == test_email).first()
    if not user:
        user = User(
            email=test_email,
            password_hash=hash_password("SecurePass123!"),
            subscription_tier="FREE",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[PASS] 2. Created test user ({test_email}), initial plan: {user.subscription_tier}")

    # 3. Test HTTP 402 Challenge Generation
    chal_resp = client.post(
        "/api/x402/challenge",
        json={"plan": "PREMIUM", "purpose": "SUBSCRIPTION", "amount": 4.99},
        headers=headers,
    )
    assert chal_resp.status_code == 402, f"Expected 402 status, got {chal_resp.status_code}"
    assert "PAYMENT-REQUIRED" in chal_resp.headers or "payment-required" in chal_resp.headers, "Missing PAYMENT-REQUIRED header"
    
    challenge = chal_resp.json()
    assert challenge["x402Version"] == "1.0"
    assert challenge["orderId"].startswith("x402_")
    assert len(challenge["accepts"]) >= 3
    order_id = challenge["orderId"]
    print(f"[PASS] 3. /api/x402/challenge (Received HTTP 402 with order: {order_id})")

    # 4. Test Settle X402 Payment
    settle_resp = client.post(
        "/api/x402/settle",
        json={
            "orderId": order_id,
            "payerAddress": "0x71C8366420A0926793fe14b17bEE06941866420A",
            "network": "eip155:8453",
            "amount": 4.99,
            "asset": "USDC",
            "plan": "PREMIUM",
            "signature": "0xabcdef1234567890testsignature",
            "txHash": f"0xtx_{order_id}",
        },
        headers=headers,
    )
    assert settle_resp.status_code == 200, f"Settle failed: {settle_resp.text}"
    assert "X-PAYMENT-RESPONSE" in settle_resp.headers or "x-payment-response" in settle_resp.headers
    
    settlement = settle_resp.json()
    assert settlement["status"] == "settled"
    assert settlement["subscription"]["tier"] == "PREMIUM"
    assert "blockchainReceipt" in settlement
    block_hash = settlement["blockchainReceipt"]["block_hash"]
    block_index = settlement["blockchainReceipt"]["block_index"]
    tx_hash = settlement["txHash"]
    print(f"[PASS] 4. /api/x402/settle (Plan upgraded to PREMIUM, Block #{block_index}: {block_hash[:16]}...)")

    # Verify user in database
    db.refresh(user)
    assert user.subscription_tier == "PREMIUM", "User tier was not updated in DB"
    assert user.subscription_expires_at is not None, "Subscription expiration not set"
    print(f"[PASS] 5. Database verification (User tier is now {user.subscription_tier}, expires: {user.subscription_expires_at})")

    # 5. Test Payment History
    hist_resp = client.get("/api/x402/history", headers=headers)
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert len(history) >= 1
    assert any(h["orderId"] == order_id for h in history)
    print(f"[PASS] 6. /api/x402/history (Found {len(history)} settled transactions)")

    # 6. Test Public Ledger Receipt Verification
    verify_resp = client.get(f"/api/x402/verify-receipt/{tx_hash}")
    assert verify_resp.status_code == 200, f"Receipt verify failed: {verify_resp.text}"
    receipt_data = verify_resp.json()
    assert receipt_data["verified"] is True
    assert receipt_data["blockchain"]["blockIndex"] == block_index
    assert receipt_data["blockchain"]["isChainValid"] is True
    print(f"[PASS] 7. /api/x402/verify-receipt (Audit ledger valid & verified)")

    db.close()
    print("=========================================")
    print("ALL X402 PROTOCOL TESTS PASSED!")
    print("=========================================")

if __name__ == "__main__":
    run_tests()
