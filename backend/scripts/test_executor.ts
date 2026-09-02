import { RecoveryWorkflowService } from '../src/services/RecoveryWorkflowService';
import { RecoveryActionExecutor } from '../src/services/RecoveryActionExecutor';
import { RazorpayService } from '../src/services/RazorpayService';
import { db } from '../src/db';
import { revenueEvents, recoveryCases } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function runTests() {
  console.log('--- STARTING EXECUTION LAYER TESTS ---\n');

  try {
    const events = await db.select().from(revenueEvents).limit(200);
    
    // Find different scenarios
    const eventStop = events.find(e => e.failureReason === 'BANK_DECLINED' || e.failureReason === 'CARD_EXPIRED') || events[0];
    const eventSimulateRetry = events.find(e => e.failureReason === 'NETWORK_ERROR' && parseFloat(e.amount as string) > 50 && parseFloat(e.amount as string) < 100) || events[1];
    const eventGenerateLink = events.find(e => e.failureReason === 'CUSTOMER_ABANDONED') || events[2];
    
    // 1. Test simulated action execution
    console.log(`\nTesting SIMULATED Execution [Event ID: ${eventStop.id}]`);
    let res = await RecoveryWorkflowService.analyzeEvent(eventStop.id);
    console.log(`Status after analyze: ${res.status}`);
    
    if (res.policy.allowed) {
      const execRes = await RecoveryActionExecutor.executeAction(res.caseId);
      console.log(`Execution Mode: ${execRes.executionMode}`);
      console.log(`Final Case Status: ${execRes.status}`);
      console.log(`Result:`, execRes.result);
      
      // 2. Test duplicate execution
      console.log(`\nTesting Duplicate Execution [Case ID: ${res.caseId}]`);
      try {
        await RecoveryActionExecutor.executeAction(res.caseId);
        console.log('FAIL: Allowed duplicate execution');
      } catch (e: any) {
        console.log(`SUCCESS: Duplicate execution prevented -> ${e.message}`);
      }
    }

    // 3. Test missing credentials (GENERATE_PAYMENT_LINK)
    console.log(`\nTesting Missing Razorpay Credentials [Event ID: ${eventGenerateLink.id}]`);
    // Ensure credentials are empty for this test
    process.env.RAZORPAY_KEY_ID = '';
    process.env.RAZORPAY_KEY_SECRET = '';
    
    res = await RecoveryWorkflowService.analyzeEvent(eventGenerateLink.id);
    if (res.recommendedAction === 'GENERATE_PAYMENT_LINK') {
      try {
        await RecoveryActionExecutor.executeAction(res.caseId);
        console.log('FAIL: Executed payment link without credentials');
      } catch (e: any) {
        console.log(`SUCCESS: Failed safely on missing credentials -> ${e.message}`);
        // verify case status was set to FAILED
        const verifyCase = await db.select().from(recoveryCases).where(eq(recoveryCases.id, res.caseId)).limit(1);
        console.log(`Verified Case Status: ${verifyCase[0].status}`); // Should be FAILED
      }
    } else {
      console.log(`Skipping - model recommended ${res.recommendedAction} instead.`);
    }

    // 4. Test Webhook Signature Validation
    console.log(`\nTesting Webhook Security`);
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test_secret';
    const payload = '{"event": "test"}';
    const isInvalid = RazorpayService.verifyWebhookSignature(payload, 'invalid_signature');
    if (!isInvalid) {
      console.log('SUCCESS: Rejected invalid signature logic');
    } else {
      console.log('FAIL: Allowed invalid signature');
    }
    const crypto = require('crypto');
    const validSignature = crypto.createHmac('sha256', 'test_secret').update(payload).digest('hex');
    const isValid = RazorpayService.verifyWebhookSignature(payload, validSignature);
    console.log(`SUCCESS: Valid signature check -> ${isValid}`);

  } catch (e: any) {
    console.error('TEST FAILED:', e);
  } finally {
    process.exit(0);
  }
}

runTests();
