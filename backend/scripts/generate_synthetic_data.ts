import { db } from '../db';
import { revenueEvents } from '../db/schema';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, notExists } from 'drizzle-orm';

/**
 * Deterministic synthetic data generator.
 * Generates exactly 1,000 customers and 5,000 revenue events.
 * All IDs are UUIDs. The random seed is fixed for reproducibility.
 */
export async function generateSyntheticData() {
  // Fixed seed via faker
  faker.seed(12345);

  // Generate customers
  const customers = [];
  for (let i = 0; i < 1000; i++) {
    const customerId = uuidv4();
    const totalTx = faker.datatype.number({ min: 5, max: 50 });
    const failedTx = faker.datatype.number({ min: 0, max: totalTx });
    const successfulTx = totalTx - failedTx;
    const totalSuccessfulValue = Number((successfulTx * faker.datatype.float({ min: 10, max: 500, precision: 0.01 })).toFixed(2));
    const avgTxValue = Number((totalSuccessfulValue / Math.max(1, successfulTx)).toFixed(2));
    customers.push({
      id: customerId,
      merchantId: null, // will be set later after merchants are created
      externalId: `cust-${i}`,
      email: faker.internet.email(),
      name: faker.name.fullName(),
      phone: faker.phone.number('+91##########'),
      totalTransactions: totalTx,
      successfulTransactions: successfulTx,
      failedTransactions: failedTx,
      totalSuccessfulValue: totalSuccessfulValue,
      averageTransactionValue: avgTxValue,
      previousRecoveryAttempts: faker.datatype.number({ min: 0, max: 5 }),
      previousSuccessfulRecoveries: faker.datatype.number({ min: 0, max: 5 }),
      customerSegment: faker.helpers.arrayElement(['NEW', 'LOYAL', 'AT_RISK']),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Insert customers (assumes a merchant exists with id merchantId)
  const merchant = await db.select().from(db.merchants).limit(1);
  const merchantId = merchant[0]?.id ?? uuidv4();
  // Ensure at least one merchant record
  if (!merchant.length) {
    await db.insert(db.merchants).values({
      id: merchantId,
      name: 'Demo Merchant',
      apiKey: faker.datatype.uuid(),
      webhookUrl: 'https://example.com/webhook',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  // Update merchantId in customers
  for (const c of customers) {
    c.merchantId = merchantId;
  }
  await db.insert(db.customers).values(customers);

  // Generate revenue events
  const events = [];
  const paymentMethods = ['UPI', 'CARD', 'NETBANKING', 'WALLET'];
  const failureReasons = ['INSUFFICIENT_FUNDS', 'CARD_EXPIRED', 'NETWORK_ERROR', 'FRAUD_SUSPECTED', 'UNKNOWN'];
  const checkoutStages = ['PAYMENT', 'AUTHENTICATION', 'CONFIRMATION'];
  const subscriptionStatuses = ['ACTIVE', 'HALTED', 'CANCELED'];

  for (let i = 0; i < 5000; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const amount = Number(faker.datatype.float({ min: 5, max: 2000, precision: 0.01 }).toFixed(2));
    const failureReason = faker.helpers.arrayElement(failureReasons);
    const checkoutStage = faker.helpers.arrayElement(checkoutStages);
    const subscriptionStatus = faker.helpers.arrayElement(subscriptionStatuses);
    const paymentMethod = faker.helpers.arrayElement(paymentMethods);
    const recovered = faker.datatype.boolean(); // placeholder, will be overwritten later with correlated logic
    events.push({
      id: uuidv4(),
      merchantId,
      customerId: customer.id,
      eventType: 'PAYMENT_FAILURE',
      transactionId: `txn-${i}`,
      amount,
      currency: 'USD',
      paymentMethod,
      status: 'FAILED',
      failureReason,
      checkoutStage,
      subscriptionStatus,
      occurredAt: new Date(),
      metadata: { recovered }, // temporary flag for downstream generation of target
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db.insert(db.revenueEvents).values(events);
  console.log('Generated 1000 customers and 5000 revenue events.');
}

if (require.main === module) {
  generateSyntheticData()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
