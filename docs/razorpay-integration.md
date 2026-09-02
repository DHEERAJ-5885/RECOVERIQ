# Razorpay Integration Guide

## Verified Razorpay Capabilities
After reviewing the official Razorpay API documentation for this prototype, the following capabilities have been verified and integrated:

1. **Payment Links API**: Supported via `POST https://api.razorpay.com/v1/payment_links`. It allows dynamic creation of a payment page URL without requiring frontend UI implementation.
2. **Test Mode**: Fully supported using `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Test Mode.
3. **Webhooks**: Supported for events like `payment_link.paid`, `payment_link.cancelled`, and `payment_link.expired`. Signatures are provided via the `X-Razorpay-Signature` header (HMAC SHA-256).

## Execution Mappings
To strictly adhere to actual capabilities without inventing APIs, the RecoverIQ actions are mapped as follows:

### 1. Real Integrations (`executionMode: "RAZORPAY_TEST"`)
- **GENERATE_PAYMENT_LINK**: Calls the actual Razorpay Payment Links API in Test Mode. Generates a real `short_url` and tracks the specific Razorpay `id`.

### 2. Simulated Prototype Actions (`executionMode: "SIMULATED"`)
Because this is a hackathon prototype and direct headless retries of failed card payments (auto-retries) require specific vaulting/mandate configurations (Razorpay Subscriptions / Tokens) that cannot be cleanly fully automated for arbitrary historical events without a stored mandate ID, the following actions are strictly SIMULATED:
- **RETRY_PAYMENT**: Simulates a backend-to-backend retry attempt.
- **SEND_PAYMENT_REMINDER**: Simulates triggering an email/SMS reminder workflow.
- **REQUEST_ALTERNATIVE_PAYMENT_METHOD**: Simulates triggering a flow asking the customer for a new card.
- **ESCALATE_TO_HUMAN**: Simulates generating an internal support ticket.
- **STOP_RECOVERY**: Safely closes the case locally.

## Authentication & Security
- **API Requests**: Authenticated via Basic Auth using base64 encoded `RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET`.
- **Webhooks**: Validated using `RAZORPAY_WEBHOOK_SECRET` to compute an HMAC SHA-256 signature against the raw request body. Invalid signatures are rejected with `400 Bad Request`.
- **Idempotency**: Execution endpoints and webhook handlers use unique DB constraints (e.g. checking existing case states) to prevent duplicate execution or duplicate event processing.

## Limitations
- A successful payment link payment in Test Mode will trigger the `payment_link.paid` webhook, updating the RecoverIQ case status to `RECOVERED`. 
- Due to lack of real mandates on generated synthetic data, auto-retry is inherently simulated.
