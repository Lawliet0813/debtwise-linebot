import { describe, it, expect, beforeAll } from 'vitest';

let parseCommand;

beforeAll(async () => {
  const module = await import('./commands.js');
  parseCommand = module.parseCommand;
});

describe('parseCommand', () => {
  it('parses /add with optional parameters', () => {
    const result = parseCommand('/add 卡費 50000 14.9% d=25 min=1500');

    expect(result).toEqual({
      type: 'add',
      payload: {
        name: '卡費',
        balance: 50000,
        rate: 14.9,
        dueDay: 25,
        minPayment: 1500,
      },
    });
  });

  it('requires due day argument for /add', () => {
    const result = parseCommand('/add 卡費 50000 14.9%');

    expect(result).toEqual({
      type: 'invalid',
      error: '格式錯誤：請輸入 /add 債務名稱 本金 利率% d=到期日 [min=最低繳款]。',
    });
  });

  it('rejects input without leading slash', () => {
    const result = parseCommand('add 卡費 50000 14.9%');

    expect(result).toEqual({
      type: 'invalid',
      error: '指令需以 / 開頭，請再試一次 🙏',
    });
  });

  it('flags unknown commands', () => {
    const result = parseCommand('/unknown');

    expect(result).toEqual({
      type: 'unknown',
      error: '不支援的指令：/unknown。輸入 /help 查看完整指令列表。',
    });
  });

  it('parses /pay with optional date and note', () => {
    const result = parseCommand('/pay 卡費 3500 2024-10-01 電費卡繳款');

    expect(result).toEqual({
      type: 'pay',
      payload: {
        debtName: '卡費',
        amount: 3500,
        date: '2024-10-01',
        note: '電費卡繳款',
      },
    });
  });

  it('normalizes plan strategy aliases', () => {
    const result = parseCommand('/plan 20000 雪球');

    expect(result).toEqual({
      type: 'plan',
      payload: {
        monthlyBudget: 20000,
        method: 'snowball',
      },
    });
  });

  it('defaults plan method to avalanche when missing', () => {
    const result = parseCommand('/plan 25000');

    expect(result).toEqual({
      type: 'plan',
      payload: {
        monthlyBudget: 25000,
        method: 'avalanche',
      },
    });
  });
});
