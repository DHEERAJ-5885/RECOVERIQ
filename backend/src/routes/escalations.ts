import { Router } from 'express';
import { db } from '../db';
import { escalations, recoveryCases, customers, recoveryPredictions, revenueEvents } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const data = await db.select({
      escalation: escalations,
      case: recoveryCases,
      customer: customers,
      prediction: recoveryPredictions,
      event: revenueEvents
    })
    .from(escalations)
    .innerJoin(recoveryCases, eq(escalations.caseId, recoveryCases.id))
    .innerJoin(customers, eq(recoveryCases.customerId, customers.id))
    .innerJoin(revenueEvents, eq(recoveryCases.eventId, revenueEvents.id))
    .leftJoin(recoveryPredictions, eq(recoveryCases.id, recoveryPredictions.caseId))
    .orderBy(desc(escalations.createdAt));
    
    // Group by escalation to avoid duplicates if multiple predictions
    const map = new Map();
    for (const row of data) {
      if (!map.has(row.escalation.id)) {
        map.set(row.escalation.id, {
          ...row.escalation,
          case: row.case,
          customer: row.customer,
          prediction: row.prediction,
          event: row.event
        });
      }
    }

    res.json(Array.from(map.values()));
  } catch (error: any) {
    console.error('Error fetching escalations:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
