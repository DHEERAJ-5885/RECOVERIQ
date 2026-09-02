import { Router } from 'express';
import { db } from '../db';
import { auditLogs } from '../db/schema';
import { desc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/audit
 * Returns audit log entries, most recent first.
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await db.select().from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    res.json(logs);
  } catch (error: any) {
    console.error('Error in GET /api/audit:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
