const MAX_MONTHS = 600;
const EPSILON = 0.01;

export function planAvalanche(debts, monthlyBudget) {
  return simulatePlan(debts, monthlyBudget, (working) =>
    working
      .slice()
      .sort((a, b) => (b.rate || 0) - (a.rate || 0)),
  );
}

export function planSnowball(debts, monthlyBudget) {
  return simulatePlan(debts, monthlyBudget, (working) =>
    working
      .slice()
      .sort((a, b) => (a.balance || 0) - (b.balance || 0)),
  );
}

function simulatePlan(originalDebts, monthlyBudget, prioritizer) {
  if (!Array.isArray(originalDebts) || originalDebts.length === 0) {
    return {
      schedule: [],
      totalInterest: 0,
      payoffMonthIndex: 0,
    };
  }

  const working = originalDebts.map((debt) => ({
    name: debt.name ?? '未命名債務',
    balance: Number(
      typeof debt.remaining === 'number' ? debt.remaining : debt.balance ?? 0,
    ),
    rate: Number(debt.interest_rate ?? debt.rate ?? 0),
    minPayment: Number(debt.min_payment ?? debt.minPayment ?? 0),
  }));

  const schedule = [];
  let totalInterest = 0;

  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    if (isAllCleared(working)) {
      break;
    }

    let remainingBudget = monthlyBudget;
    const monthPayments = new Map();
    let monthInterest = 0;

    // accrue interest
    for (const debt of working) {
      if (debt.balance <= 0) {
        debt.balance = 0;
        continue;
      }
      const interest = debt.balance * (debt.rate / 1200);
      monthInterest += interest;
      debt.balance += interest;
    }
    totalInterest += monthInterest;

    // pay minimums
    let totalMinimum = 0;
    for (const debt of working) {
      if (debt.balance <= 0) {
        debt.balance = 0;
        continue;
      }

      const minimum = Math.max(0, Math.min(debt.balance, debt.minPayment));
      if (minimum > 0) {
        totalMinimum += minimum;
        debt.balance = Math.max(debt.balance - minimum, 0);
        monthPayments.set(
          debt.name,
          (monthPayments.get(debt.name) ?? 0) + minimum,
        );
        remainingBudget -= minimum;
      }
    }

    if (totalMinimum - monthlyBudget > EPSILON) {
      return {
        schedule,
        totalInterest: Number(totalInterest.toFixed(2)),
        payoffMonthIndex: month - 1,
        error: '月預算不足以支付所有債務的最低繳款額，請調整金額。',
      };
    }

    // allocate remaining to prioritized debts
    const targets = prioritizer(working).filter((debt) => debt.balance > 0);
    for (const debt of targets) {
      if (remainingBudget <= 0) {
        break;
      }

      const extra = Math.min(debt.balance, remainingBudget);
      if (extra <= 0) {
        continue;
      }

      debt.balance = Math.max(debt.balance - extra, 0);
      monthPayments.set(
        debt.name,
        (monthPayments.get(debt.name) ?? 0) + extra,
      );
      remainingBudget -= extra;
    }

    const remainingTotal = working.reduce(
      (sum, debt) => sum + Math.max(debt.balance, 0),
      0,
    );

    schedule.push({
      monthIndex: month,
      items: Array.from(monthPayments.entries()).map(([name, pay]) => ({
        name,
        pay: Number(pay.toFixed(2)),
      })),
      remainAfter: Number(remainingTotal.toFixed(2)),
    });

    if (remainingTotal <= EPSILON) {
      break;
    }
  }

  return {
    schedule,
    totalInterest: Number(totalInterest.toFixed(2)),
    payoffMonthIndex: schedule.length,
  };
}

function isAllCleared(debts) {
  return debts.every((debt) => Math.max(debt.balance, 0) <= EPSILON);
}
