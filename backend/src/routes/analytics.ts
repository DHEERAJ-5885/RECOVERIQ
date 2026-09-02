import { Router } from 'express';
import { db } from '../db';
import { recoveryCases, revenueEvents, recoveryActions, recoveryPredictions, customers } from '../db/schema';
import { sql, eq, count, sum, desc, asc } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/analytics/dashboard
 * Returns KPI values for the main dashboard cards.
 */
router.get('/dashboard', async (req, res) => {
  try {
    const TERMINAL_STATUSES = ['RECOVERED', 'STOPPED', 'FAILED', 'CLOSED'];

    // Total revenue at risk (sum of all active case amounts)
    const riskResult = await db.select({
      totalAtRisk: sum(recoveryCases.amountAtRisk),
      totalCases: count(recoveryCases.id),
    }).from(recoveryCases)
      .where(sql`${recoveryCases.status} NOT IN (${sql.join(TERMINAL_STATUSES.map(s => sql`${s}`), sql`, `)})`);

    // Recovered cases
    const recoveredResult = await db.select({
      recoveredAmount: sum(recoveryCases.amountAtRisk),
      recoveredCount: count(recoveryCases.id),
    }).from(recoveryCases).where(eq(recoveryCases.status, 'RECOVERED'));

    // Active cases metrics (using same terminal filter)
    const activeResult = await db.select({
      activeCount: count(recoveryCases.id),
      avgProbability: sql`AVG(CAST(${recoveryPredictions.recoveryProbability} AS NUMERIC))`,
      estRecoverable: sql`SUM(CAST(${recoveryCases.amountAtRisk} AS NUMERIC) * CAST(${recoveryPredictions.recoveryProbability} AS NUMERIC))`,
    }).from(recoveryCases)
      .leftJoin(recoveryPredictions, eq(recoveryCases.id, recoveryPredictions.caseId))
      .where(sql`${recoveryCases.status} NOT IN (${sql.join(TERMINAL_STATUSES.map(s => sql`${s}`), sql`, `)})`);

    // Awaiting payment
    const awaitingResult = await db.select({
      awaitingCount: count(recoveryCases.id),
    }).from(recoveryCases).where(eq(recoveryCases.status, 'AWAITING_PAYMENT'));

    const totalAtRisk = parseFloat(riskResult[0]?.totalAtRisk || '0');
    const recoveredAmount = parseFloat(recoveredResult[0]?.recoveredAmount || '0');
    
    // Recovery rate = recovered / (active risk + recovered) to get historical rate
    const totalHistoricalRisk = totalAtRisk + recoveredAmount;
    const recoveryRate = totalHistoricalRisk > 0 ? ((recoveredAmount / totalHistoricalRisk) * 100) : 0;
    
    const avgProbability = activeResult[0]?.avgProbability 
      ? parseFloat(activeResult[0]?.avgProbability as string) * 100 
      : 0;
    const estRecoverable = activeResult[0]?.estRecoverable 
      ? parseFloat(activeResult[0]?.estRecoverable as string) 
      : 0;

    res.json({
      totalRevenueAtRisk: totalAtRisk,
      recoveredRevenue: recoveredAmount,
      recoveryRate: parseFloat(recoveryRate.toFixed(1)),
      totalCases: Number(riskResult[0]?.totalCases || 0) + Number(recoveredResult[0]?.recoveredCount || 0), // Active + Recovered
      activeCases: Number(activeResult[0]?.activeCount || 0),
      recoveredCases: Number(recoveredResult[0]?.recoveredCount || 0),
      awaitingPayment: Number(awaitingResult[0]?.awaitingCount || 0),
      avgProbability: parseFloat(avgProbability.toFixed(1)),
      estRecoverable: estRecoverable
    });
  } catch (error: any) {
    console.error('Error in /api/analytics/dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/risk-breakdown
 * Returns case counts and amounts grouped by priority level.
 */
router.get('/risk-breakdown', async (req, res) => {
  try {
    const breakdown = await db.select({
      priority: recoveryCases.priority,
      caseCount: count(recoveryCases.id),
      totalAmount: sum(recoveryCases.amountAtRisk),
    }).from(recoveryCases)
      .groupBy(recoveryCases.priority);

    const result = {
      HIGH: { count: 0, amount: 0 },
      MEDIUM: { count: 0, amount: 0 },
      LOW: { count: 0, amount: 0 },
    };

    for (const row of breakdown) {
      const key = (row.priority || 'LOW') as keyof typeof result;
      if (result[key]) {
        result[key] = {
          count: Number(row.caseCount),
          amount: parseFloat(row.totalAmount || '0'),
        };
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/analytics/risk-breakdown:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/failure-reasons
 * Returns event counts grouped by failure reason.
 */
router.get('/failure-reasons', async (req, res) => {
  try {
    const reasons = await db.select({
      reason: revenueEvents.failureReason,
      eventCount: count(revenueEvents.id),
      totalAmount: sum(revenueEvents.amount),
    }).from(revenueEvents)
      .groupBy(revenueEvents.failureReason);

    res.json(reasons.map(r => ({
      reason: r.reason || 'UNKNOWN',
      count: Number(r.eventCount),
      amount: parseFloat(r.totalAmount || '0'),
    })));
  } catch (error: any) {
    console.error('Error in /api/analytics/failure-reasons:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/action-distribution
 * Returns counts of recovery actions grouped by action type and status.
 */
router.get('/action-distribution', async (req, res) => {
  try {
    const actions = await db.select({
      actionType: recoveryActions.actionType,
      status: recoveryActions.status,
      actionCount: count(recoveryActions.id),
    }).from(recoveryActions)
      .groupBy(recoveryActions.actionType, recoveryActions.status);

    res.json(actions.map(a => ({
      actionType: a.actionType,
      status: a.status,
      count: Number(a.actionCount),
    })));
  } catch (error: any) {
    console.error('Error in /api/analytics/action-distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/status-distribution
 * Returns case counts grouped by status.
 */
router.get('/status-distribution', async (req, res) => {
  try {
    const statuses = await db.select({
      status: recoveryCases.status,
      caseCount: count(recoveryCases.id),
      totalAmount: sum(recoveryCases.amountAtRisk),
    }).from(recoveryCases)
      .groupBy(recoveryCases.status);

    res.json(statuses.map(s => ({
      status: s.status,
      count: Number(s.caseCount),
      amount: parseFloat(s.totalAmount || '0'),
    })));
  } catch (error: any) {
    console.error('Error in /api/analytics/status-distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/recovery-over-time
 * Returns daily aggregates for riskAmount and recoveredAmount.
 */
router.get('/recovery-over-time', async (req, res) => {
  try {
    const rawCases = await db.select({
      createdAt: recoveryCases.createdAt,
      amountAtRisk: recoveryCases.amountAtRisk,
      status: recoveryCases.status,
    }).from(recoveryCases);

    const aggregates: Record<string, { date: string; riskAmount: number; recoveredAmount: number }> = {};

    for (const c of rawCases) {
      const dateStr = (c.createdAt ? new Date(c.createdAt) : new Date()).toISOString().split('T')[0];
      if (!aggregates[dateStr]) {
        aggregates[dateStr] = { date: dateStr, riskAmount: 0, recoveredAmount: 0 };
      }
      const amt = parseFloat(c.amountAtRisk || '0');
      aggregates[dateStr].riskAmount += amt;
      if (c.status === 'RECOVERED') {
        aggregates[dateStr].recoveredAmount += amt;
      }
    }

    const resultList = Object.values(aggregates).sort((a, b) => a.date.localeCompare(b.date));
    res.json(resultList);
  } catch (error: any) {
    console.error('Error in /api/analytics/recovery-over-time:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
