import { Router } from 'express';
import { db } from '../db';
import { revenueEvents, customers } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { RecoveryWorkflowService } from '../services/RecoveryWorkflowService';

const router = Router();

/**
 * POST /api/dev/escalate-test
 * Creates a synthetic revenue event and runs the recovery analysis workflow.
 * Payload example:
 * {
 *   "customerId": "cust_123",
 *   "merchantId": "merch_456",
 *   "amount": 1000,
 *   "currency": "INR",
 *   "failureReason": "CARD_DECLINED",
 *   "subscriptionStatus": null,
 *   "checkoutStage": "checkout_page",
 *   "eventType": "payment_failure"
 * }
 */
router.post('/escalate-test', async (req, res) => {
  try {
    const {
      customerId,
      merchantId,
      amount,
      currency,
      failureReason,
      subscriptionStatus,
      checkoutStage,
      eventType,
    } = req.body;

    if (!customerId || !merchantId || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure customer exists (or create stub) using upsert to avoid duplicate errors
    await db
      .insert(customers)
      .values({
        id: customerId,
        merchantId: merchantId,
        name: 'Test Customer',
        email: 'test@example.com',
        totalTransactions: 0,
        failedTransactions: 0,
        successfulTransactions: 0,
        averageTransactionValue: 0,
        previousRecoveryAttempts: 0,
        previousSuccessfulRecoveries: 0,
        customerSegment: 'TEST',
      })
      .onConflictDoNothing();

    const eventId = uuidv4();
    await db.insert(revenueEvents).values({
      id: eventId,
      merchantId,
      customerId,
      amount,
      currency,
      failureReason: failureReason || null,
      subscriptionStatus: subscriptionStatus || null,
      checkoutStage: checkoutStage || null,
      eventType: eventType || 'payment_failure',
      occurredAt: new Date(),
    });

    const result = await RecoveryWorkflowService.analyzeEvent(eventId);
    res.json(result);
  } catch (error: any) {
    console.error('Error in dev/escalate-test:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
