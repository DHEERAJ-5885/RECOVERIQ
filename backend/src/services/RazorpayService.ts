import crypto from 'crypto';

export class RazorpayService {
  private static getCredentials() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing.');
    }
    return { keyId, keySecret };
  }

  static async generatePaymentLink(caseId: string, amount: string, currency: string, description: string) {
    const { keyId, keySecret } = this.getCredentials();
    
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    // Razorpay amounts are in smallest currency unit (e.g. paise/cents)
    const amountInSmallestUnit = Math.round(parseFloat(amount) * 100);

    const payload = {
      amount: amountInSmallestUnit,
      currency: 'INR', // Force INR as required for Indian Razorpay accounts
      accept_partial: false,
      reference_id: caseId,
      description: description,
      reminder_enable: true,
      notes: {
        recoveriq_case_id: caseId
      }
    };

    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Razorpay API Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return {
      paymentLinkId: data.id,
      paymentLinkUrl: data.short_url,
      status: data.status
    };
  }

  static verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET is not configured. Failing webhook verification safely.');
      return false;
    }
    // Basic validation – Razorpay signatures are 64‑character hex strings.
    if (!signature || signature.length !== 64) {
      return false;
    }
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    // Use constant‑time comparison to mitigate timing attacks.
    return crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'));
  }
}
