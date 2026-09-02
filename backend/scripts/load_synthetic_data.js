const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Client } = require('pg');
require('dotenv').config();

const DATA_DIR = path.join(__dirname, '../../data');


async function readCSV(filename) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.join(DATA_DIR, filename))
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

async function loadData() {
  console.log('Loading CSV files...');
  const merchants = await readCSV('merchant.csv');
  const customers = await readCSV('customers.csv');
  const events = await readCSV('revenue_events.csv');

  console.log(`Parsed ${merchants.length} merchants, ${customers.length} customers, ${events.length} events.`);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to DB.');

  try {
    await client.query('BEGIN');

    // 1. Insert Merchant
    for (const m of merchants) {
      await client.query(`
        INSERT INTO merchants (id, name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO NOTHING
      `, [m.id, m.name]);
    }
    console.log('Inserted merchants.');

    // 2. Insert Customers
    for (let i = 0; i < customers.length; i += 100) {
      const chunk = customers.slice(i, i + 100);
      let query = 'INSERT INTO customers (id, merchant_id, external_id, email, name, phone, total_transactions, successful_transactions, failed_transactions, total_successful_value, average_transaction_value, previous_recovery_attempts, previous_successful_recoveries, customer_segment) VALUES ';
      const values = [];
      let paramIndex = 1;
      
      const chunkQueries = [];
      for (const c of chunk) {
        chunkQueries.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        values.push(
          c.id, c.merchantId, c.externalId, c.email, c.name, c.phone,
          parseInt(c.totalTransactions), parseInt(c.successfulTransactions), parseInt(c.failedTransactions),
          parseFloat(c.totalSuccessfulValue), parseFloat(c.averageTransactionValue),
          parseInt(c.previousRecoveryAttempts), parseInt(c.previousSuccessfulRecoveries),
          c.customerSegment
        );
      }
      query += chunkQueries.join(', ') + ' ON CONFLICT (id) DO NOTHING';
      await client.query(query, values);
    }
    console.log('Inserted customers.');

    // 3. Insert Events
    for (let i = 0; i < events.length; i += 100) {
      const chunk = events.slice(i, i + 100);
      let query = 'INSERT INTO revenue_events (id, merchant_id, customer_id, event_type, transaction_id, amount, currency, payment_method, status, failure_reason, checkout_stage, subscription_status, occurred_at, metadata) VALUES ';
      const values = [];
      let paramIndex = 1;
      
      const chunkQueries = [];
      for (const e of chunk) {
        chunkQueries.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        values.push(
          e.id, e.merchantId, e.customerId, e.eventType, e.transactionId,
          parseFloat(e.amount), e.currency, e.paymentMethod, e.status,
          e.failureReason, e.checkoutStage, e.subscriptionStatus || null,
          e.occurredAt,
          JSON.stringify({ isRecovered: parseInt(e.isRecovered) })
        );
      }
      query += chunkQueries.join(', ') + ' ON CONFLICT (id) DO NOTHING';
      await client.query(query, values);
    }
    console.log('Inserted events.');

    await client.query('COMMIT');
    console.log('Transaction committed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error inserting data:', err);
  } finally {
    await client.end();
  }
}

loadData().catch(console.error);
