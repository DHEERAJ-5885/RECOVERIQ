import { describe, it, expect } from 'vitest';
// No import needed; using global fetch available in Node 18+

describe('Dashboard API', () => {
  it('should return metrics with required fields', async () => {
    const res = await fetch('http://localhost:3001/api/analytics/dashboard');
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty('totalRevenueAtRisk');
    expect(data).toHaveProperty('recoveredRevenue');
    expect(data).toHaveProperty('recoveryRate');
    expect(data).toHaveProperty('totalCases');
    expect(data).toHaveProperty('activeCases');
    expect(data).toHaveProperty('recoveredCases');
    expect(data).toHaveProperty('awaitingPayment');
    expect(data).toHaveProperty('avgProbability');
    expect(data).toHaveProperty('estRecoverable');
  }, 5000);
});
