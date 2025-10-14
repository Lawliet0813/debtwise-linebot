import { describe, it, expect } from 'vitest';
import strategy from '../core/strategy.js';

const { planAvalanche, planSnowball } = strategy;

describe('Debt repayment strategies', () => {
  const debts = [
    { id: 'card', name: 'Credit Card', balance: 5000, interestRate: 18, minPayment: 150 },
    { id: 'loan', name: 'Personal Loan', balance: 2000, interestRate: 5, minPayment: 50 },
    { id: 'medical', name: 'Medical Bill', balance: 1200, interestRate: 0, minPayment: 60 },
  ];

  it('allocates extra payments to the highest interest debt with avalanche', () => {
    const plan = planAvalanche(debts, 700);
    const firstMonth = plan.schedule[0];
    const cardPayment = firstMonth.payments.find((p) => p.id === 'card');
    const loanPayment = firstMonth.payments.find((p) => p.id === 'loan');

    expect(cardPayment.payment).toBeGreaterThan(150);
    expect(loanPayment.payment).toBeCloseTo(50, 2);
    expect(firstMonth.totalPayment).toBeCloseTo(700, 2);
    expect(plan.strategy).toBe('avalanche');
  });

  it('allocates extra payments to the smallest balance debt with snowball', () => {
    const plan = planSnowball(debts, 700);
    const firstMonth = plan.schedule[0];
    const medicalPayment = firstMonth.payments.find((p) => p.id === 'medical');
    const loanPayment = firstMonth.payments.find((p) => p.id === 'loan');

    expect(medicalPayment.payment).toBeGreaterThan(60);
    expect(loanPayment.payment).toBeCloseTo(50, 2);
    expect(firstMonth.totalPayment).toBeCloseTo(700, 2);
    expect(plan.strategy).toBe('snowball');
  });

  it('eventually clears all debts', () => {
    const plan = planAvalanche(debts, 700);
    const lastMonth = plan.schedule.at(-1);

    lastMonth.payments.forEach((payment) => {
      expect(payment.remainingBalance).toBeCloseTo(0, 2);
    });
    expect(plan.months).toBeGreaterThan(0);
  });

  it('throws when the budget cannot cover minimum payments', () => {
    expect(() => planAvalanche(debts, 100)).toThrow(/minimum payments/i);
  });

  it('returns an empty schedule when there are no debts', () => {
    const plan = planSnowball([], 500);
    expect(plan.schedule).toEqual([]);
    expect(plan.months).toBe(0);
  });
});
