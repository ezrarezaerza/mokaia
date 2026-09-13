import type { LocalDebt } from '../types';

export interface AmortizationMonth {
  month: number;
  dateStr: string;
  totalStartingBalance: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  totalEndingBalance: number;
  activeDebtsCount: number;
  conqueredThisMonth: string[];
}

export interface StrategySimulationResult {
  strategy: 'SNOWBALL' | 'AVALANCHE';
  extraMonthlyPayment: number;
  baseMonthlyTotal: number;
  totalMonthlyAllocated: number;
  monthsToDebtFree: number;
  targetDebtFreeDate: string;
  totalInterestPaid: number;
  totalInterestSavedVsMinimumOnly: number;
  monthsSavedVsMinimumOnly: number;
  repaymentSequence: Array<{
    debtId: string;
    name: string;
    debtType: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
    estimatedMonthPayoff: number;
    isCurrentTarget: boolean;
  }>;
  schedule: AmortizationMonth[];
}

/**
 * Calculates Snowball (lowest balance first) or Avalanche (highest interest first) payoff strategies.
 * Takes active debts and an optional monthly extra payment (e.g. +$50, +$100/mo).
 */
export function simulateDebtStrategy(
  debts: LocalDebt[],
  strategy: 'SNOWBALL' | 'AVALANCHE',
  extraMonthlyPayment: number = 50,
  locale: string = 'id-ID'
): StrategySimulationResult {
  // Only include active liabilities that require payment (exclude IOU_RECEIVABLE)
  const payableDebts = debts
    .filter((d) => d.status === 'ACTIVE' && d.debtType !== 'IOU_RECEIVABLE' && d.remainingBalance > 0)
    .map((d) => ({
      debtId: d.id,
      name: d.name,
      debtType: d.debtType,
      balance: d.remainingBalance,
      interestRate: d.interestRate || 0,
      minimumPayment: Math.max(10, d.minimumPayment || Math.min(d.remainingBalance, 25)),
    }));

  if (payableDebts.length === 0) {
    return {
      strategy,
      extraMonthlyPayment,
      baseMonthlyTotal: 0,
      totalMonthlyAllocated: 0,
      monthsToDebtFree: 0,
      targetDebtFreeDate: new Date().toISOString(),
      totalInterestPaid: 0,
      totalInterestSavedVsMinimumOnly: 0,
      monthsSavedVsMinimumOnly: 0,
      repaymentSequence: [],
      schedule: [],
    };
  }

  const baseMonthlyTotal = payableDebts.reduce((acc, d) => acc + d.minimumPayment, 0);
  const totalMonthlyAllocated = baseMonthlyTotal + Math.max(0, extraMonthlyPayment);

  // Strategy sorting
  const sortedDebts = [...payableDebts].sort((a, b) => {
    if (strategy === 'SNOWBALL') {
      // Smallest balance first for psychological velocity
      return a.balance - b.balance;
    } else {
      // Highest interest rate first for mathematical optimization
      if (b.interestRate !== a.interestRate) {
        return b.interestRate - a.interestRate;
      }
      return a.balance - b.balance;
    }
  });

  // 1. First run: Minimum-only baseline simulation to measure savings
  const baselineSim = runAmortizationLoop(
    sortedDebts.map((d) => ({ ...d })),
    0
  );

  // 2. Second run: Strategy with extra acceleration payment
  const acceleratedSim = runAmortizationLoop(
    sortedDebts.map((d) => ({ ...d })),
    extraMonthlyPayment
  );

  // Calculate target debt-free date
  const now = new Date();
  const freedomDate = new Date(now.getFullYear(), now.getMonth() + acceleratedSim.months, 1);
  const targetDebtFreeDate = freedomDate.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  const totalInterestSavedVsMinimumOnly = Math.max(
    0,
    Number((baselineSim.totalInterest - acceleratedSim.totalInterest).toFixed(2))
  );

  const monthsSavedVsMinimumOnly = Math.max(0, baselineSim.months - acceleratedSim.months);

  // Format sequence list
  const sequence = sortedDebts.map((item, idx) => {
    const payoffMonth = acceleratedSim.debtPayoffMonths[item.debtId] ?? acceleratedSim.months;
    return {
      debtId: item.debtId,
      name: item.name,
      debtType: item.debtType,
      balance: item.balance,
      interestRate: item.interestRate,
      minimumPayment: item.minimumPayment,
      estimatedMonthPayoff: payoffMonth,
      isCurrentTarget: idx === 0,
    };
  });

  return {
    strategy,
    extraMonthlyPayment,
    baseMonthlyTotal: Number(baseMonthlyTotal.toFixed(2)),
    totalMonthlyAllocated: Number(totalMonthlyAllocated.toFixed(2)),
    monthsToDebtFree: acceleratedSim.months,
    targetDebtFreeDate,
    totalInterestPaid: Number(acceleratedSim.totalInterest.toFixed(2)),
    totalInterestSavedVsMinimumOnly,
    monthsSavedVsMinimumOnly,
    repaymentSequence: sequence,
    schedule: acceleratedSim.schedule,
  };
}

/**
 * Inner loop simulating month-by-month debt reduction
 */
function runAmortizationLoop(
  debtsList: Array<{
    debtId: string;
    name: string;
    debtType: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
  }>,
  extraBudget: number
): {
  months: number;
  totalInterest: number;
  debtPayoffMonths: Record<string, number>;
  schedule: AmortizationMonth[];
} {
  let months = 0;
  let totalInterest = 0;
  const debtPayoffMonths: Record<string, number> = {};
  const schedule: AmortizationMonth[] = [];
  const maxMonths = 360; // 30-year safety ceiling

  let activeList = debtsList.map((d) => ({ ...d }));

  while (activeList.some((d) => d.balance > 0.01) && months < maxMonths) {
    months++;
    let monthInterest = 0;
    let monthPrincipal = 0;
    const conqueredThisMonth: string[] = [];
    const startingTotal = activeList.reduce((acc, d) => acc + d.balance, 0);

    // 1. Accrue monthly interest on each balance
    for (const debt of activeList) {
      if (debt.balance > 0.01) {
        const monthlyRate = (debt.interestRate / 100) / 12;
        const interestCharge = Number((debt.balance * monthlyRate).toFixed(2));
        debt.balance += interestCharge;
        monthInterest += interestCharge;
        totalInterest += interestCharge;
      }
    }

    // 2. Pay minimums first
    let availableExtra = extraBudget;
    for (const debt of activeList) {
      if (debt.balance > 0.01) {
        const minDue = Math.min(debt.balance, debt.minimumPayment);
        debt.balance -= minDue;
        monthPrincipal += minDue;

        if (debt.balance <= 0.01) {
          debt.balance = 0;
          if (!debtPayoffMonths[debt.debtId]) {
            debtPayoffMonths[debt.debtId] = months;
            conqueredThisMonth.push(debt.name);
          }
        }
      }
    }

    // 3. Channel rollover + extra money into highest priority active debt
    for (const targetDebt of activeList) {
      if (targetDebt.balance > 0.01 && availableExtra > 0) {
        const payExtra = Math.min(targetDebt.balance, availableExtra);
        targetDebt.balance -= payExtra;
        monthPrincipal += payExtra;
        availableExtra -= payExtra;

        if (targetDebt.balance <= 0.01) {
          targetDebt.balance = 0;
          if (!debtPayoffMonths[targetDebt.debtId]) {
            debtPayoffMonths[targetDebt.debtId] = months;
            conqueredThisMonth.push(targetDebt.name);
          }
        }
      }
    }

    const endingTotal = activeList.reduce((acc, d) => acc + d.balance, 0);

    schedule.push({
      month: months,
      dateStr: `Month ${months}`,
      totalStartingBalance: Number(startingTotal.toFixed(2)),
      totalInterestPaid: Number(monthInterest.toFixed(2)),
      totalPrincipalPaid: Number(monthPrincipal.toFixed(2)),
      totalEndingBalance: Number(endingTotal.toFixed(2)),
      activeDebtsCount: activeList.filter((d) => d.balance > 0.01).length,
      conqueredThisMonth,
    });
  }

  return {
    months,
    totalInterest,
    debtPayoffMonths,
    schedule,
  };
}
