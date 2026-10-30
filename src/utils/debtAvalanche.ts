import { IncomeEntry, EssentialBill, LoanRecord } from '../types.ts';
import { roundToTwoDecimals, sanitizeCurrency } from './numberSanitizer.ts';

export interface SafetyBufferConfig {
  mode: 'percentage' | 'fixed';
  percentage: number; // e.g. 25 (%)
  fixedAmount: number; // e.g. 3000 (AED)
}

export interface PacingCapConfig {
  enabled: boolean;
  maxPerLoanAmount: number;
}

export interface DebtAvalancheOptions {
  bufferConfig?: SafetyBufferConfig;
  pacingCapConfig?: PacingCapConfig;
  excludedLoanIds?: string[]; // IDs of loans simulated closed or paused (What-If simulation)
  incomeRollover?: number; // Unspent cash carried over from previous month
  useManualPriority?: boolean; // When true, respects priorityRank strictly before interest rate
}

export interface LoanAllocationStep {
  loanId: string;
  lender: string;
  purpose: string;
  ratePct: number;
  principal: number;
  leftToPay: number;
  isOpenEnded: boolean;
  interestDurationMonths: number;
  monthlyInterestAmount: number; // Principal * Rate / 100
  monthlyTarget: number; // For open-ended: dynamic monthly interest; for fixed: planned monthly installment
  minRequiredAllocation: number;
  avalancheExtraAllocation: number;
  totalSuggestedAllocation: number;
  projectedRemainingDebt: number;
  willBeSettled: boolean;
  priorityRank: number; // 1 = highest priority rank
  status: 'Active' | 'Settled' | 'Overdue';
  isSimulatedExcluded: boolean; // True if user toggled this loan off in What-If simulation
  monthsToPayoff: number; // Calculated exact months to zero out balance based on current allocation
  monthlyInstallmentAmount: number; // Principal + Interest / calculated months
}

export interface RepaymentPlanCalculation {
  monthYear: string;
  totalIncome: number;
  incomeRollover: number; // Cash carried from previous month
  totalInflow: number; // totalIncome + incomeRollover
  totalEssentials: number;
  baseEssentialsAmount: number;
  arrearsAmount: number;
  baseNetCash: number; // totalInflow - totalEssentials (before safety buffer)
  livingBufferAmount: number; // Living Safety Buffer reserved for food and survival
  livingBufferConfig: SafetyBufferConfig;
  netFund: number; // (totalInflow - Essentials) - Living Buffer (exact amount available for debt clearing)
  totalActiveDebt: number; // Sum of leftToPay across included active loans
  baselineTotalDebt: number; // Total active debt before any simulation exclusions
  simulatedDebtReduction: number; // Total balance eliminated in simulation
  simulatedMonthlyInterestSaved: number; // Monthly interest charges avoided by simulated closures
  simulatedMonthlyCashFreed: number; // Minimum monthly payment obligations freed up
  totalMinDebtObligation: number; // Sum of minimum monthly targets
  totalSuggestedDebtPayment: number; // Sum of allocated debt payoff this month
  unallocatedCash: number; // Remaining surplus after all active debts are paid
  netCashFlow: number; // Real-time Net Cash Flow: totalInflow - committed essentials - totalSuggestedDebtPayment - livingBuffer
  isDeficit: boolean; // True if totalEssentials > totalInflow
  allocations: LoanAllocationStep[];
  activeLoansCount: number;
  simulatedExcludedCount: number;
  incomeSourcesCount: number;
  essentialsCount: number;
  maxMonthsToDebtFree: number; // Longest timeline among active loans
  estimatedDebtFreeDate: string; // Projected month-year when all active loans reach AED 0.00
}

export const DEFAULT_SAFETY_BUFFER: SafetyBufferConfig = {
  mode: 'percentage',
  percentage: 25, // Default to reserving 25% of net cash for food & daily living
  fixedAmount: 2500,
};

export const DEFAULT_PACING_CAP: PacingCapConfig = {
  enabled: false,
  maxPerLoanAmount: 3000,
};

/**
 * Calculates Net Disposable Cash and executes Priority-Driven Debt Repayment
 * (Manual Priority 1-5 waterfall, followed by highest interest rate).
 * Dynamically computes payoff timelines for each loan and real-time Net Cash Flow.
 */
export function calculateDebtAvalanche(
  incomes: IncomeEntry[],
  essentials: EssentialBill[],
  loans: LoanRecord[],
  currentMonth: string,
  options?: DebtAvalancheOptions
): RepaymentPlanCalculation {
  const bufferConfig = options?.bufferConfig || DEFAULT_SAFETY_BUFFER;
  const excludedLoanIds = new Set(options?.excludedLoanIds || []);
  const incomeRollover = roundToTwoDecimals(sanitizeCurrency(options?.incomeRollover || 0));

  // 1. Calculate Total Monthly Income from Income Log
  let monthIncomes = incomes.filter((i) => i.monthYear === currentMonth);
  if (monthIncomes.length === 0 && incomes.length > 0) {
    const recurring = incomes.filter((i) => i.isRecurring);
    monthIncomes = recurring.length > 0 ? recurring : incomes;
  }

  const totalIncome = roundToTwoDecimals(
    monthIncomes.reduce((acc, i) => acc + sanitizeCurrency(i.actualAmount || i.plannedAmount), 0)
  );
  const totalInflow = roundToTwoDecimals(totalIncome + incomeRollover);

  // 2. Calculate Total Active Monthly Costs from Essentials & Arrears
  let monthEssentials = essentials.filter((e) => e.monthYear === currentMonth);
  if (monthEssentials.length === 0 && essentials.length > 0) {
    const recurring = essentials.filter((e) => e.isRecurring);
    monthEssentials = recurring.length > 0 ? recurring : essentials;
  }

  const baseEssentialsAmount = roundToTwoDecimals(
    monthEssentials.reduce((acc, e) => acc + sanitizeCurrency(e.amount), 0)
  );

  const arrearsAmount = roundToTwoDecimals(
    monthEssentials.reduce((acc, e) => {
      if (e.hasArrears) {
        const remaining = Math.max(0, sanitizeCurrency(e.arrearsAmount) - sanitizeCurrency(e.arrearsPaidSoFar));
        return acc + remaining;
      }
      return acc;
    }, 0)
  );

  const totalEssentials = roundToTwoDecimals(baseEssentialsAmount + arrearsAmount);

  // 3. Calculate Base Net Cash & Living Safety Buffer
  const baseNetCash = roundToTwoDecimals(totalInflow - totalEssentials);
  const isDeficit = baseNetCash < 0;

  let livingBufferAmount = 0;
  if (baseNetCash > 0) {
    if (bufferConfig.mode === 'percentage') {
      const pct = Math.max(0, Math.min(100, bufferConfig.percentage));
      livingBufferAmount = roundToTwoDecimals(baseNetCash * (pct / 100));
    } else {
      const fixed = Math.max(0, bufferConfig.fixedAmount);
      livingBufferAmount = roundToTwoDecimals(Math.min(baseNetCash, fixed));
    }
  }

  // Net Clearing Fund available strictly for debt clearing: (Total Inflow - Essentials) - Living Buffer
  const netFund = roundToTwoDecimals(Math.max(0, baseNetCash - livingBufferAmount));
  let availableFund = netFund;

  // 4. Identify All Active Loans and partition included vs What-If excluded
  const allActiveLoans = loans.filter((l) => l.status !== 'Settled' && sanitizeCurrency(l.leftToPay) > 0);
  const baselineTotalDebt = roundToTwoDecimals(
    allActiveLoans.reduce((sum, l) => sum + sanitizeCurrency(l.leftToPay), 0)
  );

  // Sort loans strictly by manual Priority Rank (1 to 5, ascending), then by interest rate descending (avalanche)
  const sortedLoans = [...allActiveLoans].sort((a, b) => {
    const priorityA = a.priorityRank !== undefined && a.priorityRank > 0 ? a.priorityRank : 99;
    const priorityB = b.priorityRank !== undefined && b.priorityRank > 0 ? b.priorityRank : 99;

    if (priorityA !== priorityB) {
      return priorityA - priorityB; // 1 before 2 before 3
    }

    const rateA = sanitizeCurrency(a.monthlyInterestRatePct);
    const rateB = sanitizeCurrency(b.monthlyInterestRatePct);
    if (rateB !== rateA) {
      return rateB - rateA; // Descending: 10% before 7.5% before 6%
    }
    return sanitizeCurrency(b.leftToPay) - sanitizeCurrency(a.leftToPay);
  });

  // Calculate What-If Simulation metrics for excluded loans
  let simulatedDebtReduction = 0;
  let simulatedMonthlyInterestSaved = 0;
  let simulatedMonthlyCashFreed = 0;
  let simulatedExcludedCount = 0;

  sortedLoans.forEach((loan) => {
    if (excludedLoanIds.has(loan.id)) {
      simulatedExcludedCount += 1;
      const left = sanitizeCurrency(loan.leftToPay);
      const principal = sanitizeCurrency(loan.principal);
      const rate = sanitizeCurrency(loan.monthlyInterestRatePct);
      const monthlyInt = roundToTwoDecimals(principal * (rate / 100));
      const duration = loan.interestDurationMonths;
      const isOpenEnded = !duration || duration <= 0 || duration === null;

      let minObligation = 0;
      if (isOpenEnded) {
        minObligation = monthlyInt > 0 ? monthlyInt : left;
      } else {
        const planned = sanitizeCurrency(loan.plannedPaymentThisMonth);
        const computed = roundToTwoDecimals(sanitizeCurrency(loan.totalToRepay) / duration);
        minObligation = planned > 0 ? planned : computed;
      }

      simulatedDebtReduction += left;
      simulatedMonthlyInterestSaved += monthlyInt;
      simulatedMonthlyCashFreed += Math.min(left, minObligation);
    }
  });

  simulatedDebtReduction = roundToTwoDecimals(simulatedDebtReduction);
  simulatedMonthlyInterestSaved = roundToTwoDecimals(simulatedMonthlyInterestSaved);
  simulatedMonthlyCashFreed = roundToTwoDecimals(simulatedMonthlyCashFreed);

  // Active loans that remain included in calculation
  const includedLoans = sortedLoans.filter((l) => !excludedLoanIds.has(l.id));
  const totalActiveDebt = roundToTwoDecimals(
    includedLoans.reduce((sum, l) => sum + sanitizeCurrency(l.leftToPay), 0)
  );

  // 5. Pre-calculate targets for included loans
  interface PreliminaryAllocation {
    loan: LoanRecord;
    isOpenEnded: boolean;
    monthlyInterest: number;
    monthlyTarget: number;
    minAllocation: number;
    extraAllocation: number;
  }

  const prelims: PreliminaryAllocation[] = includedLoans.map((loan) => {
    const principal = sanitizeCurrency(loan.principal);
    const rate = sanitizeCurrency(loan.monthlyInterestRatePct);
    const leftToPay = sanitizeCurrency(loan.leftToPay);
    const duration = loan.interestDurationMonths;
    const isOpenEnded = !duration || duration <= 0 || duration === null;
    const monthlyInterest = roundToTwoDecimals(principal * (rate / 100));

    let monthlyTarget = 0;
    if (isOpenEnded) {
      monthlyTarget = Math.min(leftToPay, monthlyInterest > 0 ? monthlyInterest : leftToPay);
    } else {
      const planned = sanitizeCurrency(loan.plannedPaymentThisMonth);
      const computed = roundToTwoDecimals(sanitizeCurrency(loan.totalToRepay) / duration);
      monthlyTarget = Math.min(leftToPay, planned > 0 ? planned : computed);
    }

    return {
      loan,
      isOpenEnded,
      monthlyInterest,
      monthlyTarget,
      minAllocation: 0,
      extraAllocation: 0,
    };
  });

  const totalMinDebtObligation = roundToTwoDecimals(
    prelims.reduce((sum, p) => sum + p.monthlyTarget, 0)
  );

  // 6. Waterfall Distribution: strictly follows Priority Rank (1 to 5) then interest rate
  if (availableFund > 0) {
    if (availableFund <= totalMinDebtObligation) {
      // Fund is limited: allocate minimum targets in strict priority order
      for (const p of prelims) {
        if (availableFund <= 0) break;
        const alloc = Math.min(availableFund, p.monthlyTarget);
        p.minAllocation = roundToTwoDecimals(alloc);
        availableFund = roundToTwoDecimals(availableFund - alloc);
      }
    } else {
      // Step A: Cover all baseline minimum targets
      for (const p of prelims) {
        p.minAllocation = p.monthlyTarget;
        availableFund = roundToTwoDecimals(availableFund - p.monthlyTarget);
      }

      // Step B: Waterfall surplus cash starting from Priority 1 to eliminate balances quickly
      for (const p of prelims) {
        if (availableFund <= 0) break;
        const leftToPay = sanitizeCurrency(p.loan.leftToPay);
        const maxExtra = roundToTwoDecimals(Math.max(0, leftToPay - p.minAllocation));
        if (maxExtra > 0) {
          const extra = Math.min(availableFund, maxExtra);
          p.extraAllocation = roundToTwoDecimals(extra);
          availableFund = roundToTwoDecimals(availableFund - extra);
        }
      }
    }
  }

  // 7. Assemble final steps with exact payoff timelines and installment amounts
  let totalSuggestedDebtPayment = 0;
  let maxMonthsToDebtFree = 1;

  const allocations: LoanAllocationStep[] = sortedLoans.map((loan, idx) => {
    const isExcluded = excludedLoanIds.has(loan.id);
    const principal = sanitizeCurrency(loan.principal);
    const rate = sanitizeCurrency(loan.monthlyInterestRatePct);
    const leftToPay = sanitizeCurrency(loan.leftToPay);
    const duration = loan.interestDurationMonths;
    const isOpenEnded = !duration || duration <= 0 || duration === null;
    const monthlyInterest = roundToTwoDecimals(principal * (rate / 100));
    const userPriority = loan.priorityRank !== undefined && loan.priorityRank > 0 ? loan.priorityRank : idx + 1;

    if (isExcluded) {
      let monthlyTarget = 0;
      if (isOpenEnded) {
        monthlyTarget = Math.min(leftToPay, monthlyInterest > 0 ? monthlyInterest : leftToPay);
      } else {
        const planned = sanitizeCurrency(loan.plannedPaymentThisMonth);
        const computed = roundToTwoDecimals(sanitizeCurrency(loan.totalToRepay) / (duration || 1));
        monthlyTarget = Math.min(leftToPay, planned > 0 ? planned : computed);
      }

      return {
        loanId: loan.id,
        lender: loan.lender,
        purpose: loan.purpose,
        ratePct: rate,
        principal,
        leftToPay,
        isOpenEnded,
        interestDurationMonths: duration || 0,
        monthlyInterestAmount: monthlyInterest,
        monthlyTarget,
        minRequiredAllocation: 0,
        avalancheExtraAllocation: 0,
        totalSuggestedAllocation: 0,
        projectedRemainingDebt: leftToPay,
        willBeSettled: false,
        priorityRank: userPriority,
        status: loan.status,
        isSimulatedExcluded: true,
        monthsToPayoff: 0,
        monthlyInstallmentAmount: monthlyTarget,
      };
    }

    const p = prelims.find((item) => item.loan.id === loan.id)!;
    const totalAlloc = roundToTwoDecimals(p.minAllocation + p.extraAllocation);
    totalSuggestedDebtPayment += totalAlloc;
    const projectedRemaining = roundToTwoDecimals(Math.max(0, leftToPay - totalAlloc));

    // Dynamic Payoff Timeline: exact months needed at this payment rate
    let calculatedMonths = 1;
    if (totalAlloc > 0) {
      calculatedMonths = Math.max(1, Math.ceil(leftToPay / totalAlloc));
    } else {
      calculatedMonths = duration > 0 ? duration : 12;
    }

    if (calculatedMonths > maxMonthsToDebtFree) {
      maxMonthsToDebtFree = calculatedMonths;
    }

    // Computed monthly installment: (Principal + Total Interest) / calculatedMonths
    const totalLoanCost = sanitizeCurrency(loan.totalToRepay) || principal + monthlyInterest * calculatedMonths;
    const installmentPerMonth = roundToTwoDecimals(totalLoanCost / (calculatedMonths || 1));

    return {
      loanId: loan.id,
      lender: loan.lender,
      purpose: loan.purpose,
      ratePct: rate,
      principal,
      leftToPay,
      isOpenEnded: p.isOpenEnded,
      interestDurationMonths: duration || 0,
      monthlyInterestAmount: p.monthlyInterest,
      monthlyTarget: p.monthlyTarget,
      minRequiredAllocation: p.minAllocation,
      avalancheExtraAllocation: p.extraAllocation,
      totalSuggestedAllocation: totalAlloc,
      projectedRemainingDebt: projectedRemaining,
      willBeSettled: projectedRemaining <= 0,
      priorityRank: userPriority,
      status: loan.status,
      isSimulatedExcluded: false,
      monthsToPayoff: calculatedMonths,
      monthlyInstallmentAmount: installmentPerMonth,
    };
  });

  totalSuggestedDebtPayment = roundToTwoDecimals(totalSuggestedDebtPayment);
  const unallocatedCash = roundToTwoDecimals(availableFund);

  // Real-time Net Cash Flow: totalInflow - committed essentials - total suggested debt payment - living buffer
  const netCashFlow = roundToTwoDecimals(totalInflow - totalEssentials - totalSuggestedDebtPayment - livingBufferAmount);

  // Compute estimated Debt-Free Date based on maxMonthsToDebtFree
  const startParts = currentMonth.split('-');
  let debtFreeYear = parseInt(startParts[0]) || 2026;
  let debtFreeMonth = parseInt(startParts[1]) || 10;
  debtFreeMonth += maxMonthsToDebtFree;
  while (debtFreeMonth > 12) {
    debtFreeMonth -= 12;
    debtFreeYear += 1;
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const estimatedDebtFreeDate = `${monthNames[debtFreeMonth - 1]} ${debtFreeYear}`;

  return {
    monthYear: currentMonth,
    totalIncome,
    incomeRollover,
    totalInflow,
    totalEssentials,
    baseEssentialsAmount,
    arrearsAmount,
    baseNetCash,
    livingBufferAmount,
    livingBufferConfig: bufferConfig,
    netFund,
    totalActiveDebt,
    baselineTotalDebt,
    simulatedDebtReduction,
    simulatedMonthlyInterestSaved,
    simulatedMonthlyCashFreed,
    totalMinDebtObligation,
    totalSuggestedDebtPayment,
    unallocatedCash,
    netCashFlow,
    isDeficit,
    allocations,
    activeLoansCount: includedLoans.length,
    simulatedExcludedCount,
    incomeSourcesCount: monthIncomes.length,
    essentialsCount: monthEssentials.length,
    maxMonthsToDebtFree,
    estimatedDebtFreeDate,
  };
}
