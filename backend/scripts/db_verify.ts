import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  const tables = [
    'users',
    'merchants',
    'customers',
    'revenue_events',
    'recovery_cases',
    'recovery_predictions',
    'recovery_actions',
    'recovery_policies',
    'escalations',
    'webhook_events',
    'audit_logs'
  ];
  
  const results: Record<string, any> = {};
  for (const table of tables) {
    try {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) FROM ${table}`));
      results[table] = result.rows ? result.rows[0].count : result[0].count;
    } catch (e: any) {
      results[table] = 'ERROR: ' + e.message;
    }
  }

  // Calculate analytics directly from DB
  const analytics: Record<string, any> = {};
  
  // totalRevenueAtRisk
  try {
    const riskResult = await db.execute(sql.raw(`
      SELECT SUM(amount_at_risk) as total_risk 
      FROM recovery_cases 
      WHERE status NOT IN ('RECOVERED', 'STOPPED', 'CLOSED')
    `));
    analytics.totalRevenueAtRisk = riskResult.rows ? riskResult.rows[0].total_risk : riskResult[0].total_risk;
  } catch (e: any) { analytics.totalRevenueAtRisk = e.message; }

  // estimatedRecoverableRevenue
  try {
    const estResult = await db.execute(sql.raw(`
      SELECT SUM(c.amount_at_risk * (p.recovery_probability::numeric)) as est_recoverable
      FROM recovery_cases c
      JOIN recovery_predictions p ON c.id = p.case_id
      WHERE c.status NOT IN ('RECOVERED', 'STOPPED', 'CLOSED')
    `));
    analytics.estimatedRecoverableRevenue = estResult.rows ? estResult.rows[0].est_recoverable : estResult[0].est_recoverable;
  } catch (e: any) { analytics.estimatedRecoverableRevenue = e.message; }

  // overallRecoveryProbability
  try {
    const probResult = await db.execute(sql.raw(`
      SELECT AVG(p.recovery_probability::numeric) as avg_prob
      FROM recovery_cases c
      JOIN recovery_predictions p ON c.id = p.case_id
      WHERE c.status NOT IN ('RECOVERED', 'STOPPED', 'CLOSED')
    `));
    analytics.overallRecoveryProbability = probResult.rows ? probResult.rows[0].avg_prob : probResult[0].avg_prob;
  } catch (e: any) { analytics.overallRecoveryProbability = e.message; }

  // recoveredRevenue
  try {
    const recResult = await db.execute(sql.raw(`
      SELECT SUM(amount_at_risk) as recovered
      FROM recovery_cases 
      WHERE status = 'RECOVERED'
    `));
    analytics.recoveredRevenue = recResult.rows ? recResult.rows[0].recovered : recResult[0].recovered;
  } catch (e: any) { analytics.recoveredRevenue = e.message; }

  // activeCasesCount
  try {
    const activeResult = await db.execute(sql.raw(`
      SELECT COUNT(*) as active
      FROM recovery_cases 
      WHERE status NOT IN ('RECOVERED', 'STOPPED', 'CLOSED')
    `));
    analytics.activeCasesCount = activeResult.rows ? activeResult.rows[0].active : activeResult[0].active;
  } catch (e: any) { analytics.activeCasesCount = e.message; }

  console.log(JSON.stringify({ tables: results, analytics }, null, 2));
  process.exit(0);
}

run();
