const { Client } = require('pg');
require('dotenv').config();

async function checkDataQuality() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('--- DATA QUALITY CHECK ---');
  let allPass = true;
  let duplicates = 0;
  let orphans = 0;

  try {
    // 1. Counts
    const customerCount = await client.query('SELECT COUNT(*) FROM customers');
    const eventCount = await client.query('SELECT COUNT(*) FROM revenue_events');
    console.log(`Customers in DB: ${customerCount.rows[0].count}`);
    console.log(`Events in DB: ${eventCount.rows[0].count}`);

    // 2. Null customer IDs
    const nullCustomerIds = await client.query('SELECT COUNT(*) FROM revenue_events WHERE customer_id IS NULL');
    console.log(`Events with null customer_id: ${nullCustomerIds.rows[0].count}`);
    if (nullCustomerIds.rows[0].count > 0) allPass = false;

    // 3. Orphaned revenue events (customer_id not in customers table)
    const orphanedEvents = await client.query('SELECT COUNT(*) FROM revenue_events WHERE customer_id NOT IN (SELECT id FROM customers)');
    orphans = parseInt(orphanedEvents.rows[0].count);
    console.log(`Orphaned revenue events: ${orphans}`);
    if (orphans > 0) allPass = false;

    // 4. Invalid transaction amounts
    const invalidAmounts = await client.query('SELECT COUNT(*) FROM revenue_events WHERE amount <= 0');
    console.log(`Events with amount <= 0: ${invalidAmounts.rows[0].count}`);
    if (invalidAmounts.rows[0].count > 0) allPass = false;

    // 5. Invalid event statuses
    const invalidStatuses = await client.query("SELECT COUNT(*) FROM revenue_events WHERE status NOT IN ('FAILED', 'PENDING')");
    console.log(`Events with invalid status: ${invalidStatuses.rows[0].count}`);
    if (invalidStatuses.rows[0].count > 0) allPass = false;

    // 6. Invalid payment methods
    const invalidPMs = await client.query("SELECT COUNT(*) FROM revenue_events WHERE payment_method NOT IN ('UPI', 'CARD', 'NETBANKING', 'WALLET') AND payment_method IS NOT NULL");
    console.log(`Events with invalid payment_method: ${invalidPMs.rows[0].count}`);
    if (invalidPMs.rows[0].count > 0) allPass = false;

    // 7. Invalid failure reasons
    const invalidReasons = await client.query("SELECT COUNT(*) FROM revenue_events WHERE failure_reason NOT IN ('AUTHENTICATION_REQUIRED', 'INSUFFICIENT_FUNDS', 'NETWORK_ERROR', 'BANK_DECLINED', 'PAYMENT_TIMEOUT', 'PAYMENT_METHOD_EXPIRED', 'CUSTOMER_ABANDONED', 'UNKNOWN') AND failure_reason IS NOT NULL");
    console.log(`Events with invalid failure_reason: ${invalidReasons.rows[0].count}`);
    if (invalidReasons.rows[0].count > 0) allPass = false;

    // 8. Duplicate transaction IDs
    const duplicateTxIds = await client.query('SELECT COUNT(*) as dupes FROM (SELECT transaction_id FROM revenue_events GROUP BY transaction_id HAVING COUNT(*) > 1) as dup_query');
    duplicates = parseInt(duplicateTxIds.rows[0].dupes);
    console.log(`Duplicate transaction IDs: ${duplicates}`);
    if (duplicates > 0) allPass = false;

    console.log('--- SUMMARY ---');
    console.log(`DATA QUALITY CHECK: ${allPass ? 'PASS' : 'FAILED'}`);
    console.log(`DUPLICATES: ${duplicates}`);
    console.log(`ORPHAN RECORDS: ${orphans}`);

  } catch (err) {
    console.error('Error during data quality check:', err);
  } finally {
    await client.end();
  }
}

checkDataQuality().catch(console.error);
