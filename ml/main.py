import os
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI()

MODEL_PATH = os.getenv("MODEL_PATH", "models/recovery_pipeline.joblib")

class PredictionRequest(BaseModel):
    event_id: str = Field(..., description="Revenue event UUID")
    amount: float = Field(..., gt=0, description="Transaction amount")
    currency: str = Field(..., description="Currency code, e.g., USD")
    payment_method: str = Field(..., description="UPI, CARD, NETBANKING, WALLET")
    failure_reason: str | None = Field(None, description="Reason for failure")
    checkout_stage: str | None = Field(None, description="Payment flow stage")
    subscription_status: str | None = Field(None, description="Subscription status if applicable")
    event_type: str | None = Field("PAYMENT_FAILURE", description="Type of event")
    days_since_event: int = Field(0, description="Days elapsed since event")
    customer_features: dict = Field(..., description="Precomputed customer behavioral features")

class PredictionResponse(BaseModel):
    recovery_probability: float = Field(..., ge=0.0, le=1.0, description="Probability that recovery will succeed")
    predicted_label: int = Field(..., description="Binary prediction: 1 for recovered, 0 for not recovered")
    explanation: list[str] = Field(..., description="Model/business signals contributing to prediction")
    model_id: str = Field(..., description="Identifier of the model used")
    model_version: str = Field(..., description="Version or timestamp of the model file")

def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    return joblib.load(MODEL_PATH)

try:
    model = load_model()
except Exception as e:
    model = None
    load_error = str(e)
else:
    load_error = None

@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": model is not None}

@app.post("/predict/recovery-probability", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail=f"Model unavailable: {load_error}")
    
    import pandas as pd
    
    customer = request.customer_features
    # Build dataframe for the pipeline
    df = pd.DataFrame([{
        "amount": request.amount,
        "days_since_event": request.days_since_event,
        "totalTransactions": customer.get("totalTransactions", 0),
        "successfulTransactions": customer.get("successfulTransactions", 0),
        "failedTransactions": customer.get("failedTransactions", 0),
        "previousRecoveryAttempts": customer.get("previousRecoveryAttempts", 0),
        "previousSuccessfulRecoveries": customer.get("previousSuccessfulRecoveries", 0),
        "eventType": request.event_type,
        "paymentMethod": request.payment_method,
        "failureReason": request.failure_reason or "UNKNOWN",
        "customerSegment": customer.get("customerSegment", "UNKNOWN")
    }])
    
    try:
        # The scikit-learn pipeline handles preprocessing and scaling
        probs = model.predict_proba(df)[:, 1]
        preds = model.predict(df)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")
    
    # Lightweight Explainability (Heuristic-based model/business signals)
    explanation = []
    
    if request.amount > 500:
        explanation.append("High transaction value")
    
    success_tx = customer.get("successfulTransactions", 0)
    total_tx = customer.get("totalTransactions", 0)
    if total_tx > 0 and (success_tx / total_tx) > 0.8:
        explanation.append("Customer has strong historical payment success")
        
    if request.failure_reason in ["NETWORK_ERROR", "AUTHENTICATION_REQUIRED", "PAYMENT_TIMEOUT"]:
        explanation.append("Transient failure reason (high recovery chance)")
        
    if customer.get("previousRecoveryAttempts", 0) > 3:
        explanation.append("Repeated failed recovery attempts")
        
    if request.days_since_event < 2:
        explanation.append("Recent payment failure")
    
    if not explanation:
        explanation.append("Standard recovery profile")
    
    return PredictionResponse(
        recovery_probability=round(float(probs[0]), 4),
        predicted_label=int(preds[0]),
        explanation=explanation,
        model_id="recovery_pipeline",
        model_version=str(os.path.getmtime(MODEL_PATH))
    )
