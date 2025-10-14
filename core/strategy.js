const MAX_MONTHS = 600;

function cloneDebt(debt) {
  return {
    id: debt.id ?? null,
    name: debt.name ?? debt.id ?? 'Debt',
    balance: Number(debt.balance ?? 0),
    interestRate: Number(debt.interestRate ?? debt.rate ?? 0),
    minPayment: Number(debt.minPayment ?? debt.minimumPayment ?? 0),
  };
}

function roundToCents(value) {
  return Math.max(0, Math.round((value + Number.EPSILON) * 100) / 100);
}

function applyMonthlyInterest(balance, monthlyRate) {
  if (balance <= 0 || monthlyRate <= 0) {
    return { balance, interest: 0 };
  }
  const interest = roundToCents(balance * monthlyRate);
  return { balance: roundToCents(balance + interest), interest };
}

function ensureBudget(debts, monthlyBudget) {
  const totalMin = debts.reduce((sum, debt) => sum + Math.min(debt.minPayment, debt.balance), 0);
  if (roundToCents(totalMin) > roundToCents(monthlyBudget)) {
    throw new Error('Monthly budget cannot cover minimum payments.');
  }
}

function sortDebtsForStrategy(debts, strategy) {
  const sorted = [...debts].sort((a, b) => {
    if (strategy === 'avalanche') {
      if (b.interestRate !== a.interestRate) {
        return b.interestRate - a.interestRate;
      }
    } else if (strategy === 'snowball') {
      if (a.balance !== b.balance) {
        return a.balance - b.balance;
      }
    }
    return a.balance - b.balance;
  });
  return sorted;
}

function buildPlan(debtsInput, monthlyBudget, strategy) {
  if (!Array.isArray(debtsInput)) {
    throw new Error('Debts must be an array.');
  }
  if (typeof monthlyBudget !== 'number' || Number.isNaN(monthlyBudget) || monthlyBudget <= 0) {
    throw new Error('Monthly budget must be a positive number.');
  }

  const debts = debtsInput
    .map(cloneDebt)
    .filter((debt) => debt.balance > 0);

  if (!debts.length) {
    return {
      strategy,
      monthlyBudget: roundToCents(monthlyBudget),
      schedule: [],
      totalInterestPaid: 0,
      months: 0,
    };
  }

  ensureBudget(debts, monthlyBudget);

  let month = 0;
  let totalInterestPaid = 0;
  const schedule = [];

  while (debts.some((debt) => debt.balance > 0)) {
    month += 1;
    if (month > MAX_MONTHS) {
      throw new Error('Exceeded maximum repayment timeline.');
    }

    const monthRecord = {
      month,
      payments: [],
      totalPayment: 0,
      totalInterest: 0,
    };

    // Apply monthly interest
    for (const debt of debts) {
      if (debt.balance <= 0) {
        continue;
      }
      const monthlyRate = debt.interestRate > 1 ? debt.interestRate / 100 / 12 : debt.interestRate / 12;
      const { balance: newBalance, interest } = applyMonthlyInterest(debt.balance, monthlyRate);
      debt.balance = newBalance;
      if (interest > 0) {
        totalInterestPaid += interest;
        monthRecord.totalInterest = roundToCents(monthRecord.totalInterest + interest);
      }
    }

    let remainingBudget = monthlyBudget;

    // Pay minimums first
    for (const debt of debts) {
      if (debt.balance <= 0) {
        continue;
      }
      const payment = roundToCents(Math.min(debt.minPayment, debt.balance, remainingBudget));
      debt.balance = roundToCents(debt.balance - payment);
      remainingBudget = roundToCents(remainingBudget - payment);
      monthRecord.payments.push({
        id: debt.id,
        name: debt.name,
        payment,
        remainingBalance: debt.balance,
      });
      monthRecord.totalPayment = roundToCents(monthRecord.totalPayment + payment);
    }

    ensureBudget(debts, monthRecord.totalPayment + remainingBudget);

    // Distribute extra funds according to strategy
    const order = sortDebtsForStrategy(debts.filter((debt) => debt.balance > 0), strategy);

    for (const debt of order) {
      if (remainingBudget <= 0) {
        break;
      }
      const extra = roundToCents(Math.min(remainingBudget, debt.balance));
      if (extra <= 0) {
        continue;
      }

      debt.balance = roundToCents(debt.balance - extra);
      remainingBudget = roundToCents(remainingBudget - extra);

      const existing = monthRecord.payments.find((p) => p.id === debt.id && p.name === debt.name);
      if (existing) {
        existing.payment = roundToCents(existing.payment + extra);
        existing.remainingBalance = debt.balance;
      } else {
        monthRecord.payments.push({
          id: debt.id,
          name: debt.name,
          payment: extra,
          remainingBalance: debt.balance,
        });
      }
      monthRecord.totalPayment = roundToCents(monthRecord.totalPayment + extra);
    }

    if (remainingBudget > 0.01 && debts.every((debt) => debt.balance <= 0)) {
      // All debts cleared but still leftover budget.
      monthRecord.remainingBudget = roundToCents(remainingBudget);
    }

    // Clean any floating negatives
    for (const debt of debts) {
      if (debt.balance < 0.005) {
        debt.balance = 0;
      }
    }

    schedule.push(monthRecord);

    if (debts.every((debt) => debt.balance <= 0)) {
      break;
    }
  }

  return {
    strategy,
    monthlyBudget: roundToCents(monthlyBudget),
    schedule,
    totalInterestPaid: roundToCents(totalInterestPaid),
    months: month,
  };
}

function planAvalanche(debts, monthlyBudget) {
  return buildPlan(debts, monthlyBudget, 'avalanche');
}

function planSnowball(debts, monthlyBudget) {
  return buildPlan(debts, monthlyBudget, 'snowball');
}

module.exports = {
  planAvalanche,
  planSnowball,
};
