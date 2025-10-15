import { describe, it, expect } from 'vitest';
import { planAvalanche, planSnowball } from './strategy.js';

describe('strategy planning', () => {
  it('prioritises高利率債務 in avalanche strategy', () => {
    const debts = [
      { name: '卡費', balance: 2000, interest_rate: 18, min_payment: 200 },
      { name: '學貸', balance: 5000, interest_rate: 2, min_payment: 200 },
    ];

    const result = planAvalanche(debts, 1000);
    const firstMonth = result.schedule[0];
    const cardPayment = firstMonth.items.find((item) => item.name === '卡費');

    expect(result.schedule.length).toBeGreaterThan(0);
    expect(cardPayment.pay).toBeGreaterThan(400); // 200 min + 600 extra
  });

  it('prioritises餘額較小債務 in snowball strategy', () => {
    const debts = [
      { name: '貸款A', balance: 4000, interest_rate: 4, min_payment: 200 },
      { name: '貸款B', balance: 800, interest_rate: 1, min_payment: 80 },
    ];

    const result = planSnowball(debts, 800);
    const firstMonth = result.schedule[0];
    const loanBPayment = firstMonth.items.find((item) => item.name === '貸款B');

    expect(loanBPayment.pay).toBeGreaterThan(200); // 80 min + 額外預算
  });

  it('returns error when budget is below minimum payments', () => {
    const debts = [
      { name: '卡費', balance: 2000, interest_rate: 18, min_payment: 300 },
      { name: '學貸', balance: 5000, interest_rate: 2, min_payment: 300 },
    ];

    const result = planAvalanche(debts, 400);
    expect(result.error).toBeDefined();
  });
});
