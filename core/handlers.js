import { supabase } from '../lib/supabase.js';
import {
  buildDebtListBubbles,
  buildEmptyListBubble,
  buildFlexMessage,
  buildPlanBubble,
  formatCurrency,
  formatRate,
} from '../ui/flex.js';
import { errorTexts } from '../ui/errors.js';
import { planAvalanche, planSnowball } from './strategy.js';

export async function handleAdd(lineUserId, payload) {
  if (!lineUserId) {
    return errorTexts.missingUser();
  }

  const user = await ensureUser(lineUserId);
  const row = {
    user_id: user.id,
    name: payload.name,
    balance: payload.balance,
    interest_rate: payload.rate,
    min_payment: payload.minPayment ?? 0,
    due_day: payload.dueDay,
  };

  const { error } = await supabase.from('debts').insert(row);
  if (error) {
    if (error.code === '23505') {
      return errorTexts.debtExists(payload.name);
    }
    throw error;
  }

  return [
    `✅ 已新增「${payload.name}」`,
    `餘額 $${formatCurrency(payload.balance)}，利率 ${formatRate(payload.rate)}%，到期日每月 ${payload.dueDay} 號。`,
  ].join('\n');
}

export async function handleList(lineUserId) {
  if (!lineUserId) {
    return {
      text: errorTexts.missingUser(),
    };
  }

  const user = await findUser(lineUserId);
  if (!user) {
    const bubble = buildEmptyListBubble();
    return {
      text: errorTexts.noDebts(),
      flexMessage: buildFlexMessage([bubble], '債務清單（空）'),
      debts: [],
    };
  }

  const { data: debts, error } = await supabase
    .from('debts')
    .select('id,name,balance,interest_rate,due_day,min_payment,created_at')
    .eq('user_id', user.id)
    .order('due_day', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  if (!debts || debts.length === 0) {
    const bubble = buildEmptyListBubble();
    return {
      text: errorTexts.noDebts(),
      flexMessage: buildFlexMessage([bubble], '債務清單（空）'),
      debts: [],
    };
  }

  const debtIds = debts.map((debt) => debt.id);
  const paymentSums = await fetchPaymentSums(debtIds);

  const enrichedDebts = debts.map((debt) => {
    const paidSum = paymentSums.get(debt.id) ?? 0;
    const remaining = Math.max(Number(debt.balance || 0) - paidSum, 0);

    return {
      ...debt,
      paidSum,
      remaining,
    };
  });

  const lines = enrichedDebts.map((debt) => {
    const remainingText = formatCurrency(debt.remaining);
    const rateText = formatRate(debt.interest_rate);
    const paidText = debt.paidSum > 0 ? `已還 ${formatCurrency(debt.paidSum)}｜` : '';
    const dueText = debt.due_day ?? '-';
    return `${debt.name}｜${paidText}餘額 ${remainingText}｜利率 ${rateText}%｜到期日 ${dueText}`;
  });

  const bubbles = buildDebtListBubbles(enrichedDebts);
  const flexMessage =
    bubbles.length > 0
      ? buildFlexMessage(bubbles, `債務清單（${enrichedDebts.length} 筆）`)
      : buildFlexMessage([buildEmptyListBubble()], '債務清單');

  return {
    text: lines.join('\n'),
    flexMessage,
    debts: enrichedDebts,
  };
}

export async function handlePay(lineUserId, payload) {
  if (!lineUserId) {
    return errorTexts.missingUser();
  }

  const user = await findUser(lineUserId);
  if (!user) {
    return errorTexts.noDebts();
  }

  const result = await addPayment({
    userId: user.id,
    debtName: payload.debtName,
    amount: payload.amount,
    date: payload.date,
    note: payload.note,
  });

  return result;
}

export async function handlePlan(lineUserId, payload) {
  if (!lineUserId) {
    return {
      text: errorTexts.missingUser(),
    };
  }

  const user = await findUser(lineUserId);
  if (!user) {
    return {
      text: errorTexts.noDebts(),
    };
  }

  const { data: debts, error } = await supabase
    .from('debts')
    .select('id,name,balance,interest_rate,min_payment,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  if (!debts || debts.length === 0) {
    return {
      text: errorTexts.noDebts(),
    };
  }

  const debtIds = debts.map((debt) => debt.id);
  const paymentSums = await fetchPaymentSums(debtIds);

  const planningDebts = debts
    .map((debt) => {
      const paidSum = paymentSums.get(debt.id) ?? 0;
      const remaining = Math.max(Number(debt.balance || 0) - paidSum, 0);
      return {
        ...debt,
        paidSum,
        remaining,
      };
    })
    .filter((debt) => debt.remaining > 0);

  if (planningDebts.length === 0) {
    return {
      text: errorTexts.allCleared(),
    };
  }

  const method = payload.method ?? 'avalanche';
  const monthlyBudget = payload.monthlyBudget;
  const planner = method === 'snowball' ? planSnowball : planAvalanche;

  const result = planner(planningDebts, monthlyBudget);
  if (result.error) {
    return {
      text: errorTexts.budgetTooLow(),
    };
  }

  const methodLabel = method === 'snowball' ? '雪球法' : '雪崩法';
  const totalMonths = result.payoffMonthIndex;
  const totalInterest = result.totalInterest;
  const totalPayment = result.schedule.reduce(
    (total, month) =>
      total +
      month.items.reduce((monthSum, item) => monthSum + Number(item.pay || 0), 0),
    0,
  );

  const flexBubble = buildPlanBubble({
    methodLabel,
    monthlyBudget,
    totalMonths,
    totalInterest,
    firstMonth: result.schedule[0],
  });
  const flexMessage = buildFlexMessage(
    [flexBubble],
    `${methodLabel} 還款計畫`,
  );

  const { error: planError } = await supabase.from('plans').insert({
    user_id: user.id,
    method,
    monthly_budget: monthlyBudget,
    generated_plan: {
      totalInterest,
      payoffMonths: totalMonths,
      schedule: result.schedule,
    },
  });

  if (planError) {
    throw planError;
  }

  const summary = [
    `📊 ${methodLabel} 規劃完成`,
    `預估 ${totalMonths} 個月還清，月預算 $${formatCurrency(monthlyBudget)}。`,
    `總利息約 $${formatCurrency(totalInterest)}，總支出約 $${formatCurrency(totalPayment)}。`,
  ];

  return {
    text: summary.join('\n'),
    flexMessage,
  };
}

async function ensureUser(lineUserId) {
  const existing = await findUser(lineUserId);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ line_user_id: lineUserId })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function findUser(lineUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data ?? null;
}

async function fetchPaymentSums(debtIds) {
  const sums = new Map();

  if (!Array.isArray(debtIds) || debtIds.length === 0) {
    return sums;
  }

  const { data, error } = await supabase
    .from('payments')
    .select('debt_id, amount')
    .in('debt_id', debtIds);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const current = sums.get(row.debt_id) ?? 0;
    sums.set(row.debt_id, current + Number(row.amount || 0));
  }

  return sums;
}

export async function addPayment({ userId, debtName, amount, date, note }) {
  const { data: debts, error } = await supabase
    .from('debts')
    .select('id,name')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  const normalizedName = (debtName ?? '').trim().toLowerCase();
  const debt =
    debts?.find((item) => item.name?.toLowerCase() === normalizedName) ?? null;

  if (!debt) {
    return errorTexts.debtNotFound(debtName);
  }

  const paymentDate = normalizeDateInput(date);
  const row = {
    debt_id: debt.id,
    amount,
    date: paymentDate,
    note: note?.trim() ? note.trim() : null,
  };

  const { error: insertError } = await supabase.from('payments').insert(row);
  if (insertError) {
    throw insertError;
  }

  return `✅ 已登記還款 $${formatCurrency(amount)}（${debt.name}，${paymentDate}）`;
}

function normalizeDateInput(input) {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const match = input.match(/^(\d{1,2})[\/.-](\d{1,2})$/);
  if (match) {
    const [, month, day] = match;
    const year = new Date().getFullYear();
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return new Date().toISOString().slice(0, 10);
}
