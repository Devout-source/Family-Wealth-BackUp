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
} from 'lucide-react';
import { FamilyVaultData } from '../types.ts';
import { ActiveTab } from './Sidebar.tsx';

interface DashboardViewProps {
  vault: FamilyVaultData;
  currentMonth: string;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenScanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  vault,
  currentMonth,
  onNavigateTab,
  onOpenScanner,
}) => {
  const [debtMode, setDebtMode] = useState<'loans' | 'combined'>('loans');

  // Current month incomes
  const monthlyIncomes = vault.incomes.filter((i) => i.monthYear === currentMonth);
  const totalIncomeMonth = monthlyIncomes.reduce((acc, i) => acc + (i.actualAmount || i.plannedAmount), 0);

  // Total Outstanding Loans We Owe
  const totalDebtLoans = vault.loans.reduce((acc, l) => acc + l.leftToPay, 0);

  // Credit Card Balances
  const totalCreditCards = vault.creditCards.reduce((acc, c) => acc + c.statementBalance, 0);
  const totalFamilyDebt = totalDebtLoans + totalCreditCards;

  // Monthly Planned Obligations
  const monthlyPlannedLoans = vault.loans.reduce((acc, l) => acc + l.plannedPaymentThisMonth, 0);
  const monthlyEssentials = vault.essentials
    .filter((e) => e.monthYear === currentMonth)
    .reduce((acc, e) => acc + e.amount, 0);
  const monthlyCCMinPayments = vault.creditCards.reduce((acc, c) => acc + c.minPayment, 0);
  const monthlyOtherSpending = vault.otherSpending
    .filter((o) => o.monthYear === currentMonth)
    .reduce((acc, o) => acc + o.amount, 0);

  // Free cash flow / Surplus after calculating all debt and essential needs
  const totalMandatoryObligations = monthlyPlannedLoans + monthlyEssentials + monthlyCCMinPayments;
  const availableSurplus = Math.max(0, totalIncomeMonth - totalMandatoryObligations);

  // Capital Lent Out
  const totalMoneyLentOut = vault.moneyLent.reduce((acc, m) => acc + m.balanceRemaining, 0);

  // Current Month Savings Goal
  const savingsGoal = vault.savingsGoals.find((g) => g.monthYear === currentMonth) || {
    targetAmount: 5000,
    goalTitle: 'Emergency Liquidity Fund',
  };
  const savingsProgressPct = Math.min(100, Math.round((availableSurplus / (savingsGoal.targetAmount || 1)) * 100));

  // Upcoming Bills & Loan Installments in current month
  const upcomingBills = vault.essentials
    .filter((e) => e.monthYear === currentMonth && e.status === 'Pending')
    .map((e) => ({
      id: e.id,
      title: e.name,
      amount: e.amount,
      dueDate: e.dueDate,
      type: 'Essential Bill',
    }));

  const upcomingLoans = vault.loans
    .filter((l) => l.leftToPay > 0 && l.plannedPaymentThisMonth > 0)
    .map((l) => ({
      id: l.id,
      title: `Loan Repayment: ${l.lender}`,
      amount: l.plannedPaymentThisMonth,
      dueDate: l.dueDateThisPayment,
      type: 'Loan Repayment',
    }));

  const allUpcoming = [...upcomingBills, ...upcomingLoans];

  // Spending Categories Breakdown
  const categoriesMap: Record<string, number> = {
    'Loan Repayments': monthlyPlannedLoans,
    'Apartment & Utilities': vault.essentials
      .filter((e) => e.monthYear === currentMonth && (e.category === 'Housing' || e.category === 'Utilities'))
      .reduce((s, e) => s + e.amount, 0),
    'Groceries & Food': vault.essentials
      .filter((e) => e.monthYear === currentMonth && e.category === 'Groceries')
      .reduce((s, e) => s + e.amount, 0),
    'Credit Cards Min': monthlyCCMinPayments,
    'Discretionary & Misc': monthlyOtherSpending,
  };

  const totalPlannedOutflows = Object.values(categoriesMap).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
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
            Pure AED accounting across 5 family sub-accounts and personal loans
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

      {/* Quick Cash Flow & Money Available Banner */}
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
            </div>
            <div className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5 truncate">
              Net cash available to spend or allocate: <strong className="text-emerald-600 dark:text-emerald-400 text-sm sm:text-base font-bold font-mono">AED {availableSurplus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards that scale cleanly: 100% full-width on mobile, 3 columns on tablet/desktop */}
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
            <span className="truncate">Across {monthlyIncomes.length} sources</span>
            <button
              onClick={() => onNavigateTab('income')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer shrink-0 ml-1"
            >
              Incomes <ArrowUpRight className="w-3 h-3" />
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
            {/* Toggle between Loans Only (~5.3k) and Combined (+Credit Cards) */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-[10px] font-medium shrink-0">
              <button
                onClick={() => setDebtMode('loans')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  debtMode === 'loans'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Personal loans owed to Janaka and Kalu only (~5.3k AED)"
              >
                Loans (~5.3k)
              </button>
              <button
                onClick={() => setDebtMode('combined')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  debtMode === 'combined'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Loans plus credit card balances"
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
              {debtMode === 'loans' ? 'Janaka & Kalu' : `Loans: AED ${totalDebtLoans.toFixed(0)} • CC: AED ${totalCreditCards.toFixed(0)}`}
            </span>
            <button
              onClick={() => onNavigateTab('loans')}
              className="text-rose-600 dark:text-rose-400 hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer shrink-0 ml-1"
            >
              Loans <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Money Available This Month (Net Liquid Cash Flow) */}
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
              onClick={() => onNavigateTab('ai_advisor')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer shrink-0 ml-1"
            >
              Simulate <ArrowUpRight className="w-3 h-3" />
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

      {/* Main Grid: Visual Breakdown & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
        {/* Spending Category Breakdown */}
        <div className="lg:col-span-2 p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Allocation & Spending</h2>
              <p className="text-xs text-slate-500">Distribution of planned monthly commitments in pure AED</p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
              Outflows: AED {totalPlannedOutflows.toFixed(2)}
            </span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            {Object.entries(categoriesMap).map(([category, amount], idx) => {
              const pct = (amount / totalPlannedOutflows) * 100;
              const colors = [
                'bg-rose-500',
                'bg-indigo-500',
                'bg-emerald-500',
                'bg-amber-500',
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
                'text-rose-500',
                'text-indigo-500',
                'text-emerald-500',
                'text-amber-500',
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
    </div>
  );
};
