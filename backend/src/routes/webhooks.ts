import { Router, Request, Response } from 'express';
import { RazorpayService } from '../services/RazorpayService';
import { db } from '../db';
import { recoveryCases } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AuditService } from '../services/AuditService';

const router = Router();

router.post('/razorpay', async (req: Request, res: Response) => {
  console.log('[WEBHOOK] RECEIVED POST /api/webhooks/razorpay');
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      console.log('[WEBHOOK] Missing Razorpay signature');
      return res.status(400).json({ error: 'Missing Razorpay signature' });
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    
    if (!RazorpayService.verifyWebhookSignature(rawBody, signature)) {
      console.log('[WEBHOOK] SIGNATURE: INVALID');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    console.log('[WEBHOOK] SIGNATURE: VALID');

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = event.event;
    console.log(`[WEBHOOK] EVENT: ${eventType}`);
    
    if (eventType === 'payment_link.paid') {
      const entity = event.payload?.payment_link?.entity || {};
      const payment = event.payload?.payment?.entity || {};
      const caseId = entity.reference_id || entity.notes?.recoveriq_case_id;
      
      console.log(`[WEBHOOK] PAYMENT_LINK_ID: ${entity.id || 'N/A'}`);
      console.log(`[WEBHOOK] PAYMENT_ID: ${payment.id || 'N/A'}`);
      console.log(`[WEBHOOK] CASE_ID: ${caseId || 'N/A'}`);
      
      if (!caseId) {
        console.log('[WEBHOOK] ERROR: No reference_id/case_id found in payment link');
        return res.status(400).json({ error: 'No reference_id found in payment link' });
      }

      // Process webhook idempotently
      await processPaymentLinkPaid(caseId, eventType, event, entity.id);
    } else {
      console.log(`[WEBHOOK] Ignored event type: ${eventType}`);
    }

    console.log('[WEBHOOK] RESPONSE: 200');
    res.json({ status: 'ok' });
  } catch (error: any) {
    console.error('[WEBHOOK] ERROR:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Extracted logic for idempotency and simulation
async function processPaymentLinkPaid(caseId: string, eventType: string, eventPayload: any, paymentLinkId: string) {
  const cases = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId)).limit(1);
  if (cases.length === 0) {
    console.log(`[WEBHOOK] ERROR: Case not found for ID ${caseId}`);
    throw new Error('Case not found');
  }
  
  const currentCase = cases[0];
  
  // Idempotency check
  if (currentCase.status === 'RECOVERED') {
    console.log(`[WEBHOOK] CASE_ID: ${caseId} is already RECOVERED. Ignoring duplicate webhook.`);
    return;
  }
  
  // 1. Mark Case as Recovered
  await db.update(recoveryCases).set({ status: 'RECOVERED', updatedAt: new Date() }).where(eq(recoveryCases.id, caseId));
  console.log(`[WEBHOOK] CASE UPDATED: RECOVERED (${caseId})`);

  // 2. Update Revenue Event
  if (currentCase.eventId) {
    const { revenueEvents } = require('../db/schema');
    await db.update(revenueEvents).set({ status: 'RECOVERED', updatedAt: new Date() }).where(eq(revenueEvents.id, currentCase.eventId));
    console.log(`[WEBHOOK] REVENUE EVENT UPDATED: RECOVERED (${currentCase.eventId})`);
  }

  // 3. Update Recovery Actions
  const { recoveryActions } = require('../db/schema');
  const { and } = require('drizzle-orm');
  await db.update(recoveryActions)
    .set({ status: 'COMPLETED', updatedAt: new Date() })
    .where(and(eq(recoveryActions.caseId, caseId), eq(recoveryActions.actionType, 'GENERATE_PAYMENT_LINK')));
  console.log(`[WEBHOOK] RECOVERY ACTION UPDATED: COMPLETED`);
    
  // 4. Store Webhook Event
  const { webhookEvents } = require('../db/schema');
  await db.insert(webhookEvents).values({
    merchantId: currentCase.merchantId,
    eventType,
    payload: eventPayload,
    processed: true,
  });
  console.log(`[WEBHOOK] WEBHOOK EVENT STORED`);

  // 5. Audit Logging
  await AuditService.log('event', caseId, 'WEBHOOK_RECEIVED', { eventType, paymentId: paymentLinkId });
  await AuditService.log('case', caseId, 'CASE_STATUS_UPDATED', { newStatus: 'RECOVERED' });
  console.log(`[WEBHOOK] AUDIT LOG CREATED`);
}

// Dev Simulation Endpoint
router.post('/dev/simulate/payment-link-paid/:caseId', async (req: Request, res: Response) => {
  console.log(`[SIMULATE] POST /api/webhooks/dev/simulate/payment-link-paid/${req.params.caseId}`);
  try {
    const { caseId } = req.params;
    const mockPayload = {
      event: 'payment_link.paid',
      payload: {
        payment_link: {
          entity: {
            id: 'plink_dev_mock',
            reference_id: caseId,
            status: 'paid'
          }
        },
        payment: {
          entity: { id: 'pay_dev_mock' }
        }
      }
    };
    
    await processPaymentLinkPaid(caseId as string, 'payment_link.paid', mockPayload, 'plink_dev_mock');
    console.log('[SIMULATE] RESPONSE: 200');
    res.json({ status: 'ok', simulated: true });
  } catch (error: any) {
    console.error('[SIMULATE] ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
