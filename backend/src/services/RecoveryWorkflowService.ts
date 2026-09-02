import { db } from '../db';
import { revenueEvents, customers, recoveryCases, recoveryPredictions, recoveryActions, escalations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RevenueRiskService } from './RevenueRiskService';
import { MLServiceClient, MLPredictionRequest } from './MLServiceClient';
import { RecoveryDecisionService } from './RecoveryDecisionService';
import { RecoveryPolicyService } from './RecoveryPolicyService';
import { AuditService } from './AuditService';
import { v4 as uuidv4 } from 'uuid';

export class RecoveryWorkflowService {
  
  static async analyzeEvent(eventId: string) {
    // 1. Fetch Event & Customer
    const eventRecords = await db
      .select()
      .from(revenueEvents)
      .where(eq(revenueEvents.id, eventId))
      .limit(1);
      
    if (!eventRecords.length) {
      throw new Error(`Revenue event ${eventId} not found`);
    }
    const event = eventRecords[0];

    const customerRecords = await db
      .select()
      .from(customers)
      .where(eq(customers.id, event.customerId))
      .limit(1);
    const customer = customerRecords[0];

    // 2. Compute Risk Score
    const riskInput = {
      amount: event.amount,
      failureReason: event.failureReason || undefined,
      checkoutStage: event.checkoutStage || undefined,
      subscriptionStatus: event.subscriptionStatus || undefined,
      customerFeatures: {
        totalTransactions: customer.totalTransactions,
        failedTransactions: customer.failedTransactions,
        successfulTransactions: customer.successfulTransactions,
        averageTransactionValue: Number(customer.averageTransactionValue),
        previousRecoveryAttempts: customer.previousRecoveryAttempts,
      }
    };
    const riskResult = RevenueRiskService.computeRisk(riskInput);

    // 3. Call ML Service
    const mlReq: MLPredictionRequest = {
      event_id: event.id,
      amount: Number(event.amount),
      currency: event.currency,
      payment_method: event.paymentMethod || 'UNKNOWN',
      failure_reason: event.failureReason,
      checkout_stage: event.checkoutStage,
      subscription_status: event.subscriptionStatus,
      event_type: event.eventType,
      days_since_event: Math.floor((Date.now() - event.occurredAt.getTime()) / (1000 * 3600 * 24)),
      customer_features: {
        totalTransactions: customer.totalTransactions,
        successfulTransactions: customer.successfulTransactions,
        failedTransactions: customer.failedTransactions,
        previousRecoveryAttempts: customer.previousRecoveryAttempts,
        previousSuccessfulRecoveries: customer.previousSuccessfulRecoveries,
        customerSegment: customer.customerSegment || 'UNKNOWN'
      }
    };
    
    let mlResponse;
    try {
      mlResponse = await MLServiceClient.predictRecoveryProbability(mlReq);
    } catch (e: any) {
      throw new Error(`ML Service failed: ${e.message}`);
    }

    // 4. Recommend Action
    const decisionCtx = {
      recoveryProbability: mlResponse.recovery_probability,
      riskScore: riskResult.riskScore,
      amount: Number(event.amount),
      failureReason: event.failureReason,
      subscriptionStatus: event.subscriptionStatus,
      previousAttempts: customer.previousRecoveryAttempts
    };
    const decision = RecoveryDecisionService.recommendAction(decisionCtx, mlResponse.explanation);

    // 5. Policy Check
    const policyCtx = {
      amount: Number(event.amount),
      failureReason: event.failureReason,
      subscriptionStatus: event.subscriptionStatus,
      previousRecoveryAttempts: customer.previousRecoveryAttempts,
      riskScore: riskResult.riskScore
    };
    const policyResult = RecoveryPolicyService.authorizeAction(decision.recommendedAction, policyCtx);

    let finalStatus = 'RECOMMENDED';
    if (!policyResult.allowed) {
      finalStatus = 'BLOCKED';
    } else if (decision.recommendedAction === 'ESCALATE_TO_HUMAN') {
      finalStatus = 'ESCALATED';
    }

    // 6. DB Inserts
    let caseId = uuidv4();
    
    // Check if case already exists
    const existingCase = await db.select().from(recoveryCases).where(eq(recoveryCases.eventId, event.id)).limit(1);
    if (existingCase.length > 0) {
      caseId = existingCase[0].id;
      // Update existing case
      await db.update(recoveryCases).set({
        status: finalStatus,
        riskScore: riskResult.riskScore.toString(),
        priority: riskResult.priority,
        urgency: riskResult.urgency,
        updatedAt: new Date()
      }).where(eq(recoveryCases.id, caseId));
      await AuditService.log('case', caseId, 'CASE_UPDATED');
    } else {
      // Create Case
      await db.insert(recoveryCases).values({
        id: caseId,
        merchantId: event.merchantId,
        customerId: event.customerId,
        eventId: event.id,
        status: finalStatus,
        amountAtRisk: event.amount,
        // Force INR to ensure payment links use correct currency
        currency: 'INR',
        riskScore: riskResult.riskScore.toString(),
        priority: riskResult.priority,
        urgency: riskResult.urgency
      });
      await AuditService.log('case', caseId, 'CASE_CREATED');
    }

    // Create Prediction
    const predId = uuidv4();
    await db.insert(recoveryPredictions).values({
      id: predId,
      caseId: caseId,
      recoveryProbability: mlResponse.recovery_probability.toString(),
      recommendedAction: decision.recommendedAction,
      aiReasoning: JSON.stringify(decision.reasoning),
      modelId: mlResponse.model_id,
      modelVersion: mlResponse.model_version
    });
    await AuditService.log('prediction', predId, 'ML_PREDICTION_CREATED');

    // Create Action
    const actionId = uuidv4();
    await db.insert(recoveryActions).values({
      id: actionId,
      caseId: caseId,
      actionType: decision.recommendedAction,
      status: policyResult.allowed ? 'PENDING' : 'FAILED',
      resultMetadata: { policyReason: policyResult.reason }
    });
    await AuditService.log('action', actionId, 'RECOVERY_ACTION_RECOMMENDED');
    await AuditService.log('policy', caseId, 'POLICY_CHECKED', { allowed: policyResult.allowed, reason: policyResult.reason });

    // Escalate if needed
    if (finalStatus === 'ESCALATED') {
      const escId = uuidv4();
      await db.insert(escalations).values({
        id: escId,
        caseId: caseId,
        reason: decision.reasoning.join('; '),
        status: 'OPEN'
      });
      await AuditService.log('case', caseId, 'ESCALATED_TO_HUMAN');
    }

    return {
      caseId,
      event: {
        amount: event.amount,
        failureReason: event.failureReason
      },
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.priority,
      recoveryProbability: mlResponse.recovery_probability,
      recommendedAction: decision.recommendedAction,
      reasoning: decision.reasoning,
      policy: policyResult,
      status: finalStatus
    };
  }
}
