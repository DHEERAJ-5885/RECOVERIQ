# RecoverIQ ML Pipeline

## Overview
This document details the Machine Learning pipeline built for the RecoverIQ hackathon prototype. The pipeline focuses on predicting the probability that a failed revenue event (e.g., payment failure, checkout abandonment) will be successfully recovered.

**IMPORTANT DISCLAIMER**: The current model is trained on **SYNTHETIC DEMONSTRATION DATA**. The performance metrics on this synthetic dataset reflect the heuristic patterns programmed into the data generator, and do not represent expected production performance on real-world data.

## Dataset
- **Total Customers**: 1,000
- **Total Revenue Events**: 5,000
- **Target Variable**: `isRecovered` (Binary: 1 for recovered, 0 for not recovered)

## Features Used
- **amount**: Transaction amount (numerical)
- **days_since_event**: Days elapsed since the failure (numerical)
- **totalTransactions**: Customer historical total transactions (numerical)
- **successfulTransactions**: Customer historical successful transactions (numerical)
- **failedTransactions**: Customer historical failed transactions (numerical)
- **previousRecoveryAttempts**: Customer historical recovery attempts (numerical)
- **previousSuccessfulRecoveries**: Customer historical successful recoveries (numerical)
- **eventType**: Type of event (categorical)
- **paymentMethod**: Method of payment (categorical)
- **failureReason**: Reason for the failure (categorical)
- **customerSegment**: Customer's loyalty segment (categorical)

## Preprocessing
- **Categorical Features**: `OneHotEncoder(handle_unknown='ignore', sparse_output=False)`
- **Numerical Features**: `StandardScaler()`
- Missing numericals filled with 0, missing categoricals filled with "UNKNOWN".

## Models Evaluated
- Logistic Regression
- Random Forest Classifier
*Note: A reproducible 80/20 train-test split with a fixed random seed (42) was used.*

## Evaluation Metrics (Logistic Regression - Selected Model)
- **Accuracy**: 0.6870
- **Precision**: 0.6988
- **Recall**: 0.6162
- **F1 Score**: 0.6549
- **ROC-AUC**: 0.7527

**Selection Rationale**: Logistic Regression was selected because it achieved the highest ROC-AUC score (0.7527 vs 0.7205 for Random Forest). ROC-AUC is critical for this business use-case because it measures the model's ability to correctly rank revenue recovery opportunities, ensuring the highest priority cases are processed first.

## Limitations
- **Synthetic Data Baseline**: Metrics are artificial; real-world data will have different distributions and latent correlations.
- **Data Leakage Mitigations**: We ensured `isRecovered` is exclusively used as the target label during training and entirely dropped from the feature vector.
- **Explainability**: The prototype provides lightweight heuristic business-rule explainability rather than exact SHAP-value feature attributions, keeping latency extremely low.

## Inference API
The model is served via a FastAPI service locally.

### Health Check
`GET /health`
Returns system status.

### Prediction Endpoint
`POST /predict/recovery-probability`

**Example Request:**
```json
{
  "event_id": "893c5240-410c-43f9-ba2a-ebbdad00b0c2",
  "amount": 250.50,
  "currency": "USD",
  "payment_method": "CARD",
  "failure_reason": "INSUFFICIENT_FUNDS",
  "checkout_stage": "PAYMENT",
  "subscription_status": "ACTIVE",
  "event_type": "PAYMENT_FAILURE",
  "days_since_event": 2,
  "customer_features": {
    "totalTransactions": 15,
    "successfulTransactions": 12,
    "failedTransactions": 3,
    "previousRecoveryAttempts": 1,
    "previousSuccessfulRecoveries": 0,
    "customerSegment": "LOYAL"
  }
}
```

**Example Response:**
```json
{
  "recovery_probability": 0.4281,
  "predicted_label": 0,
  "explanation": [
    "Customer has strong historical payment success",
    "Standard recovery profile"
  ],
  "model_id": "recovery_pipeline",
  "model_version": "1724657422.04"
}
```
