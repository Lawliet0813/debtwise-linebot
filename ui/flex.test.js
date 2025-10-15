import { describe, it, expect } from 'vitest';
import {
  buildDebtListBubbles,
  buildEmptyListBubble,
  buildFlexMessage,
  buildPlanBubble,
  clip,
} from './flex.js';

describe('flex message helpers', () => {
  it('clips long debt names', () => {
    const longName = '這是一個非常非常長的債務名稱超過十六個字';
    expect(clip(longName).endsWith('…')).toBe(true);
    expect(Array.from(clip(longName)).length).toBeLessThanOrEqual(16);
  });

  it('limits debt bubbles to十筆並附上溢位提示', () => {
    const debts = Array.from({ length: 12 }, (_, index) => ({
      name: `債務${index + 1}`,
      balance: 1000 + index * 100,
      interest_rate: 10,
      due_day: 10,
    }));

    const bubbles = buildDebtListBubbles(debts);
    expect(bubbles).toHaveLength(10);
    const overflowBubble = bubbles[bubbles.length - 1];
    expect(JSON.stringify(overflowBubble)).toContain('還有');
  });

  it('builds flex message with bubble or carousel', () => {
    const bubble = buildEmptyListBubble();
    const single = buildFlexMessage([bubble], '單一測試');
    expect(single.contents.type).toBe('bubble');

    const many = buildFlexMessage([bubble, bubble], '多張測試');
    expect(many.contents.type).toBe('carousel');
  });

  it('builds plan bubble with第一個月分配', () => {
    const bubble = buildPlanBubble({
      methodLabel: '雪球法',
      monthlyBudget: 20000,
      totalMonths: 12,
      totalInterest: 1500,
      firstMonth: {
        monthIndex: 1,
        items: [
          { name: '卡費', pay: 8000 },
          { name: '學貸', pay: 6000 },
          { name: '車貸', pay: 2000 },
          { name: '小額貸款', pay: 1000 },
          { name: '臨時借款', pay: 1000 },
        ],
      },
    });

    expect(JSON.stringify(bubble)).toContain('雪球法 還款計畫');
    expect(JSON.stringify(bubble)).toContain('第 1 個月');
    expect(JSON.stringify(bubble)).toContain('…還有其他債務');
  });
});
