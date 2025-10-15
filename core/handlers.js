import { supabase } from '../lib/supabase.js';
import {
  buildDebtListBubbles,
  buildEmptyListBubble,
  buildFlexMessage,
  formatCurrency,
  formatRate,
} from '../ui/flex.js';

export async function handleAdd(lineUserId, payload) {
  if (!lineUserId) {
    return '無法取得使用者識別資訊，請稍後再試 🙏';
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
      return `「${payload.name}」已存在，請換個名稱或使用 /list 查詢。`;
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
      text: '無法取得使用者識別資訊，請稍後再試 🙏',
    };
  }

  const user = await findUser(lineUserId);
  if (!user) {
    const bubble = buildEmptyListBubble();
    return {
      text: '目前沒有債務紀錄，輸入 /add 開始新增吧！',
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
      text: '目前沒有債務紀錄，輸入 /add 開始新增吧！',
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
    return '無法取得使用者識別資訊，請稍後再試 🙏';
  }

  const user = await findUser(lineUserId);
  if (!user) {
    return '找不到債務資料，請先使用 /add 建立清單。';
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
    return `找不到債務「${debtName}」，請確認名稱是否正確。`;
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
