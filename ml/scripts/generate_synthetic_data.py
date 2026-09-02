"""
SYNTHETIC DEMONSTRATION DATA GENERATOR
=======================================
Generates 1,000 customers and 5,000 revenue events with realistic
correlated features for the RecoverIQ hackathon prototype.
All data is SYNTHETIC and for demonstration purposes only.
"""

import pandas as pd
import numpy as np
import uuid
from datetime import datetime, timedelta
import random
import os
import string

# Set reproducible random seed
np.random.seed(42)
random.seed(42)

NUM_CUSTOMERS = 1000
NUM_EVENTS = 5000

# Constants
EVENT_TYPES = ['PAYMENT_FAILURE', 'CHECKOUT_ABANDONMENT', 'SUBSCRIPTION_FAILURE', 'OVERDUE_RECEIVABLE']
PAYMENT_METHODS = ['UPI', 'CARD', 'NETBANKING', 'WALLET']
FAILURE_REASONS = [
    'AUTHENTICATION_REQUIRED', 'INSUFFICIENT_FUNDS', 'NETWORK_ERROR',
    'BANK_DECLINED', 'PAYMENT_TIMEOUT', 'PAYMENT_METHOD_EXPIRED', 'CUSTOMER_ABANDONED', 'UNKNOWN'
]
CHECKOUT_STAGES = ['PAYMENT', 'AUTHENTICATION', 'CONFIRMATION']
SUBSCRIPTION_STATUSES = ['ACTIVE', 'HALTED', 'CANCELED']

# Helper for synthetic names/emails
FIRST_NAMES = ['Aarav','Aditi','Amit','Ananya','Arjun','Dev','Diya','Gaurav','Ishita','Karan',
               'Kavya','Meera','Neha','Priya','Rahul','Ravi','Rohan','Sakshi','Sneha','Vikram',
               'Arun','Deepa','Harsh','Jaya','Kunal','Lakshmi','Manish','Nisha','Pooja','Suresh']
LAST_NAMES = ['Sharma','Patel','Singh','Kumar','Gupta','Reddy','Joshi','Mehta','Shah','Verma',
              'Nair','Rao','Das','Iyer','Chopra','Bhat','Desai','Kulkarni','Pillai','Mishra']
DOMAINS = ['gmail.com','yahoo.com','outlook.com','protonmail.com','mail.com']

# Generate Customers
customers = []
merchant_id = str(uuid.uuid4())

for i in range(NUM_CUSTOMERS):
    # Customer characteristics
    total_tx = np.random.poisson(20)
    success_rate = np.random.beta(8, 2) # Mostly successful
    
    successful_tx = int(total_tx * success_rate)
    failed_tx = total_tx - successful_tx
    avg_value = max(10.0, np.random.normal(150.0, 50.0))
    total_value = successful_tx * avg_value
    
    prev_recovery_attempts = int(failed_tx * np.random.uniform(0.1, 0.8))
    prev_success_recoveries = int(prev_recovery_attempts * np.random.uniform(0.2, 0.9))
    
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    name = f"{first} {last}"
    email = f"{first.lower()}.{last.lower()}{i}@{random.choice(DOMAINS)}"
    phone = f"+91{''.join(random.choices(string.digits, k=10))}"
    
    customers.append({
        'id': str(uuid.uuid4()),
        'merchantId': merchant_id,
        'externalId': f"cust-{i}",
        'email': email,
        'name': name,
        'phone': phone,
        'totalTransactions': total_tx,
        'successfulTransactions': successful_tx,
        'failedTransactions': failed_tx,
        'totalSuccessfulValue': round(total_value, 2),
        'averageTransactionValue': round(avg_value, 2),
        'previousRecoveryAttempts': prev_recovery_attempts,
        'previousSuccessfulRecoveries': prev_success_recoveries,
        'customerSegment': np.random.choice(['NEW', 'LOYAL', 'AT_RISK'], p=[0.2, 0.6, 0.2]),
        'successRate': success_rate # Hidden feature for generation logic
    })

customers_df = pd.DataFrame(customers)
# Drop the hidden logic feature for the final CSV, but keep it for events generation
final_customers_df = customers_df.drop(columns=['successRate'])


# Generate Revenue Events
events = []
now = datetime.now()

# Correlated Generation Logic:
# - High success rate customers are more likely to recover.
# - Network/Auth errors are highly recoverable.
# - Insufficient funds are moderately recoverable.
# - Bank declined is hard to recover.
# - Recent events are more recoverable.

for _ in range(NUM_EVENTS):
    customer = customers_df.sample(1).iloc[0]
    
    amount = max(5.0, np.random.normal(customer['averageTransactionValue'], 30.0))
    event_type = np.random.choice(EVENT_TYPES, p=[0.5, 0.2, 0.2, 0.1])
    
    if event_type == 'CHECKOUT_ABANDONMENT':
        failure_reason = 'CUSTOMER_ABANDONED'
    else:
        failure_reason = np.random.choice(FAILURE_REASONS[:-2], p=[0.15, 0.3, 0.2, 0.2, 0.1, 0.05])
        
    payment_method = np.random.choice(PAYMENT_METHODS)
    days_ago = np.random.exponential(15) # Skewed towards recent
    occurred_at = now - timedelta(days=days_ago)
    
    # Calculate recovery probability based on features
    base_prob = 0.3
    
    # Feature 1: Customer history
    if customer['successRate'] > 0.8:
        base_prob += 0.2
    elif customer['successRate'] < 0.5:
        base_prob -= 0.15
        
    # Feature 2: Failure Reason
    if failure_reason in ['NETWORK_ERROR', 'AUTHENTICATION_REQUIRED', 'PAYMENT_TIMEOUT']:
        base_prob += 0.3 # Transient, easily recoverable
    elif failure_reason == 'INSUFFICIENT_FUNDS':
        base_prob += 0.05
    elif failure_reason == 'BANK_DECLINED':
        base_prob -= 0.2
        
    # Feature 3: Event Type
    if event_type == 'SUBSCRIPTION_FAILURE':
        base_prob += 0.1
    elif event_type == 'CHECKOUT_ABANDONMENT':
        base_prob -= 0.1 # Harder to get them back
        
    # Feature 4: Time
    if days_ago < 2:
        base_prob += 0.15
    elif days_ago > 30:
        base_prob -= 0.2
        
    # Feature 5: Amount
    if amount > 500:
        base_prob -= 0.1 # Very large amounts are harder to recover sometimes
        
    # Add some noise
    base_prob += np.random.normal(0, 0.1)
    
    # Cap probability
    prob = max(0.05, min(0.95, base_prob))
    
    # Assign target label
    recovered = np.random.random() < prob
    
    events.append({
        'id': str(uuid.uuid4()),
        'merchantId': merchant_id,
        'customerId': customer['id'],
        'eventType': event_type,
        'transactionId': f"txn_{uuid.uuid4().hex[:12]}",
        'amount': round(amount, 2),
        'currency': 'USD',
        'paymentMethod': payment_method,
        'status': 'FAILED',
        'failureReason': failure_reason,
        'checkoutStage': np.random.choice(CHECKOUT_STAGES),
        'subscriptionStatus': np.random.choice(SUBSCRIPTION_STATUSES) if event_type == 'SUBSCRIPTION_FAILURE' else None,
        'occurredAt': occurred_at.isoformat(),
        'isRecovered': 1 if recovered else 0 # TARGET
    })

events_df = pd.DataFrame(events)

# Save datasets
os.makedirs('../data', exist_ok=True)

# Save merchant
merchant_df = pd.DataFrame([{'id': merchant_id, 'name': 'RecoverIQ Demo Merchant'}])
merchant_df.to_csv('../data/merchant.csv', index=False)

final_customers_df.to_csv('../data/customers.csv', index=False)
events_df.to_csv('../data/revenue_events.csv', index=False)

print("=" * 60)
print("SYNTHETIC DEMONSTRATION DATA - RecoverIQ Prototype")
print("=" * 60)
print(f"Merchant ID: {merchant_id}")
print(f"Customers generated: {len(final_customers_df)}")
print(f"Revenue events generated: {len(events_df)}")
print(f"Recovery rate in dataset: {events_df['isRecovered'].mean():.2%}")
print(f"Event type distribution:")
for et, cnt in events_df['eventType'].value_counts().items():
    print(f"  {et}: {cnt}")
print(f"Payment method distribution:")
for pm, cnt in events_df['paymentMethod'].value_counts().items():
    print(f"  {pm}: {cnt}")
print(f"Failure reason distribution:")
for fr, cnt in events_df['failureReason'].value_counts().items():
    print(f"  {fr}: {cnt}")
print(f"\nFiles saved to ../data/")
print(f"  merchant.csv, customers.csv, revenue_events.csv")

