import { Router } from 'express';
import { RecoveryWorkflowService } from '../services/RecoveryWorkflowService';
import { RecoveryActionExecutor } from '../services/RecoveryActionExecutor';
import { randomUUID } from 'crypto';

const router = Router();

router.post('/analyze', async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    const result = await RecoveryWorkflowService.analyzeEvent(eventId);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /analyze:', error);
    res.status(500).json({ error: error.message });
  }
});

import { db } from '../db';
import { revenueEvents, customers, recoveryCases, recoveryActions, escalations } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { AuditService } from '../services/AuditService';
import { RecoveryPolicyService } from '../services/RecoveryPolicyService';

router.post('/:caseId/manual-action', async (req, res) => {
  try {
    const { caseId } = req.params;
    const { actionType, reason } = req.body;
    
    // 1. Validate Case
    const cases = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId)).limit(1);
    if (!cases.length) return res.status(404).json({ error: 'Case not found' });
    const recoveryCase = cases[0];
    
    if (!['ESCALATED', 'RECOMMENDED', 'AWAITING_PAYMENT', 'EXECUTING'].includes(recoveryCase.status || '')) {
      return res.status(400).json({ error: 'Case is not in ESCALATED state' });
    }

    await AuditService.log('case', caseId, 'HUMAN_REVIEW_STARTED');

    // Handle Reject Recommendation
    if (actionType === 'REJECT_RECOMMENDATION') {
      await db.update(recoveryCases).set({ status: 'STOPPED', updatedAt: new Date() }).where(eq(recoveryCases.id, caseId));
      await AuditService.log('case', caseId, 'HUMAN_ACTION_REJECTED', { reason });
      await AuditService.log('case', caseId, 'RECOVERY_STOPPED', { reason: 'Human decision' });
      return res.json({ status: 'STOPPED' });
    }
    
    // Handle specific manual actions
    const actualAction = actionType;
    await AuditService.log('case', caseId, 'HUMAN_ACTION_SELECTED', { action: actualAction });

    // 2. Policy Validation
    const eventRows = await db.select().from(revenueEvents).where(eq(revenueEvents.id, recoveryCase.eventId)).limit(1);
    const event = eventRows[0];
    const customerRows = await db.select().from(customers).where(eq(customers.id, recoveryCase.customerId)).limit(1);
    const customer = customerRows[0];
    
    const policyCtx = {
      amount: Number(event.amount),
      failureReason: event.failureReason,
      subscriptionStatus: event.subscriptionStatus,
      previousRecoveryAttempts: customer.previousRecoveryAttempts,
      riskScore: Number(recoveryCase.riskScore)
    };
    
    const policyResult = RecoveryPolicyService.authorizeAction(actualAction, policyCtx);
    
    if (!policyResult.allowed) {
      await AuditService.log('policy', caseId, 'POLICY_CHECKED', { action: actualAction, allowed: false, reason: policyResult.reason });
      return res.status(403).json({ error: 'Guardrail violation', reason: policyResult.reason });
    }
    
    await AuditService.log('policy', caseId, 'POLICY_CHECKED', { action: actualAction, allowed: true, reason: policyResult.reason });
    await AuditService.log('case', caseId, 'HUMAN_ACTION_APPROVED', { action: actualAction });
    
    // 3. Create Action
    // Mark previous pending actions as FAILED (skipped)
    await db.update(recoveryActions)
      .set({ status: 'FAILED', resultMetadata: { error: 'Overridden by human action' } })
      .where(eq(recoveryActions.caseId, caseId));
      
    const actionId = randomUUID();
    await db.insert(recoveryActions).values({
      id: actionId,
      caseId: caseId,
      actionType: actualAction,
      status: 'PENDING',
      resultMetadata: { policyReason: policyResult.reason, humanApproved: true }
    });
    
    // Resolve escalation
    await db.update(escalations).set({ status: 'RESOLVED', updatedAt: new Date() }).where(eq(escalations.caseId, caseId));
    
    // 4. Execute Action
    const result = await RecoveryActionExecutor.executeAction(caseId);
    
    res.json(result);
  } catch (error: any) {
    console.error(`Error executing manual action for case ${req.params.caseId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:caseId/execute', async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await RecoveryActionExecutor.executeAction(caseId);
    res.json(result);
  } catch (error: any) {
    console.error(`Error executing action for case ${req.params.caseId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
