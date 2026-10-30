import React, { useState } from 'react';
import {
  Wallet,
  Landmark,
  PiggyBank,
  HandCoins,
  Sparkles,
  Camera,
  ArrowUpRight,
  CheckCircle2,
  CalendarCheck,
  Coins,
  Trophy,
  PartyPopper,
  Calendar,
  X,
} from 'lucide-react';
import { FamilyVaultData } from '../types.ts';
import { ActiveTab } from './Sidebar.tsx';
import { sanitizeCurrency } from '../utils/numberSanitizer.ts';

interface DashboardViewProps {
  vault: FamilyVaultData;
  currentMonth: string;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenScanner: () => void;
  onDismissReminder?: (month: string) => void;
  onUpdateRollover?: (month: string, amount: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  vault,
  currentMonth,
  onNavigateTab,
  onOpenScanner,
  onDismissReminder,
  onUpdateRollover,
}) => {
  const [debtMode, setDebtMode] = useState<'loans' | 'combined'>('loans');
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [editRolloverAmount, setEditRolloverAmount] = useState<number>(0);

  // 1. Income Rollover Calculation (Item 5)
  const currentRollover = vault.incomeRollovers?.[currentMonth] !== undefined
    ? sanitizeCurrency(vault.incomeRollovers[currentMonth])
    : 0;

  // Current month incomes
  let monthlyIncomes = vault.incomes.filter((i) => i.monthYear === currentMonth);
  if (monthlyIncomes.length === 0 && vault.incomes.length > 0) {
    const recurring = vault.incomes.filter((i) => i.isRecurring);
    monthlyIncomes = recurring.length > 0 ? recurring : vault.incomes;
  }

  const baseIncomeMonth = monthlyIncomes.reduce(
    (acc, i) => acc + sanitizeCurrency(i.actualAmount || i.plannedAmount),
    0
  );
  // Total Inflow includes unspent rollover from previous month
  const totalIncomeMonth = baseIncomeMonth + currentRollover;

  // 2. Comprehensive Monthly Essentials & Arrears Fix (Item 8)
  let monthlyEssentialsList = vault.essentials.filter((e) => e.monthYear === currentMonth);
  if (monthlyEssentialsList.length === 0 && vault.essentials.length > 0) {
    const recurring = vault.essentials.filter((e) => e.isRecurring);
    monthlyEssentialsList = recurring.length > 0 ? recurring : vault.essentials;
  }

  const apartmentRent = monthlyEssentialsList
    .filter((e) => e.category === 'Housing')
    .reduce((acc, e) => acc + sanitizeCurrency(e.amount), 0);

  const utilityBills = monthlyEssentialsList
    .filter((e) => e.category === 'Utilities')
    .reduce((acc, e) => acc + sanitizeCurrency(e.amount), 0);

  const groceriesAmount = monthlyEssentialsList
    .filter((e) => e.category === 'Groceries')
    .reduce((acc, e) => acc + sanitizeCurrency(e.amount), 0);

  const telecomAndOthers = monthlyEssentialsList
    .filter((e) => e.category !== 'Housing' && e.category !== 'Utilities' && e.category !== 'Groceries')
    .reduce((acc, e) => acc + sanitizeCurrency(e.amount), 0);

  const arrearsBacklog = monthlyEssentialsList.reduce((acc, e) => {
    if (e.hasArrears) {
      const remaining = Math.max(0, sanitizeCurrency(e.arrearsAmount) - sanitizeCurrency(e.arrearsPaidSoFar));
      return acc + remaining;
    }
    return acc;
  }, 0);

  const totalMonthlyEssentials = apartmentRent + utilityBills + groceriesAmount + telecomAndOthers + arrearsBacklog;

  // 3. Outstanding Loans & Monthly Planned Obligations (Item 8)
  const totalDebtLoans = vault.loans.reduce((acc, l) => acc + sanitizeCurrency(l.leftToPay), 0);
  const totalCreditCards = vault.creditCards.reduce((acc, c) => acc + sanitizeCurrency(c.statementBalance), 0);
  const totalFamilyDebt = totalDebtLoans + totalCreditCards;

  const monthlyPlannedLoans = vault.loans
    .filter((l) => l.leftToPay > 0)
    .reduce((acc, l) => {
      const planned = sanitizeCurrency(l.plannedPaymentThisMonth);
      const computed = sanitizeCurrency(l.totalToRepay) / (l.interestDurationMonths || 1);
      return acc + (planned > 0 ? planned : computed);
    }, 0);

  const monthlyCCMinPayments = vault.creditCards.reduce((acc, c) => acc + sanitizeCurrency(c.minPayment), 0);
  const monthlyOtherSpending = vault.otherSpending
    .filter((o) => o.monthYear === currentMonth)
    .reduce((acc, o) => acc + sanitizeCurrency(o.amount), 0);

  // Total committed obligations without omissions (Item 8)
  const totalMandatoryObligations = totalMonthlyEssentials + monthlyPlannedLoans + monthlyCCMinPayments;
  const availableSurplus = Math.max(0, totalIncomeMonth - totalMandatoryObligations);

  // Capital Lent Out
  const totalMoneyLentOut = vault.moneyLent.reduce((acc, m) => acc + sanitizeCurrency(m.balanceRemaining), 0);

  // 4. Debt-Free Countdown & Milestone Calculations (Item 9)
  const lifetimeTotalRepay = vault.loans.reduce((acc, l) => acc + sanitizeCurrency(l.totalToRepay), 0);
  const lifetimePaidSoFar = vault.loans.reduce((acc, l) => acc + sanitizeCurrency(l.paidSoFar), 0);
  const overallDebtProgressPct = lifetimeTotalRepay > 0
    ? Math.min(100, Math.round((lifetimePaidSoFar / lifetimeTotalRepay) * 100))
    : 100;

  // Estimated Debt-Free Timeline (months)
  const monthsToDebtFree = monthlyPlannedLoans > 0
    ? Math.max(1, Math.ceil(totalDebtLoans / monthlyPlannedLoans))
    : 12;

  const startParts = currentMonth.split('-');
  let debtFreeYear = parseInt(startParts[0]) || 2026;
  let debtFreeMonth = parseInt(startParts[1]) || 10;
  debtFreeMonth += monthsToDebtFree;
  while (debtFreeMonth > 12) {
    debtFreeMonth -= 12;
    debtFreeYear += 1;
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const estimatedDebtFreeDate = `${monthNames[debtFreeMonth - 1]} ${debtFreeYear}`;

  // Settled Loans for Milestone Celebrations (Item 9)
  const settledLoans = vault.loans.filter((l) => l.leftToPay <= 0 || l.status === 'Settled');

  // Savings Goal
  const savingsGoal = vault.savingsGoals.find((g) => g.monthYear === currentMonth) || {
    targetAmount: 5000,
    goalTitle: 'Emergency Liquidity Fund',
  };
  const savingsProgressPct = Math.min(100, Math.round((availableSurplus / (savingsGoal.targetAmount || 1)) * 100));

  // Upcoming Bills & Loan Installments in current month
  const upcomingBills = monthlyEssentialsList
    .filter((e) => e.status === 'Pending')
    .map((e) => ({
      id: e.id,
      title: e.name,
      amount: e.amount,
      dueDate: e.dueDate,
      type: 'Essential Bill',
    }));

  const upcomingLoans = vault.loans
    .filter((l) => l.leftToPay > 0)
    .map((l) => ({
      id: l.id,
      title: `Loan Repayment: ${l.lender}`,
      amount: l.plannedPaymentThisMonth || Math.round(l.totalToRepay / (l.interestDurationMonths || 1)),
      dueDate: l.dueDateThisPayment,
      type: 'Loan Repayment',
    }));

  const allUpcoming = [...upcomingBills, ...upcomingLoans];

  // Spending Categories Breakdown (Item 8)
  const categoriesMap: Record<string, number> = {
    'Apartment Rent': apartmentRent,
    'DEWA & Utilities': utilityBills,
    'Loan Repayments': monthlyPlannedLoans,
    'Groceries & Pantry': groceriesAmount,
    'Arrears Backlog': arrearsBacklog,
    'Credit Cards Min': monthlyCCMinPayments,
    'Discretionary & Misc': monthlyOtherSpending,
  };

  const totalPlannedOutflows = Object.values(categoriesMap).reduce((a, b) => a + b, 0) || 1;

  // Monthly Review Reminder Dismissal Check (Item 6)
  const isReminderDismissed = vault.dismissedReminders?.includes(currentMonth);

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
      {/* Monthly Reset & Review Reminder Banner (Item 6) */}
      {!isReminderDismissed && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-400/40 dark:border-amber-700/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Time to review and update your bills and payments for {currentMonth}!
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Baseline bills (rent, utilities) are maintained. Review pending charges or apply templates for this month.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab('essentials')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer"
            >
              Review Bills
            </button>
            {onDismissReminder && (
              <button
                onClick={() => onDismissReminder(currentMonth)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg cursor-pointer"
                title="Dismiss reminder for this month"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Debt-Free Countdown & Payoff Progress Banner (Item 9) */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-900/60 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                Family Debt-Free Trajectory
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                {overallDebtProgressPct}% Complete
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
              Projected Debt Freedom: <span className="text-emerald-400 underline decoration-emerald-500/50">{estimatedDebtFreeDate}</span>
            </h2>
            <p className="text-xs text-slate-300">
              At current planned payoff pacing of <strong>AED {monthlyPlannedLoans.toLocaleString()}/mo</strong> across all active loans.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-300 block uppercase font-sans">Remaining Debt</span>
              <span className="text-base font-bold text-rose-400">
                AED {totalDebtLoans.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pl-3 border-l border-white/20">
              <span className="text-[10px] text-slate-300 block uppercase font-sans">Paid to Date</span>
              <span className="text-base font-bold text-emerald-400">
                AED {lifetimePaidSoFar.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Countdown Progress Bar */}
        <div className="mt-4 space-y-1.5 relative z-10">
          <div className="w-full h-3 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/80">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${overallDebtProgressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>AED 0.00 Repaid</span>
            <span>Target: AED {lifetimeTotalRepay.toLocaleString()} (100% Debt-Free)</span>
          </div>
        </div>
      </div>

      {/* Milestone Celebrations: When any loan balance hits zero (Item 9) */}
      {settledLoans.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-emerald-500/30 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <PartyPopper className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Milestone Reached!
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                  Zero Balance
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate mt-0.5">
                🎉 Congratulations! {settledLoans.map((l) => l.lender).join(', ')} loan{settledLoans.length > 1 ? 's are' : ' is'} 100% Settled with AED 0.00 balance!
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('loans')}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>View Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs w-full min-w-0">
        <div className="min-w-0">
          <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            {currentMonth} Financial Snapshot
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">
            Family Wealth & Balance
          </h1>
          <p className="text-xs text-slate-500 truncate">
            Pure AED accounting across family members, essential living, and loan clearing
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={onOpenScanner}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
          >
            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Scan Bill / Receipt</span>
          </button>
          <button
            onClick={() => onNavigateTab('ai_advisor')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer w-full sm:w-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Run Monthly AI Advisor</span>
          </button>
        </div>
      </div>

      {/* Quick Cash Flow & Month-to-Month Rollover Banner (Items 5 & 2) */}
      <div className="p-3.5 sm:p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs w-full min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Money Available in {currentMonth}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
                Pure AED
              </span>
              {currentRollover > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold">
                  Includes AED {currentRollover.toLocaleString()} Rollover
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5 truncate">
              Net cash available to spend or allocate: <strong className="text-emerald-600 dark:text-emerald-400 text-sm sm:text-base font-bold font-mono">AED {availableSurplus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards that scale cleanly */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto font-mono text-xs">
          <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 sm:px-3 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between sm:flex-col sm:justify-start items-center sm:items-start min-w-0 w-full">
            <span className="text-slate-500 text-[10px] uppercase font-sans">Monthly Inflow</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">AED {totalIncomeMonth.toLocaleString()}</span>
          </div>
          <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 sm:px-3 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between sm:flex-col sm:justify-start items-center sm:items-start min-w-0 w-full">
            <span className="text-slate-500 text-[10px] uppercase font-sans">Committed Outflow</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 text-xs sm:text-sm">AED {totalMandatoryObligations.toLocaleString()}</span>
          </div>
          <div className="bg-emerald-600 text-white p-2.5 sm:px-3 sm:py-2 rounded-lg shadow-xs flex justify-between sm:flex-col sm:justify-start items-center sm:items-start min-w-0 w-full">
            <span className="text-emerald-100 text-[10px] uppercase font-sans">Money Available</span>
            <span className="font-bold text-xs sm:text-sm">AED {availableSurplus.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Dedicated Savings Vault Surplus Prompt (Item 2) */}
      {availableSurplus > 50 && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <PiggyBank className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Deposit Surplus into Dedicated Savings Vault
              </h4>
              <p className="text-[11px] text-slate-500">
                You have an unallocated surplus of <strong>AED {availableSurplus.toFixed(2)}</strong>. Lock in safety by transferring to your savings vault.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('vault_export' as any)} // will be redirected or navigate to savings
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Open Vault
          </button>
        </div>
      )}

      {/* 4 Core Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
        {/* Total Liquid Balance */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 w-full min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Monthly Inflow</span>
            <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
            AED {totalIncomeMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="truncate">
              {currentRollover > 0 ? `Incomes + AED ${currentRollover.toFixed(0)} rollover` : `Across ${monthlyIncomes.length} sources`}
            </span>
            <button
              onClick={() => {
                setEditRolloverAmount(currentRollover);
                setIsRolloverModalOpen(true);
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer shrink-0 ml-1"
            >
              Adjust Rollover
            </button>
          </div>
        </div>

        {/* Outstanding Family Debt */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 w-full min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-slate-500 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 min-w-0">
              <Landmark className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="truncate">{debtMode === 'loans' ? 'Personal Loans' : 'Combined Debt'}</span>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-[10px] font-medium shrink-0">
              <button
                onClick={() => setDebtMode('loans')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  debtMode === 'loans'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Loans
              </button>
              <button
                onClick={() => setDebtMode('combined')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  debtMode === 'combined'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                + Cards
              </button>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 truncate">
            AED{' '}
            {(debtMode === 'loans' ? totalDebtLoans : totalFamilyDebt).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="truncate">
              {debtMode === 'loans' ? `${vault.loans.filter((l) => l.leftToPay > 0).length} active loans` : `Loans + Cards`}
            </span>
            <button
              onClick={() => onNavigateTab('loans')}
              className="text-rose-600 dark:text-rose-400 hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer shrink-0 ml-1"
            >
              Loans <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Money Available This Month */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-xl space-y-2 ring-1 ring-emerald-500/20 w-full min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 truncate">Available Surplus</span>
            <PiggyBank className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate">
            AED {availableSurplus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="truncate">Net free cash flow</span>
            <button
              onClick={() => onNavigateTab('repayment_plan')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer shrink-0 ml-1"
            >
              Repayment Plan <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Capital Lent Out to Others */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 w-full min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="truncate">Money Lent Out</span>
            <HandCoins className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white truncate">
            AED {totalMoneyLentOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="truncate">Recoverable balance</span>
            <button
              onClick={() => onNavigateTab('money_lent')}
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer shrink-0 ml-1"
            >
              Details <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Breakdown & Upcoming Deadlines (Item 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
        {/* Spending Category Breakdown */}
        <div className="lg:col-span-2 p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Allocation & Spending (Item 8)</h2>
              <p className="text-xs text-slate-500">Distribution of apartment rent, utility bills, arrears, and debts without omissions</p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
              Total Committed: AED {totalPlannedOutflows.toFixed(2)}
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            {Object.entries(categoriesMap).map(([category, amount], idx) => {
              const pct = (amount / totalPlannedOutflows) * 100;
              const colors = [
                'bg-indigo-600',
                'bg-cyan-500',
                'bg-rose-500',
                'bg-emerald-500',
                'bg-amber-500',
                'bg-purple-500',
                'bg-slate-400',
              ];
              return (
                <div
                  key={category}
                  style={{ width: `${pct}%` }}
                  className={`h-full ${colors[idx % colors.length]}`}
                  title={`${category}: AED ${amount.toFixed(2)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Category List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 w-full min-w-0">
            {Object.entries(categoriesMap).map(([category, amount], idx) => {
              const pct = ((amount / totalPlannedOutflows) * 100).toFixed(1);
              const indicatorColors = [
                'text-indigo-600',
                'text-cyan-500',
                'text-rose-500',
                'text-emerald-500',
                'text-amber-500',
                'text-purple-500',
                'text-slate-400',
              ];
              return (
                <div
                  key={category}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-base font-bold shrink-0 ${indicatorColors[idx % indicatorColors.length]}`}>•</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{category}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white block">
                      AED {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly Savings Goal Progress */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                Monthly Savings Goal: {savingsGoal.goalTitle}
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                AED {availableSurplus.toFixed(2)} / AED {savingsGoal.targetAmount.toFixed(2)} ({savingsProgressPct}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${savingsProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Scheduled Monthly Obligations */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 flex flex-col justify-between w-full min-w-0">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <CalendarCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Scheduled Obligations</span>
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium shrink-0 ml-2">
                {allUpcoming.length} scheduled
              </span>
            </div>

            {allUpcoming.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                All bills and scheduled installments for {currentMonth} are settled!
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {allUpcoming.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between text-xs hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block truncate">
                        Due: {item.dueDate} • {item.type}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                      AED {item.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <button
              onClick={() => onNavigateTab('essentials')}
              className="flex-1 py-1.5 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Essentials
            </button>
            <button
              onClick={() => onNavigateTab('loans')}
              className="flex-1 py-1.5 text-center text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Pay Loans
            </button>
          </div>
        </div>
      </div>

      {/* Adjust Rollover Modal (Item 5) */}
      {isRolloverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Adjust Carried Rollover ({currentMonth})
              </h3>
              <button
                onClick={() => setIsRolloverModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Adjust unspent cash carried over into this month's opening balance:
            </p>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Rollover Balance (AED)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editRolloverAmount || ''}
                onChange={(e) => setEditRolloverAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRolloverModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onUpdateRollover) {
                    onUpdateRollover(currentMonth, editRolloverAmount);
                  }
                  setIsRolloverModalOpen(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                Save Rollover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
