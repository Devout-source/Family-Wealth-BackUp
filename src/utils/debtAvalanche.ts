import { IncomeEntry, EssentialBill, LoanRecord } from '../types.ts';
import { roundToTwoDecimals, sanitizeCurrency } from './numberSanitizer.ts';

export interface SafetyBufferConfig {
  mode: 'percentage' | 'fixed';
  percentage: number; // e.g. 25 (%)
  fixedAmount: number; // e.g. 3000 (AED)
}

export interface PacingCapConfig {
  enabled: boolean;
  maxPerLoanAmount: number; // e.g. 3000 (AED per loan per month)
}

export interface DebtAvalancheOptions {
  bufferConfig?: SafetyBufferConfig;
  pacingCapConfig?: PacingCapConfig;
  excludedLoanIds?: string[]; // IDs of loans simulated closed or paused (What-If simulation)
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
  monthlyTarget: number; // For open-ended: dynamic monthly interest; for fixed: planned monthly instalment
  minRequiredAllocation: number;
  avalancheExtraAllocation: number;
  totalSuggestedAllocation: number;
  projectedRemainingDebt: number;
  willBeSettled: boolean;
  priorityRank: number; // 1 = highest interest rate
  status: 'Active' | 'Settled' | 'Overdue';
  isSimulatedExcluded: boolean; // True if user toggled this loan off in What-If simulation
  isPacingCapped: boolean; // True if allocation reached the monthly pacing limit
  appliedPacingCap?: number;
}

export interface RepaymentPlanCalculation {
  monthYear: string;
  totalIncome: number;
  totalEssentials: number;
  baseEssentialsAmount: number;
  arrearsAmount: number;
  baseNetCash: number; // Total Income - Total Essentials (before safety buffer)
  livingBufferAmount: number; // Living Safety Buffer reserved for food and survival
  livingBufferConfig: SafetyBufferConfig;
  netFund: number; // (Income - Essentials) - Living Buffer (exact amount available for debt clearing)
  totalActiveDebt: number; // Sum of leftToPay across included active loans
  baselineTotalDebt: number; // Total active debt before any simulation exclusions
  simulatedDebtReduction: number; // Total balance eliminated in simulation
  simulatedMonthlyInterestSaved: number; // Monthly interest charges avoided by simulated closures
  simulatedMonthlyCashFreed: number; // Minimum monthly payment obligations freed up
  totalMinDebtObligation: number; // Sum of minimum monthly targets
  totalSuggestedDebtPayment: number; // Sum of allocated debt payoff this month
  unallocatedCash: number; // Remaining surplus after all active debts are paid
  isDeficit: boolean; // True if totalEssentials > totalIncome
  allocations: LoanAllocationStep[];
  activeLoansCount: number;
  simulatedExcludedCount: number;
  incomeSourcesCount: number;
  essentialsCount: number;
  pacingCapConfig: PacingCapConfig;
}

export const DEFAULT_SAFETY_BUFFER: SafetyBufferConfig = {
  mode: 'percentage',
  percentage: 25, // Default to reserving 25% of net cash for food & daily living
  fixedAmount: 2500,
};

export const DEFAULT_PACING_CAP: PacingCapConfig = {
  enabled: false,
  maxPerLoanAmount: 3000, // Default 3,000 AED per loan cap when pacing is active
};

/**
 * Calculates the Net Disposable Cash with safety buffers and executes the Debt Avalanche
 * (highest interest rate first) payoff schedule across active family loans, supporting
 * sustainable pacing caps and interactive "What-If" simulation toggles.
 */
export function calculateDebtAvalanche(
  incomes: IncomeEntry[],
  essentials: EssentialBill[],
  loans: LoanRecord[],
  currentMonth: string,
  options?: DebtAvalancheOptions
): RepaymentPlanCalculation {
  const bufferConfig = options?.bufferConfig || DEFAULT_SAFETY_BUFFER;
  const pacingCapConfig = options?.pacingCapConfig || DEFAULT_PACING_CAP;
  const excludedLoanIds = new Set(options?.excludedLoanIds || []);

  // 1. Calculate Total Monthly Income from Income Log
  let monthIncomes = incomes.filter((i) => i.monthYear === currentMonth);
  if (monthIncomes.length === 0 && incomes.length > 0) {
    const recurring = incomes.filter((i) => i.isRecurring);
    monthIncomes = recurring.length > 0 ? recurring : incomes;
  }

  const totalIncome = roundToTwoDecimals(
    monthIncomes.reduce((acc, i) => acc + sanitizeCurrency(i.actualAmount || i.plannedAmount), 0)
  );

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
  const baseNetCash = roundToTwoDecimals(totalIncome - totalEssentials);
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

  // Net Clearing Fund available strictly for debt clearing: (Income - Essentials) - Living Buffer
  const netFund = roundToTwoDecimals(Math.max(0, baseNetCash - livingBufferAmount));
  let availableFund = netFund;

  // 4. Identify All Active Loans and partition included vs What-If excluded
  const allActiveLoans = loans.filter((l) => l.status !== 'Settled' && sanitizeCurrency(l.leftToPay) > 0);
  const baselineTotalDebt = roundToTwoDecimals(
    allActiveLoans.reduce((sum, l) => sum + sanitizeCurrency(l.leftToPay), 0)
  );

  // Sort loans by interest rate descending (Debt Avalanche)
  const sortedLoans = [...allActiveLoans].sort((a, b) => {
    const rateA = sanitizeCurrency(a.monthlyInterestRatePct);
    const rateB = sanitizeCurrency(b.monthlyInterestRatePct);
    if (rateB !== rateA) {
      return rateB - rateA; // Descending: 10% before 7.5% before 6% before 0%
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
    isCapped: boolean;
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
      isCapped: false,
    };
  });

  const totalMinDebtObligation = roundToTwoDecimals(
    prelims.reduce((sum, p) => sum + p.monthlyTarget, 0)
  );

  // 6. Execute Avalanche Distribution with Sustainable Pacing Caps
  if (availableFund > 0) {
    if (availableFund <= totalMinDebtObligation) {
      // Fund is limited: allocate minimum targets in order of priority (highest rate first)
      for (const p of prelims) {
        if (availableFund <= 0) break;
        const alloc = Math.min(availableFund, p.monthlyTarget);
        p.minAllocation = roundToTwoDecimals(alloc);
        availableFund = roundToTwoDecimals(availableFund - alloc);
      }
    } else {
      // Step A: Cover all minimum targets
      for (const p of prelims) {
        p.minAllocation = p.monthlyTarget;
        availableFund = roundToTwoDecimals(availableFund - p.monthlyTarget);
      }

      // Step B: Distribute surplus cash into highest interest loans, honoring monthly pacing cap
      const pacingCap = pacingCapConfig.enabled ? Math.max(100, pacingCapConfig.maxPerLoanAmount) : 0;

      for (const p of prelims) {
        if (availableFund <= 0) break;
        const leftToPay = sanitizeCurrency(p.loan.leftToPay);

        // Maximum extra that this loan can take
        let maxAllowableTotal = leftToPay;
        if (pacingCap > 0) {
          maxAllowableTotal = Math.min(leftToPay, Math.max(p.minAllocation, pacingCap));
        }

        const maxExtra = roundToTwoDecimals(Math.max(0, maxAllowableTotal - p.minAllocation));
        if (maxExtra > 0) {
          const extra = Math.min(availableFund, maxExtra);
          p.extraAllocation = roundToTwoDecimals(extra);
          availableFund = roundToTwoDecimals(availableFund - extra);

          if (pacingCap > 0 && p.minAllocation + p.extraAllocation >= pacingCap && p.minAllocation + p.extraAllocation < leftToPay) {
            p.isCapped = true;
          }
        } else if (pacingCap > 0 && p.minAllocation >= pacingCap) {
          p.isCapped = true;
        }
      }
    }
  }

  // 7. Assemble final steps (including simulated excluded loans with clean indicators)
  let totalSuggestedDebtPayment = 0;
  const allocations: LoanAllocationStep[] = sortedLoans.map((loan, idx) => {
    const isExcluded = excludedLoanIds.has(loan.id);
    const principal = sanitizeCurrency(loan.principal);
    const rate = sanitizeCurrency(loan.monthlyInterestRatePct);
    const leftToPay = sanitizeCurrency(loan.leftToPay);
    const duration = loan.interestDurationMonths;
    const isOpenEnded = !duration || duration <= 0 || duration === null;
    const monthlyInterest = roundToTwoDecimals(principal * (rate / 100));

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
        priorityRank: idx + 1,
        status: loan.status,
        isSimulatedExcluded: true,
        isPacingCapped: false,
      };
    }

    const p = prelims.find((item) => item.loan.id === loan.id)!;
    const totalAlloc = roundToTwoDecimals(p.minAllocation + p.extraAllocation);
    totalSuggestedDebtPayment += totalAlloc;
    const projectedRemaining = roundToTwoDecimals(Math.max(0, leftToPay - totalAlloc));

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
      priorityRank: idx + 1,
      status: loan.status,
      isSimulatedExcluded: false,
      isPacingCapped: p.isCapped,
      appliedPacingCap: pacingCapConfig.enabled ? pacingCapConfig.maxPerLoanAmount : undefined,
    };
  });

  totalSuggestedDebtPayment = roundToTwoDecimals(totalSuggestedDebtPayment);
  const unallocatedCash = roundToTwoDecimals(availableFund);

  return {
    monthYear: currentMonth,
    totalIncome,
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
    isDeficit,
    allocations,
    activeLoansCount: includedLoans.length,
    simulatedExcludedCount,
    incomeSourcesCount: monthIncomes.length,
    essentialsCount: monthEssentials.length,
    pacingCapConfig,
  };
}
