export interface DecisionContext {
  recoveryProbability: number;
  riskScore: number;
  amount: number;
  failureReason: string | null;
  subscriptionStatus: string | null;
  previousAttempts: number;
}

export interface DecisionResult {
  recommendedAction: string;
  confidence: number;
  reasoning: string[];
}

/**
 * Maps ML Probabilities and Risk Scores to a recommended business action.
 */
export class RecoveryDecisionService {
  
  static recommendAction(ctx: DecisionContext, mlExplanations: string[]): DecisionResult {
    const { recoveryProbability, riskScore, amount, failureReason, previousAttempts } = ctx;
    const reasoning = [...mlExplanations]; // Start with ML signals
    
    let action = 'SEND_PAYMENT_REMINDER';
    let confidence = recoveryProbability;
    
    const isPermanent = ['CARD_EXPIRED', 'BANK_DECLINED', 'UNKNOWN'].includes(failureReason || '');
    const isHighValue = amount > 500;
    
    if (recoveryProbability >= 0.70) {
      if (isPermanent) {
        action = 'REQUEST_ALTERNATIVE_PAYMENT_METHOD';
        reasoning.push('High recovery probability, but failure reason requires a different payment method.');
      } else {
        action = 'RETRY_PAYMENT';
        reasoning.push('High recovery probability with transient failure; automated retry is optimal.');
      }
    } else if (recoveryProbability >= 0.40) {
      if (isHighValue) {
        action = 'ESCALATE_TO_HUMAN';
        reasoning.push('Medium recovery probability but high transaction value warrants human review.');
      } else {
        action = 'GENERATE_PAYMENT_LINK';
        reasoning.push('Medium recovery probability; sending a direct payment link to reduce friction.');
      }
    } else {
      if (previousAttempts >= 2) {
        action = 'STOP_RECOVERY';
        reasoning.push('Low recovery probability and multiple previous attempts; stopping to prevent customer fatigue/spam.');
      } else {
        action = 'ESCALATE_TO_HUMAN';
        reasoning.push('Low recovery probability on fresh failure; escalating to human for personalized outreach.');
      }
    }
    
    // Override for fraud
    if (failureReason === 'FRAUD_SUSPECTED') {
      action = 'STOP_RECOVERY';
      reasoning.push('Fraud suspected; stopping all automated recovery attempts.');
    }
    
    return {
      recommendedAction: action,
      confidence: parseFloat(confidence.toFixed(2)),
      reasoning
    };
  }
}
