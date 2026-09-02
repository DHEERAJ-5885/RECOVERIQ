import { pgTable, uuid, text, timestamp, boolean, decimal, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('ADMIN'), // ADMIN, AGENT, READONLY
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const merchants = pgTable('merchants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  apiKey: text('api_key'),
  webhookUrl: text('webhook_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  externalId: text('external_id'), // Merchant's customer ID
  email: text('email').notNull(),
  name: text('name'),
  phone: text('phone'),
  
  // Behavioral features
  totalTransactions: integer('total_transactions').default(0).notNull(),
  successfulTransactions: integer('successful_transactions').default(0).notNull(),
  failedTransactions: integer('failed_transactions').default(0).notNull(),
  totalSuccessfulValue: decimal('total_successful_value', { precision: 12, scale: 2 }).default('0').notNull(),
  averageTransactionValue: decimal('average_transaction_value', { precision: 12, scale: 2 }).default('0').notNull(),
  previousRecoveryAttempts: integer('previous_recovery_attempts').default(0).notNull(),
  previousSuccessfulRecoveries: integer('previous_successful_recoveries').default(0).notNull(),
  customerSegment: text('customer_segment').default('UNKNOWN'), // NEW, LOYAL, AT_RISK
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    merchantIdIdx: index('customer_merchant_id_idx').on(table.merchantId)
  }
});

export const revenueEvents = pgTable('revenue_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  eventType: text('event_type').notNull(), // PAYMENT_FAILURE, CHECKOUT_ABANDONMENT, SUBSCRIPTION_FAILURE, OVERDUE_RECEIVABLE
  transactionId: text('transaction_id').unique(), // For idempotency
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('INR'),
  paymentMethod: text('payment_method'), // UPI, CARD, NETBANKING, WALLET
  status: text('status').notNull().default('FAILED'), // FAILED, PENDING
  failureReason: text('failure_reason'), // INSUFFICIENT_FUNDS, NETWORK_ERROR, etc.
  checkoutStage: text('checkout_stage'), // PAYMENT, AUTHENTICATION, CONFIRMATION
  subscriptionStatus: text('subscription_status'), // ACTIVE, HALTED, CANCELED
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    merchantIdIdx: index('event_merchant_id_idx').on(table.merchantId),
    customerIdIdx: index('event_customer_id_idx').on(table.customerId),
    eventTypeIdx: index('event_type_idx').on(table.eventType),
    statusIdx: index('event_status_idx').on(table.status),
    occurredAtIdx: index('event_occurred_at_idx').on(table.occurredAt),
  }
});

export const recoveryCases = pgTable('recovery_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  eventId: uuid('event_id').notNull().unique().references(() => revenueEvents.id), // Ensure 1:1 event to case mapping
  status: text('status').notNull().default('DETECTED'), // DETECTED, ANALYZING, RECOMMENDED, etc.
  amountAtRisk: decimal('amount_at_risk', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('INR'),
  
  // Risk Engine Fields
  riskScore: decimal('risk_score', { precision: 5, scale: 2 }), // 0-100
  priority: text('priority'), // HIGH, MEDIUM, LOW
  urgency: text('urgency'), // IMMEDIATE, STANDARD, RELAXED
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    eventIdIdx: index('case_event_id_idx').on(table.eventId),
    statusIdx: index('case_status_idx').on(table.status),
    priorityIdx: index('case_priority_idx').on(table.priority),
  }
});

export const recoveryPredictions = pgTable('recovery_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => recoveryCases.id),
  recoveryProbability: decimal('recovery_probability', { precision: 5, scale: 4 }).notNull(),
  recommendedAction: text('recommended_action'),
  aiReasoning: text('ai_reasoning'),
  modelId: text('model_id'),
  modelVersion: text('model_version'),
  predictionId: text('prediction_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const recoveryPolicies = pgTable('recovery_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  name: text('name').notNull(),
  description: text('description'),
  conditionLogic: jsonb('condition_logic').notNull(),
  allowedActions: jsonb('allowed_actions').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const recoveryActions = pgTable('recovery_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => recoveryCases.id),
  actionType: text('action_type').notNull(), // EMAIL_REMINDER, RETRY_CHARGE, etc.
  status: text('status').notNull().default('PENDING'), // PENDING, EXECUTED, FAILED
  executionDate: timestamp('execution_date'),
  resultMetadata: jsonb('result_metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const escalations = pgTable('escalations', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => recoveryCases.id),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('OPEN'), // OPEN, RESOLVED
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').references(() => merchants.id),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processed: boolean('processed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(), // case, action, policy
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(), // CREATED, UPDATED, EXECUTED, REVENUE_EVENT_DETECTED
  userId: uuid('user_id'), // if manual
  changes: jsonb('changes'),
  metadata: jsonb('metadata'),
  source: text('source'), // service/source
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    entityIdIdx: index('audit_entity_id_idx').on(table.entityId),
    actionIdx: index('audit_action_idx').on(table.action),
  }
});
