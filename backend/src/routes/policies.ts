import { Router } from 'express';
import { db } from '../db';
import { recoveryPolicies } from '../db/schema';
import { desc } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const policies = await db.select().from(recoveryPolicies).orderBy(desc(recoveryPolicies.createdAt));
    res.json(policies);
  } catch (error: any) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
