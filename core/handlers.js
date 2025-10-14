const debtsStore = new Map();
const paymentsStore = new Map();

function getUserDebts(userId) {
  if (!debtsStore.has(userId)) {
    debtsStore.set(userId, []);
  }
  return debtsStore.get(userId);
}

function getUserPayments(userId) {
  if (!paymentsStore.has(userId)) {
    paymentsStore.set(userId, []);
  }
  return paymentsStore.get(userId);
}

async function addDebt({ userId, name, balance, rate, dueDay, minPayment }) {
  if (!userId || typeof userId !== "string") {
    return {
      success: false,
      error: "系統錯誤：找不到使用者編號，請稍後再試。",
    };
  }

  if (!name || typeof name !== "string") {
    return {
      success: false,
      error: "請提供債務名稱，例如「卡費」或「學貸」。",
    };
  }

  if (typeof balance !== "number" || Number.isNaN(balance) || balance <= 0) {
    return {
      success: false,
      error: "本金需為正數，請確認輸入的金額。",
    };
  }

  if (typeof rate !== "number" || Number.isNaN(rate) || rate < 0 || rate > 100) {
    return {
      success: false,
      error: "利率需介於 0% 到 100% 之間。",
    };
  }

  if (typeof dueDay !== "undefined") {
    if (typeof dueDay !== "number" || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      return {
        success: false,
        error: "到期日需為 1 到 31 的整數。",
      };
    }
  }

  if (typeof minPayment !== "undefined") {
    if (typeof minPayment !== "number" || Number.isNaN(minPayment) || minPayment < 0) {
      return {
        success: false,
        error: "最低繳款需為 0 或正數。",
      };
    }
  }

  const debts = getUserDebts(userId);
  if (debts.some((debt) => debt.name.toLowerCase() === name.toLowerCase())) {
    return {
      success: false,
      error: `債務「${name}」已存在，如需更新請先刪除或更名。`,
    };
  }

  const newDebt = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name,
    balance,
    rate,
    dueDay: typeof dueDay === "number" ? dueDay : null,
    minPayment: typeof minPayment === "number" ? minPayment : null,
    createdAt: new Date().toISOString(),
  };

  debts.push(newDebt);

  return {
    success: true,
    debt: newDebt,
    message: `已新增債務「${name}」，記得準時繳款喔！`,
  };
}

async function listDebts({ userId }) {
  if (!userId || typeof userId !== "string") {
    return {
      success: false,
      error: "系統錯誤：找不到使用者編號，請稍後再試。",
    };
  }

  const debts = getUserDebts(userId);
  if (debts.length === 0) {
    return {
      success: true,
      debts: [],
      message: "目前沒有記錄的債務，輸入 /add 開始新增。",
    };
  }

  const totalBalance = debts.reduce((sum, debt) => sum + debt.balance, 0);

  return {
    success: true,
    debts,
    summary: {
      totalBalance,
      totalCount: debts.length,
    },
  };
}

async function addPayment({ userId, debtName, amount, date, note }) {
  if (!userId || typeof userId !== "string") {
    return {
      success: false,
      error: "系統錯誤：找不到使用者編號，請稍後再試。",
    };
  }

  if (!debtName || typeof debtName !== "string") {
    return {
      success: false,
      error: "請提供要繳款的債務名稱。",
    };
  }

  if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
    return {
      success: false,
      error: "繳款金額需為正數，請再確認。",
    };
  }

  let paymentDate = new Date();
  if (typeof date === "string" && date.trim()) {
    const parsed = parseInputDate(date.trim());
    if (!parsed) {
      return {
        success: false,
        error: "日期格式不正確，請使用 YYYY-MM-DD 或 MM/DD。",
      };
    }
    paymentDate = parsed;
  }

  const debts = getUserDebts(userId);
  const debt = debts.find((item) => item.name.toLowerCase() === debtName.toLowerCase());
  if (!debt) {
    return {
      success: false,
      error: `找不到債務「${debtName}」，請先使用 /add 新增。`,
    };
  }

  const payments = getUserPayments(userId);
  const paymentRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    debtId: debt.id,
    debtName: debt.name,
    amount,
    note: typeof note === "string" && note.trim() ? note.trim() : null,
    date: paymentDate.toISOString(),
    createdAt: new Date().toISOString(),
  };

  payments.push(paymentRecord);

  debt.balance = Math.max(0, debt.balance - amount);

  return {
    success: true,
    payment: paymentRecord,
    updatedDebt: debt,
    message: `已記錄「${debt.name}」的繳款 ${amount.toLocaleString()} 元。`,
  };
}

function parseInputDate(input) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const date = new Date(input);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
    return null;
  }

  const shortMatch = input.match(/^(\d{1,2})[\/.-](\d{1,2})$/);
  if (shortMatch) {
    const [, monthStr, dayStr] = shortMatch;
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    const currentYear = new Date().getFullYear();
    const iso = `${currentYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

module.exports = {
  addDebt,
  listDebts,
  addPayment,
};
