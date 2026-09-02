# Recovery Decision Engine

## Overview
The Recovery Decision Engine translates raw Machine Learning predictions into actionable, safe, and explainable business decisions. 

It strictly separates **Prediction** (ML probability) from **Authorization** (Policy Rules).

### The Architecture
1. **Analyze**: Retrieve the failed revenue event and customer behavioral history.
2. **Predict (ML)**: Use the `recovery_pipeline.joblib` model via the Python FastAPI to assess the raw probability of recovery.
3. **Decide (Business Logic)**: The `RecoveryDecisionService` recommends an action based on probability bounds and event features.
4. **Authorize (Policy)**: The `RecoveryPolicyService` checks the recommended action against strict guardrails.
5. **Audit**: All inputs, predictions, decisions, and guardrail blocks are recorded in `audit_logs`.

---

## 1. Decision Logic (RecoveryDecisionService)

The decision engine recommends an action based on the ML probability score:

- **HIGH Probability (>= 70%)**:
  - If Failure Reason is permanent (e.g. `CARD_EXPIRED`): Recommend `REQUEST_ALTERNATIVE_PAYMENT_METHOD`.
  - If Failure Reason is transient: Recommend `RETRY_PAYMENT`.
  
- **MEDIUM Probability (40% - 69%)**:
  - If Transaction Value > $500: Escalate to Human review to avoid poor automated handling of high-value clients.
  - If Transaction Value <= $500: Recommend `GENERATE_PAYMENT_LINK`.

- **LOW Probability (< 40%)**:
  - If Customer has >= 2 previous recovery attempts: Recommend `STOP_RECOVERY` to prevent customer fatigue.
  - Otherwise: Recommend `ESCALATE_TO_HUMAN` for personalized outreach.

- **FRAUD Override**:
  - If Failure Reason == `FRAUD_SUSPECTED`: Always recommend `STOP_RECOVERY`.

---

## 2. Policy Guardrails (RecoveryPolicyService)

Once an action is recommended, it must pass the policy engine:

- **Universal Guardrails**:
  - **FRAUD**: Any action on `FRAUD_SUSPECTED` is blocked.
  - **Max Retries**: If previous automated attempts >= 3, all automated actions are blocked (only ESCALATE or STOP allowed).
  
- **Action-Specific Guardrails**:
  - `RETRY_PAYMENT`: Blocked if the amount exceeds $1000 (requires manual intervention). Blocked if failure reason is inherently permanent (`CARD_EXPIRED`, `BANK_DECLINED`).
  - `GENERATE_PAYMENT_LINK`: Blocked if the calculated heuristic Risk Score is > 85 (too risky to offer unsupervised payment paths).
  - `ESCALATE_TO_HUMAN` / `STOP_RECOVERY`: Always allowed.

---

## 3. Explanations and AI Reasoning

The system combines lightweight ML signals (e.g., "Customer has strong historical payment success") with the business decision reasoning (e.g., "Medium recovery probability; sending a direct payment link to reduce friction").

This provides full visibility to operations teams in the dashboard.

---

## 4. Limitations (Hackathon Prototype)

- **No Real Payments**: The workflow terminates at `RECOMMENDED` or `BLOCKED`. It does not execute live Razorpay/Stripe charges yet.
- **Sequential DB Operations**: Database writes (`recovery_cases`, `recovery_predictions`, `recovery_actions`, `audit_logs`) are done sequentially instead of via a single transaction for prototype simplicity. In production, these must be strictly transactional to prevent partial states.
