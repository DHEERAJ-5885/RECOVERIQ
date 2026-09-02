import { db } from './src/db';
import { recoveryPolicies, merchants } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function seed() {
  const m = await db.select().from(merchants).limit(1);
  if (m.length === 0) {
    console.log("No merchant found");
    process.exit(1);
  }
  const merchantId = m[0].id;
  
  await db.delete(recoveryPolicies);
  
  const policies = [
    {
      merchantId,
      name: 'Fraud Block',
      description: 'Block all automatic recovery actions when fraud is suspected.',
      conditionLogic: { scope: 'All Actions', type: 'Guardrail', rules: [{ field: 'failureReason', op: 'eq', value: 'FRAUD_SUSPECTED' }] },
      allowedActions: [],
      isActive: true,
    },
    {
      merchantId,
      name: 'Max Retry Limit',
      description: 'Maximum number of retry attempts before escalation (3 attempts).',
      conditionLogic: { scope: 'All Actions', type: 'Guardrail', rules: [{ field: 'previousRecoveryAttempts', op: 'gte', value: 3 }] },
      allowedActions: ['ESCALATE_TO_HUMAN', 'STOP_RECOVERY'],
      isActive: true,
    },
    {
      merchantId,
      name: 'High-Value Manual Approval',
      description: 'Automatic retry not permitted for amounts exceeding ₹1000 without human approval.',
      conditionLogic: { scope: 'Amount > ₹1000', type: 'Guardrail', rules: [{ field: 'amount', op: 'gt', value: 1000 }] },
      allowedActions: ['ESCALATE_TO_HUMAN'],
      isActive: true,
    },
    {
      merchantId,
      name: 'Permanent Failure Block',
      description: 'Direct retry not permitted for permanent failure reasons like expired cards.',
      conditionLogic: { scope: 'Card Expired / Bank Declined', type: 'Guardrail', rules: [{ field: 'failureReason', op: 'in', value: ['CARD_EXPIRED', 'BANK_DECLINED'] }] },
      allowedActions: ['ESCALATE_TO_HUMAN', 'REQUEST_ALTERNATIVE_PAYMENT_METHOD', 'GENERATE_PAYMENT_LINK'],
      isActive: true,
    },
    {
      merchantId,
      name: 'High-Risk Auto Escalation',
      description: 'Auto-escalate high-risk cases. Block payment link generation.',
      conditionLogic: { scope: 'Risk Score > 85', type: 'Guardrail', rules: [{ field: 'riskScore', op: 'gt', value: 85 }] },
      allowedActions: ['ESCALATE_TO_HUMAN', 'STOP_RECOVERY'],
      isActive: true,
    }
  ];

  for (const p of policies) {
    await db.insert(recoveryPolicies).values(p);
  }
  console.log("Seeded policies.");
  process.exit(0);
}
seed();
