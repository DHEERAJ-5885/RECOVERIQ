import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["model_loaded"] is True

def test_predict_high_probability():
    # Customer with high success, transient error, small amount
    payload = {
        "event_id": "test-uuid",
        "amount": 25.0,
        "currency": "USD",
        "payment_method": "UPI",
        "failure_reason": "NETWORK_ERROR",
        "event_type": "PAYMENT_FAILURE",
        "days_since_event": 1,
        "customer_features": {
            "totalTransactions": 20,
            "successfulTransactions": 19,
            "failedTransactions": 1,
            "previousRecoveryAttempts": 1,
            "previousSuccessfulRecoveries": 1,
            "customerSegment": "LOYAL"
        }
    }
    response = client.post("/predict/recovery-probability", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0 <= data["recovery_probability"] <= 1
    assert data["predicted_label"] in [0, 1]
    assert "explanation" in data

def test_predict_low_probability():
    # Customer with low success, bank declined, high amount
    payload = {
        "event_id": "test-uuid",
        "amount": 1000.0,
        "currency": "USD",
        "payment_method": "CARD",
        "failure_reason": "BANK_DECLINED",
        "event_type": "CHECKOUT_ABANDONMENT",
        "days_since_event": 45,
        "customer_features": {
            "totalTransactions": 5,
            "successfulTransactions": 1,
            "failedTransactions": 4,
            "previousRecoveryAttempts": 4,
            "previousSuccessfulRecoveries": 0,
            "customerSegment": "AT_RISK"
        }
    }
    response = client.post("/predict/recovery-probability", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0 <= data["recovery_probability"] <= 1

def test_missing_field():
    payload = {
        "amount": 50.0
    }
    response = client.post("/predict/recovery-probability", json=payload)
    assert response.status_code == 422  # Unprocessable Entity (validation error)
