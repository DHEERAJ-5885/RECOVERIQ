import { db } from '../db';
import { recoveryCases, recoveryActions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AuditService } from './AuditService';
import { RazorpayService } from './RazorpayService';
import { v4 as uuidv4 } from 'uuid';

export class RecoveryActionExecutor {
  
  static async executeAction(caseId: string) {
    // 1. Load recovery case and its pending action
    const cases = await db.select().from(recoveryCases).where(eq(recoveryCases.id, caseId)).limit(1);
    if (!cases.length) throw new Error('Recovery case not found');
    const recoveryCase = cases[0];
    
    // Check if the case is already resolved
    if (['RECOVERED', 'STOPPED', 'EXECUTING'].includes(recoveryCase.status || '')) {
      throw new Error(`Cannot execute action on case with status ${recoveryCase.status}`);
    }

    // Find the pending action
    const actions = await db.select().from(recoveryActions)
      .where(eq(recoveryActions.caseId, caseId));
      
    // Filter to find the latest action (we could sort by created_at, but we'll assume there's one active)
    const pendingAction = actions.find(a => a.status === 'PENDING');
    if (!pendingAction) {
      throw new Error('No pending authorized action found for this case. Duplicate execution prevented.');
    }

    const actionType = pendingAction.actionType;
    let executionMode = 'SIMULATED';
    let resultPayload: any = {};
    let newCaseStatus = 'EXECUTING';

    try {
      // 2. Execute Action Logic
      if (actionType === 'GENERATE_PAYMENT_LINK') {
        // Real Razorpay integration
        executionMode = 'RAZORPAY_TEST';
        
        // Attempt execution (this throws if credentials missing or API fails)
        const rpResult = await RazorpayService.generatePaymentLink(
          caseId, 
          recoveryCase.amountAtRisk as string, 
          'INR', 
          'RecoverIQ Automated Payment Link'
        );
        
        resultPayload = {
          paymentLinkId: rpResult.paymentLinkId,
          paymentLinkUrl: rpResult.paymentLinkUrl
        };
        newCaseStatus = 'AWAITING_PAYMENT';
        
      } else {
        // Simulated integrations
        executionMode = 'SIMULATED';
        resultPayload = { note: `Simulated execution of ${actionType}` };
        
        if (actionType === 'STOP_RECOVERY') {
          newCaseStatus = 'STOPPED';
        } else if (actionType === 'ESCALATE_TO_HUMAN') {
          newCaseStatus = 'ESCALATED';
        } else {
          // e.g. RETRY_PAYMENT, SEND_PAYMENT_REMINDER (usually awaiting async webhooks in real life)
          newCaseStatus = 'EXECUTING';
        }
      }

      // 3. Update Action status
      await db.update(recoveryActions)
        .set({ 
          status: 'COMPLETED',
          resultMetadata: { ...pendingAction.resultMetadata as object, executionMode, ...resultPayload }
        })
        .where(eq(recoveryActions.id, pendingAction.id));

      // 4. Update Case status
      await db.update(recoveryCases)
        .set({ status: newCaseStatus, updatedAt: new Date() })
        .where(eq(recoveryCases.id, caseId));

      // 5. Audit Log
      await AuditService.log('action', pendingAction.id, 'ACTION_EXECUTED', { executionMode, resultPayload });
      await AuditService.log('case', caseId, 'CASE_STATUS_UPDATED', { newStatus: newCaseStatus });

      return {
        caseId,
        action: actionType,
        executionMode,
        status: newCaseStatus,
        result: resultPayload
      };
      
    } catch (error: any) {
      // Handle Execution Failure
      await db.update(recoveryActions)
        .set({ 
          status: 'FAILED',
          resultMetadata: { ...pendingAction.resultMetadata as object, error: error.message }
        })
        .where(eq(recoveryActions.id, pendingAction.id));
        
      await db.update(recoveryCases)
        .set({ status: 'FAILED', updatedAt: new Date() })
        .where(eq(recoveryCases.id, caseId));
        
      await AuditService.log('action', pendingAction.id, 'ACTION_FAILED', { error: error.message });
      throw error;
    }
  }
}
