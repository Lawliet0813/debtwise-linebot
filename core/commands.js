import { errorTexts } from '../ui/errors.js';

const SUPPORTED_COMMANDS = new Set(['add', 'list', 'pay', 'plan']);

const NUMBER_REGEXP = /^-?\d+(?:\.\d+)?$/;
const PERCENT_REGEXP = /^-?\d+(?:\.\d+)?%$/;
const DUE_DAY_REGEXP = /^(?:due|d)=(\d{1,2})$/i;
const MIN_PAYMENT_REGEXP = /^min=(\d+(?:\.\d+)?)$/i;
const DATE_REGEXP = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2})$/;

export function parseCommand(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return {
      type: 'invalid',
      error: errorTexts.emptyCommand(),
    };
  }

  const trimmed = text.trim();
  const [rawCommand, ...rawArgs] = trimmed.split(/\s+/);

  if (!rawCommand.startsWith('/')) {
    return {
      type: 'invalid',
      error: errorTexts.missingSlash(),
    };
  }

  const command = rawCommand.slice(1).toLowerCase();
  if (!SUPPORTED_COMMANDS.has(command)) {
    return {
      type: 'unknown',
      error: errorTexts.unsupportedCommand(rawCommand),
    };
  }

  switch (command) {
    case 'add':
      return parseAddCommand(rawArgs);
    case 'list':
      return parseListCommand(rawArgs);
    case 'pay':
      return parsePayCommand(rawArgs);
    case 'plan':
      return parsePlanCommand(rawArgs);
    default:
      return {
        type: 'unknown',
        error: '目前僅支援 /add、/list、/pay、/plan 指令。',
      };
  }
}

function parseAddCommand(args) {
  if (args.length < 4) {
    return {
      type: 'invalid',
      error: '格式錯誤：請輸入 /add 債務名稱 本金 利率% d=到期日 [min=最低繳款]。',
    };
  }

  const [nameRaw, balanceRaw, rateRaw, ...rest] = args;
  const name = nameRaw.trim();
  if (!name) {
    return {
      type: 'invalid',
      error: '債務名稱不可為空，請重新輸入。',
    };
  }

  if (!NUMBER_REGEXP.test(balanceRaw)) {
    return {
      type: 'invalid',
      error: '本金需為數字，例如 50000。',
    };
  }
  const balance = Number(balanceRaw);
  if (balance <= 0) {
    return {
      type: 'invalid',
      error: '本金需大於 0，請確認金額。',
    };
  }

  if (!PERCENT_REGEXP.test(rateRaw)) {
    return {
      type: 'invalid',
      error: '利率請以百分比表示，例如 14.9%。',
    };
  }
  const rate = Number(rateRaw.replace(/%$/, ''));
  if (rate < 0 || rate > 100) {
    return {
      type: 'invalid',
      error: '利率需介於 0% 到 100% 之間。',
    };
  }

  let dueDay;
  let minPayment;
  for (const token of rest) {
    if (DUE_DAY_REGEXP.test(token)) {
      const match = token.match(DUE_DAY_REGEXP);
      const parsed = Number(match[1]);
      if (parsed < 1 || parsed > 31) {
        return {
          type: 'invalid',
        error: '到期日需介於 1 到 31 之間。',
        };
      }
      dueDay = parsed;
      continue;
    }

    if (MIN_PAYMENT_REGEXP.test(token)) {
      const match = token.match(MIN_PAYMENT_REGEXP);
      const parsed = Number(match[1]);
      if (parsed < 0) {
        return {
          type: 'invalid',
        error: '最低繳款需為 0 或正數。',
        };
      }
      minPayment = parsed;
      continue;
    }

    return {
      type: 'invalid',
      error: `無法辨識的參數：${token}。可用參數：d=到期日、min=最低繳款。`,
    };
  }

  if (typeof dueDay !== 'number') {
    return {
      type: 'invalid',
      error: '請使用 d=<到期日> 指定每月到期日。',
    };
  }

  return {
    type: 'add',
    payload: {
      name,
      balance,
      rate,
      dueDay,
      minPayment,
    },
  };
}

function parseListCommand(args) {
  if (args.length > 0) {
    return {
      type: 'invalid',
      error: '/list 指令不需額外參數，直接輸入 /list 即可。',
    };
  }

  return { type: 'list' };
}

function parsePayCommand(args) {
  if (args.length < 2) {
    return {
      type: 'invalid',
      error: '格式錯誤：請輸入 /pay 債務名稱 金額 [日期] [備註]。',
    };
  }

  const [nameRaw, amountRaw, ...rest] = args;
  const debtName = nameRaw.trim();
  if (!debtName) {
    return {
      type: 'invalid',
      error: '請提供要繳款的債務名稱。',
    };
  }

  if (!NUMBER_REGEXP.test(amountRaw)) {
    return {
      type: 'invalid',
      error: '繳款金額需為數字，例如 3000。',
    };
  }
  const amount = Number(amountRaw);
  if (amount <= 0) {
    return {
      type: 'invalid',
      error: '繳款金額需大於 0。',
    };
  }

  let date;
  let note;
  if (rest.length > 0) {
    if (DATE_REGEXP.test(rest[0])) {
      date = rest.shift();
    }
    if (rest.length > 0) {
      note = rest.join(' ');
    }
  }

  return {
    type: 'pay',
    payload: {
      debtName,
      amount,
      date,
      note,
    },
  };
}

function parsePlanCommand(args) {
  if (args.length < 1) {
    return {
      type: 'invalid',
      error: '格式錯誤：請輸入 /plan 每月預算 [策略]，例如 /plan 20000 雪崩。',
    };
  }

  const [budgetRaw, ...methodTokens] = args;
  if (!NUMBER_REGEXP.test(budgetRaw)) {
    return {
      type: 'invalid',
      error: '每月預算需為數字，例如 20000。',
    };
  }
  const monthlyBudget = Number(budgetRaw);
  if (monthlyBudget <= 0) {
    return {
      type: 'invalid',
      error: '每月預算需大於 0。',
    };
  }

  const methodRaw = methodTokens.join(' ').trim();
  let method = 'avalanche';
  if (methodRaw) {
    const normalized = methodRaw.toLowerCase();
    if (['雪崩', '雪崩法', 'avalanche'].includes(normalized)) {
      method = 'avalanche';
    } else if (['雪球', '雪球法', 'snowball'].includes(normalized)) {
      method = 'snowball';
    } else {
      return {
        type: 'invalid',
        error: '策略僅支援「雪崩」或「雪球」，請重新輸入。',
      };
    }
  }

  return {
    type: 'plan',
    payload: {
      monthlyBudget,
      method,
    },
  };
}
