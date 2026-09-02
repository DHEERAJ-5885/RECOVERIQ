export interface PolicyContext {
  amount: number;
  failureReason: string | null;
  subscriptionStatus: string | null;
  previousRecoveryAttempts: number;
  riskScore: number;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Engine to determine if a recommended action is permitted 
 * by business rules/guardrails.
 */
export class RecoveryPolicyService {
  
  static authorizeAction(action: string, ctx: PolicyContext): PolicyDecision {
    // Universal guardrails
    if (ctx.failureReason === 'FRAUD_SUSPECTED') {
      return { allowed: false, reason: 'Action blocked: Suspected fraud.' };
    }
    
    if (ctx.previousRecoveryAttempts >= 3) {
      if (action !== 'ESCALATE_TO_HUMAN' && action !== 'STOP_RECOVERY') {
        return { allowed: false, reason: 'Action blocked: Maximum automatic recovery attempts (3) exceeded.' };
      }
    }
    
    // Action-specific guardrails
    switch (action) {
      case 'RETRY_PAYMENT':
        if (ctx.amount > 1000) {
          return { allowed: false, reason: 'Action blocked: Automatic retry not permitted for amounts > $1000 without human approval.' };
        }
        if (['CARD_EXPIRED', 'BANK_DECLINED'].includes(ctx.failureReason || '')) {
          return { allowed: false, reason: 'Action blocked: Direct retry not permitted for permanent failure reasons.' };
        }
        break;
        
      case 'GENERATE_PAYMENT_LINK':
        if (ctx.riskScore > 85) {
          return { allowed: false, reason: 'Action blocked: Risk score too high to blindly send payment links.' };
        }
        break;
        
      case 'REQUEST_ALTERNATIVE_PAYMENT_METHOD':
        if (ctx.subscriptionStatus !== 'ACTIVE' && ctx.subscriptionStatus !== 'HALTED') {
          // If it's just a one-off checkout that was abandoned, this might still make sense, but
          // let's say we only strictly enforce this for subscriptions if it's halted.
          // In reality, this action is fairly safe.
        }
        break;

      case 'SEND_PAYMENT_REMINDER':
        // Extremely low friction, usually allowed.
        break;
        
      case 'ESCALATE_TO_HUMAN':
      case 'STOP_RECOVERY':
        // Always allowed
        break;
        
      default:
        return { allowed: false, reason: `Action blocked: Unknown action type [${action}]` };
    }
    
    return { allowed: true, reason: 'Action is within configured recovery policy' };
  }
}
