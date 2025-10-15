import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.fn();
const planAvalancheMock = vi.fn();
const planSnowballMock = vi.fn();

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('./strategy.js', () => ({
  planAvalanche: planAvalancheMock,
  planSnowball: planSnowballMock,
}));

let handleList;
let handlePay;
let handlePlan;

beforeEach(async () => {
  fromMock.mockReset();
  planAvalancheMock.mockReset();
  planSnowballMock.mockReset();

  const module = await import('./handlers.js');
  handleList = module.handleList;
  handlePay = module.handlePay;
  handlePlan = module.handlePlan;
});

describe('handleList', () => {
  it('returns text and flex when debts exist', async () => {
    const debts = [
      {
        id: 'd1',
        name: '卡費',
        balance: 50000,
        interest_rate: 14.9,
        min_payment: 1500,
        due_day: 25,
      },
    ];

    fromMock.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'user-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'debts') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: debts, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'payments') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ debt_id: 'd1', amount: 10000 }],
                error: null,
              }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const result = await handleList('U123');

    expect(result.text).toContain('已還');
    expect(result.flexMessage).toBeDefined();
  });
});

describe('handlePay', () => {
  it('records payments via Supabase', async () => {
    fromMock.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'user-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'debts') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  { id: 'd1', name: '卡費' },
                ],
                error: null,
              }),
          }),
        };
      }

      if (table === 'payments') {
        return {
          insert: () => Promise.resolve({ error: null }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const message = await handlePay('U123', {
      debtName: '卡費',
      amount: 3200,
      date: '2024-10-01',
    });

    expect(message).toContain('✅ 已登記還款');
  });
});

describe('handlePlan', () => {
  it('returns提示 when沒有債務需要規劃', async () => {
    fromMock.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'user-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'debts') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const result = await handlePlan('U123', {
      monthlyBudget: 20000,
      method: 'avalanche',
    });

    expect(result.text).toContain('目前沒有債務紀錄');
  });
});
