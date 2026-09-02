import { Router } from 'express';
import { db } from '../db';
import { recoveryCases, recoveryActions, recoveryPredictions, revenueEvents, customers, auditLogs, escalations } from '../db/schema';
import { eq, desc, sql, and, or, ilike, count, asc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/cases
 * Returns all recovery cases with optional filtering.
 */
router.get('/', async (req, res) => {
  try {
    const { status, priority, search, limit: limitStr } = req.query;
    const limit = parseInt(limitStr as string) || 50;

    let query = db.select({
      id: recoveryCases.id,
      merchantId: recoveryCases.merchantId,
      customerId: recoveryCases.customerId,
      eventId: recoveryCases.eventId,
      status: recoveryCases.status,
      amountAtRisk: recoveryCases.amountAtRisk,
      currency: recoveryCases.currency,
      riskScore: recoveryCases.riskScore,
      priority: recoveryCases.priority,
      urgency: recoveryCases.urgency,
      createdAt: recoveryCases.createdAt,
      updatedAt: recoveryCases.updatedAt,
      customerEmail: customers.email,
      customerName: customers.name,
      eventType: revenueEvents.eventType,
      failureReason: revenueEvents.failureReason,
      paymentMethod: revenueEvents.paymentMethod,
    }).from(recoveryCases)
      .leftJoin(customers, eq(recoveryCases.customerId, customers.id))
      .leftJoin(revenueEvents, eq(recoveryCases.eventId, revenueEvents.id))
      .orderBy(desc(recoveryCases.createdAt))
      .limit(limit);

    // Apply filters using $dynamic() if needed
    const conditions: any[] = [];
    if (status && status !== 'ALL') {
      conditions.push(eq(recoveryCases.status, status as string));
    }
    if (priority && priority !== 'ALL') {
      conditions.push(eq(recoveryCases.priority, priority as string));
    }

    let results;
    if (conditions.length > 0) {
      results = await db.select({
        id: recoveryCases.id,
        merchantId: recoveryCases.merchantId,
        customerId: recoveryCases.customerId,
        eventId: recoveryCases.eventId,
        status: recoveryCases.status,
        amountAtRisk: recoveryCases.amountAtRisk,
        currency: recoveryCases.currency,
        riskScore: recoveryCases.riskScore,
        priority: recoveryCases.priority,
        urgency: recoveryCases.urgency,
        createdAt: recoveryCases.createdAt,
        updatedAt: recoveryCases.updatedAt,
        customerEmail: customers.email,
        customerName: customers.name,
        eventType: revenueEvents.eventType,
        failureReason: revenueEvents.failureReason,
        paymentMethod: revenueEvents.paymentMethod,
      }).from(recoveryCases)
        .leftJoin(customers, eq(recoveryCases.customerId, customers.id))
        .leftJoin(revenueEvents, eq(recoveryCases.eventId, revenueEvents.id))
        .where(and(...conditions))
        .orderBy(desc(recoveryCases.createdAt))
        .limit(limit);
    } else {
      results = await query;
    }

    res.json(results);
  } catch (error: any) {
    console.error('Error in GET /api/cases:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cases/:id
 * Returns a single recovery case with full details: prediction, actions, event, customer.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get case
    const cases = await db.select().from(recoveryCases).where(eq(recoveryCases.id, id)).limit(1);
    if (!cases.length) {
      return res.status(404).json({ error: 'Case not found' });
    }
    const recoveryCase = cases[0];

    // Get customer
    const customerRows = await db.select().from(customers).where(eq(customers.id, recoveryCase.customerId)).limit(1);
    const customer = customerRows[0] || null;

    // Get event
    const eventRows = await db.select().from(revenueEvents).where(eq(revenueEvents.id, recoveryCase.eventId)).limit(1);
    const event = eventRows[0] || null;

    // Get predictions
    const predictions = await db.select().from(recoveryPredictions)
      .where(eq(recoveryPredictions.caseId, id))
      .orderBy(desc(recoveryPredictions.createdAt));

    // Get actions
    const actions = await db.select().from(recoveryActions)
      .where(eq(recoveryActions.caseId, id))
      .orderBy(desc(recoveryActions.createdAt));

    // Get audit logs
    const audits = await db.select().from(auditLogs)
      .where(eq(auditLogs.entityId, id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    // Get escalations
    const escRows = await db.select().from(escalations)
      .where(eq(escalations.caseId, id));

    res.json({
      case: recoveryCase,
      customer,
      event,
      predictions,
      actions,
      auditLogs: audits,
      escalations: escRows,
    });
  } catch (error: any) {
    console.error('Error in GET /api/cases/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
