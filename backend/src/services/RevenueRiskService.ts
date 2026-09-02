import { revenueEvents } from '../db/schema';
import { recoveryCases } from '../db/schema';
import { recoveryPredictions } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

/**
 * Deterministic revenue risk scoring engine.
 * Produces a riskScore between 0 and 100 based on business heuristics.
 * The score reflects the likelihood of revenue loss, NOT the recovery probability.
 */
export class RevenueRiskService {
  /**
   * Compute risk score for a revenue event.
   * @param input - contains event and customer behavioural features.
   * @returns riskScore (0-100), priority (HIGH/MEDIUM/LOW) and urgency.
   */
  static computeRisk(input: RiskScoreInput): RiskScoreResult {
    const { amount, failureReason, checkoutStage, subscriptionStatus, customerFeatures } = input;
    // Base score proportional to amount (higher amount = higher risk)
    let score = Math.min(100, (Number(amount) / 1000) * 40); // up to 40 points for amount > $2500

    // Failure reason weighting
    const reasonWeight: Record<string, number> = {
      'INSUFFICIENT_FUNDS': 30,
      'CARD_EXPIRED': 25,
      'NETWORK_ERROR': 20,
      'FRAUD_SUSPECTED': 35,
      'UNKNOWN': 15,
    };
    score += reasonWeight[failureReason?.toUpperCase() ?? 'UNKNOWN'] ?? 15;

    // Checkout stage weighting (later stage failures are riskier)
    const stageWeight: Record<string, number> = {
      'PAYMENT': 10,
      'AUTHENTICATION': 15,
      'CONFIRMATION': 20,
      'UNKNOWN': 5,
    };
    score += stageWeight[checkoutStage?.toUpperCase() ?? 'UNKNOWN'] ?? 5;

    // Subscription status influence
    if (subscriptionStatus?.toUpperCase() === 'ACTIVE') {
      score += 5;
    } else if (subscriptionStatus?.toUpperCase() === 'HALTED') {
      score += 15;
    }

    // Customer historical behaviour (failure rate)
    const failureRate = customerFeatures.failedTransactions / Math.max(1, customerFeatures.totalTransactions);
    score += failureRate * 30; // up to 30 points based on past failures

    // Clamp score
    const riskScore = Math.round(Math.min(100, Math.max(0, score)));

    // Derive priority and urgency from riskScore thresholds
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let urgency: 'IMMEDIATE' | 'STANDARD' | 'RELAXED' = 'RELAXED';
    if (riskScore >= 75) {
      priority = 'HIGH';
      urgency = 'IMMEDIATE';
    } else if (riskScore >= 45) {
      priority = 'MEDIUM';
      urgency = 'STANDARD';
    } else {
      priority = 'LOW';
      urgency = 'RELAXED';
    }

    return { riskScore, priority, urgency };
  }
}

// Types used across services (could be moved to shared package)
export interface RiskScoreInput {
  amount: string | number;
  failureReason?: string;
  checkoutStage?: string;
  subscriptionStatus?: string;
  customerFeatures: {
    totalTransactions: number;
    failedTransactions: number;
    successfulTransactions?: number;
    averageTransactionValue?: number;
    previousRecoveryAttempts?: number;
  };
}

export interface RiskScoreResult {
  riskScore: number; // 0-100
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  urgency: 'IMMEDIATE' | 'STANDARD' | 'RELAXED';
}
