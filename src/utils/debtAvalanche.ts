import { IncomeEntry, EssentialBill, LoanRecord } from '../types.ts';
import { roundToTwoDecimals, sanitizeCurrency } from './numberSanitizer.ts';

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
}

export interface RepaymentPlanCalculation {
  monthYear: string;
  totalIncome: number;
  totalEssentials: number;
  baseEssentialsAmount: number;
  arrearsAmount: number;
  netFund: number; // Total Income - Total Essentials (exact cash for debt clearing)
  totalActiveDebt: number; // Sum of leftToPay across active loans
  totalMinDebtObligation: number; // Sum of minimum monthly targets
  totalSuggestedDebtPayment: number; // Sum of allocated debt payoff this month
  unallocatedCash: number; // Remaining surplus after all active debts are fully settled (or if netFund > totalDebt)
  isDeficit: boolean; // True if totalEssentials > totalIncome
  allocations: LoanAllocationStep[];
  activeLoansCount: number;
  incomeSourcesCount: number;
  essentialsCount: number;
}

/**
 * Calculates the Net Disposable Cash and executes the Debt Avalanche (highest interest rate first)
 * payoff schedule across active family loans.
 */
export function calculateDebtAvalanche(
  incomes: IncomeEntry[],
  essentials: EssentialBill[],
  loans: LoanRecord[],
  currentMonth: string
): RepaymentPlanCalculation {
  // 1. Calculate Total Monthly Income from Income Log
  // Filter for currentMonth; if none found for that specific month, fallback to recurring or all incomes
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

  // 3. Calculate Net Disposable Fund: Total Income - Total Essentials
  const netFund = roundToTwoDecimals(totalIncome - totalEssentials);
  const isDeficit = netFund < 0;
  let availableFund = Math.max(0, netFund);

  // 4. Identify Active Loans from Loans We Owe
  const activeLoans = loans.filter((l) => l.status !== 'Settled' && sanitizeCurrency(l.leftToPay) > 0);
  const totalActiveDebt = roundToTwoDecimals(
    activeLoans.reduce((sum, l) => sum + sanitizeCurrency(l.leftToPay), 0)
  );

  // 5. Debt Avalanche Sorting: Highest Interest Rate first, then highest balance
  const sortedLoans = [...activeLoans].sort((a, b) => {
    const rateA = sanitizeCurrency(a.monthlyInterestRatePct);
    const rateB = sanitizeCurrency(b.monthlyInterestRatePct);
    if (rateB !== rateA) {
      return rateB - rateA; // Descending: 10% before 7.5% before 6% before 0%
    }
    return sanitizeCurrency(b.leftToPay) - sanitizeCurrency(a.leftToPay);
  });

  // 6. Pre-calculate targets for each loan (handling open-ended / null duration dynamically)
  interface PreliminaryAllocation {
    loan: LoanRecord;
    isOpenEnded: boolean;
    monthlyInterest: number;
    monthlyTarget: number;
    minAllocation: number;
    extraAllocation: number;
  }

  const prelims: PreliminaryAllocation[] = sortedLoans.map((loan) => {
    const principal = sanitizeCurrency(loan.principal);
    const rate = sanitizeCurrency(loan.monthlyInterestRatePct);
    const leftToPay = sanitizeCurrency(loan.leftToPay);
    const duration = loan.interestDurationMonths;

    // Check for open-ended / null duration
    const isOpenEnded = !duration || duration <= 0 || duration === null;

    // Dynamic monthly interest: (Principal * Rate / 100)
    const monthlyInterest = roundToTwoDecimals(principal * (rate / 100));

    let monthlyTarget = 0;
    if (isOpenEnded) {
      // If open-ended / null duration: calculate monthly interest dynamically instead of forcing full principal
      monthlyTarget = Math.min(leftToPay, monthlyInterest > 0 ? monthlyInterest : leftToPay);
    } else {
      // Fixed duration: use planned payment this month or scheduled instalment (Principal + Interest) / duration
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

  // 7. Execute Avalanche Distribution
  if (availableFund > 0) {
    if (availableFund <= totalMinDebtObligation) {
      // Fund is limited: allocate in order of highest interest rate first
      for (const p of prelims) {
        if (availableFund <= 0) break;
        const alloc = Math.min(availableFund, p.monthlyTarget);
        p.minAllocation = roundToTwoDecimals(alloc);
        availableFund = roundToTwoDecimals(availableFund - alloc);
      }
    } else {
      // Fund covers all minimum targets
      for (const p of prelims) {
        p.minAllocation = p.monthlyTarget;
        availableFund = roundToTwoDecimals(availableFund - p.monthlyTarget);
      }

      // Distribute remaining surplus as Avalanche Extra to highest interest rate loans
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

  // 8. Build final allocation steps
  let totalSuggestedDebtPayment = 0;
  const allocations: LoanAllocationStep[] = prelims.map((p, idx) => {
    const totalAlloc = roundToTwoDecimals(p.minAllocation + p.extraAllocation);
    totalSuggestedDebtPayment += totalAlloc;
    const leftToPay = sanitizeCurrency(p.loan.leftToPay);
    const projectedRemaining = roundToTwoDecimals(Math.max(0, leftToPay - totalAlloc));

    return {
      loanId: p.loan.id,
      lender: p.loan.lender,
      purpose: p.loan.purpose,
      ratePct: sanitizeCurrency(p.loan.monthlyInterestRatePct),
      principal: sanitizeCurrency(p.loan.principal),
      leftToPay,
      isOpenEnded: p.isOpenEnded,
      interestDurationMonths: p.loan.interestDurationMonths || 0,
      monthlyInterestAmount: p.monthlyInterest,
      monthlyTarget: p.monthlyTarget,
      minRequiredAllocation: p.minAllocation,
      avalancheExtraAllocation: p.extraAllocation,
      totalSuggestedAllocation: totalAlloc,
      projectedRemainingDebt: projectedRemaining,
      willBeSettled: projectedRemaining <= 0,
      priorityRank: idx + 1,
      status: p.loan.status,
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
    netFund,
    totalActiveDebt,
    totalMinDebtObligation,
    totalSuggestedDebtPayment,
    unallocatedCash,
    isDeficit,
    allocations,
    activeLoansCount: activeLoans.length,
    incomeSourcesCount: monthIncomes.length,
    essentialsCount: monthEssentials.length,
  };
}
