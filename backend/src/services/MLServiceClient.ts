export interface MLPredictionRequest {
  event_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  failure_reason: string | null;
  checkout_stage: string | null;
  subscription_status: string | null;
  event_type: string;
  days_since_event: number;
  customer_features: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    previousRecoveryAttempts: number;
    previousSuccessfulRecoveries: number;
    customerSegment: string;
  };
}

export interface MLPredictionResponse {
  recovery_probability: number;
  predicted_label: number;
  explanation: string[];
  model_id: string;
  model_version: string;
}

export class MLServiceClient {
  private static baseUrl = process.env.ML_API_URL || 'http://127.0.0.1:8000';

  static async predictRecoveryProbability(req: MLPredictionRequest): Promise<MLPredictionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/recovery-probability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ML API error: ${response.status} ${errText}`);
      }
      
      return await response.json() as MLPredictionResponse;
    } catch (error: any) {
      console.error('MLServiceClient predict error:', error);
      throw new Error(`Failed to get ML prediction: ${error.message}`);
    }
  }
}
