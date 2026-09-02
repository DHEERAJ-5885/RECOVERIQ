import { RecoveryWorkflowService } from '../src/services/RecoveryWorkflowService';
import { db } from '../src/db';
import { revenueEvents } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function runTests() {
  console.log('--- STARTING DECISION ENGINE TESTS ---\n');

  try {
    // 1. High-probability recoverable case (small amount, recent)
    // Actually, rather than guessing IDs, let's query the DB for specific profiles
    const events = await db.select().from(revenueEvents).limit(100);
    
    // We don't know the exact probabilities beforehand, so we'll just run analysis on a few diverse events
    // Let's pick:
    // a) An event with amount < 100, paymentMethod CARD
    // b) An event with amount > 1000
    // c) An event with failureReason 'FRAUD_SUSPECTED' or 'CARD_EXPIRED'
    
    const eventSmall = events.find(e => parseFloat(e.amount as string) < 100) || events[0];
    const eventLarge = events.find(e => parseFloat(e.amount as string) > 1000) || events[1];
    const eventPerm = events.find(e => e.failureReason === 'CARD_EXPIRED' || e.failureReason === 'BANK_DECLINED') || events[2];

    const testCases = [
      { name: '1. Small Amount (Likely High Prob)', id: eventSmall.id },
      { name: '2. High Value Transaction', id: eventLarge.id },
      { name: '3. Permanent Failure Reason', id: eventPerm.id },
    ];

    for (const tc of testCases) {
      console.log(`\nTesting Case: ${tc.name} [Event ID: ${tc.id}]`);
      const res = await RecoveryWorkflowService.analyzeEvent(tc.id);
      console.log(`Amount: $${res.event.amount}`);
      console.log(`Failure Reason: ${res.event.failureReason || 'N/A'}`);
      console.log(`Risk Score: ${res.riskScore} (${res.riskLevel})`);
      console.log(`ML Recovery Probability: ${res.recoveryProbability}`);
      console.log(`Recommended Action: ${res.recommendedAction}`);
      console.log(`Reasoning: \n  - ${res.reasoning.join('\n  - ')}`);
      console.log(`Policy Result: ${res.policy.allowed ? 'ALLOWED' : 'BLOCKED'} (${res.policy.reason})`);
      console.log(`Final Status: ${res.status}`);
      console.log('-'.repeat(50));
    }

    console.log('\n--- TESTS COMPLETED SUCCESSFULLY ---');
  } catch (e: any) {
    console.error('TEST FAILED:', e);
  } finally {
    process.exit(0);
  }
}

runTests();
