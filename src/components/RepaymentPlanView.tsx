import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Zap,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  Flame,
  Check,
  X,
  Calendar,
  Sparkles,
  Layers,
  Banknote,
  Clock,
  Coins,
  SlidersHorizontal,
  Eye,
  EyeOff,
  RotateCcw,
  Gauge,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { RepaymentInstallment, LoanRecord, IncomeEntry, EssentialBill } from '../types.ts';
import { exportInstallmentsCSV } from '../utils/exportTools.ts';
import {
  calculateDebtAvalanche,
  LoanAllocationStep,
  SafetyBufferConfig,
  PacingCapConfig,
  DEFAULT_SAFETY_BUFFER,
  DEFAULT_PACING_CAP,
} from '../utils/debtAvalanche.ts';

const BUFFER_STORAGE_KEY = 'family_vault_living_buffer_v1';
const PACING_STORAGE_KEY = 'family_vault_pacing_cap_v1';
const WHAT_IF_STORAGE_KEY = 'family_vault_what_if_excluded_v1';

interface RepaymentPlanViewProps {
  installments: RepaymentInstallment[];
  loans: LoanRecord[];
  incomes?: IncomeEntry[];
  essentials?: EssentialBill[];
  currentMonth: string;
  onMarkPaid: (installmentId: string, paidAmount: number, paymentMethod: string) => void;
  onRecordLoanPayment?: (loanId: string, amount: number, paymentMethod: string, notes: string) => void;
  canEdit: boolean;
}

export const RepaymentPlanView: React.FC<RepaymentPlanViewProps> = ({
  installments,
  loans,
  incomes = [],
  essentials = [],
  currentMonth,
  onMarkPaid,
  onRecordLoanPayment,
  canEdit,
}) => {
  const [selectedLoanFilter, setSelectedLoanFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [viewTab, setViewTab] = useState<'avalanche' | 'installments'>('avalanche');

  // 1. Safety Buffer Setting (Daily Food & Survival Cash)
  const [bufferConfig, setBufferConfig] = useState<SafetyBufferConfig>(() => {
    try {
      const saved = localStorage.getItem(BUFFER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SAFETY_BUFFER;
  });

  // 2. Sustainable Monthly Pacing Caps
  const [pacingCapConfig, setPacingCapConfig] = useState<PacingCapConfig>(() => {
    try {
      const saved = localStorage.getItem(PACING_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PACING_CAP;
  });

  // 3. "What-If" Simulation Excluded Loan IDs (Simulate Closed or Paused Loans)
  const [excludedLoanIds, setExcludedLoanIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WHAT_IF_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Controls drawer visibility
  const [isControlsExpanded, setIsControlsExpanded] = useState<boolean>(true);

  // Quick Payment Execution Modal state
  const [paymentTargetLoan, setPaymentTargetLoan] = useState<LoanAllocationStep | null>(null);
  const [execPaymentAmount, setExecPaymentAmount] = useState<number>(0);
  const [execPaymentMethod, setExecPaymentMethod] = useState<string>('Bank Transfer');
  const [execPaymentNotes, setExecPaymentNotes] = useState<string>('');

  // Persist configurations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(bufferConfig));
    } catch {}
  }, [bufferConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(PACING_STORAGE_KEY, JSON.stringify(pacingCapConfig));
    } catch {}
  }, [pacingCapConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(WHAT_IF_STORAGE_KEY, JSON.stringify(excludedLoanIds));
    } catch {}
  }, [excludedLoanIds]);

  // Execute smart calculation linking Income, Essentials, and Loans with Safety Buffer, Pacing & What-If
  const plan = useMemo(() => {
    return calculateDebtAvalanche(incomes, essentials, loans, currentMonth, {
      bufferConfig,
      pacingCapConfig,
      excludedLoanIds,
    });
  }, [incomes, essentials, loans, currentMonth, bufferConfig, pacingCapConfig, excludedLoanIds]);

  // Toggle "What-If" simulated closure on/off for a loan
  const toggleWhatIfLoan = (loanId: string) => {
    setExcludedLoanIds((prev) => {
      if (prev.includes(loanId)) {
        return prev.filter((id) => id !== loanId);
      } else {
        return [...prev, loanId];
      }
    });
  };

  const handleResetWhatIf = () => {
    setExcludedLoanIds([]);
  };

  // Installments list filtering
  const filteredInstallments = useMemo(() => {
    return installments.filter((inst) => {
      if (selectedLoanFilter !== 'ALL' && inst.loanId !== selectedLoanFilter) return false;
      if (selectedStatusFilter !== 'ALL' && inst.status !== selectedStatusFilter) return false;
      return true;
    });
  }, [installments, selectedLoanFilter, selectedStatusFilter]);

  const totalPlannedSum = filteredInstallments.reduce((acc, i) => acc + i.plannedAmount, 0);
  const totalPaidSum = filteredInstallments
    .filter((i) => i.status === 'Paid')
    .reduce((acc, i) => acc + (i.paidAmount || i.plannedAmount), 0);
  const totalRemainingSum = Math.max(0, totalPlannedSum - totalPaidSum);

  // Open Quick Pay modal for an avalanche step
  const handleOpenPayModal = (step: LoanAllocationStep) => {
    setPaymentTargetLoan(step);
    setExecPaymentAmount(step.totalSuggestedAllocation);
    setExecPaymentMethod('Bank Transfer');
    setExecPaymentNotes(`Debt Avalanche Payoff Allocation for ${step.lender} (${currentMonth})`);
  };

  const handleConfirmExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetLoan || !onRecordLoanPayment || execPaymentAmount <= 0) return;

    onRecordLoanPayment(
      paymentTargetLoan.loanId,
      execPaymentAmount,
      execPaymentMethod,
      execPaymentNotes
    );

    // Also mark matching installment as paid if one exists for current month
    const matchingInst = installments.find(
      (inst) => inst.loanId === paymentTargetLoan.loanId && inst.status !== 'Paid'
    );
    if (matchingInst) {
      onMarkPaid(matchingInst.id, execPaymentAmount, execPaymentMethod);
    }

    setPaymentTargetLoan(null);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Repayment Plan</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-semibold">
                <Sparkles className="w-3 h-3" />
                Smart Avalanche Engine
              </span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated payoff schedule calculating net disposable funds with <strong>Living Safety Buffer</strong>,{' '}
            <strong>Sustainable Pacing</strong>, and <strong>What-If Simulation</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-view switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewTab('avalanche')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewTab === 'avalanche'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Smart Payoff</span>
            </button>
            <button
              onClick={() => setViewTab('installments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewTab === 'installments'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>Instalments ({installments.length})</span>
            </button>
          </div>

          <button
            onClick={() => exportInstallmentsCSV(installments)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Export Instalments as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* FEATURE 1 & 2: CONTROLS PANEL FOR SAFETY BUFFER & MONTHLY PACING */}
      {viewTab === 'avalanche' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all">
          <div
            onClick={() => setIsControlsExpanded(!isControlsExpanded)}
            className="p-4 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between cursor-pointer border-b border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Payoff Safety Buffer & Pacing Settings</span>
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Buffer: {bufferConfig.mode === 'percentage' ? `${bufferConfig.percentage}%` : `AED ${bufferConfig.fixedAmount}`}
                    {pacingCapConfig.enabled ? ` • Paced: AED ${pacingCapConfig.maxPerLoanAmount}/mo` : ' • Uncapped'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Protect cash for daily food, groceries and survival before accelerating debt payments.
                </p>
              </div>
            </div>

            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
              {isControlsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isControlsExpanded && (
            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Feature 1: Living Safety Buffer Config */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      1. Living Safety Buffer (Food & Daily Survival)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Reserving AED {plan.livingBufferAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Reserves cash from net income strictly for groceries, food, and daily needs before debt allocation.
                </p>

                {/* Mode Selector */}
                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-lg text-xs font-medium w-48">
                    <button
                      type="button"
                      onClick={() => setBufferConfig({ ...bufferConfig, mode: 'percentage' })}
                      className={`py-1 text-center rounded-md transition-all cursor-pointer ${
                        bufferConfig.mode === 'percentage'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBufferConfig({ ...bufferConfig, mode: 'fixed' })}
                      className={`py-1 text-center rounded-md transition-all cursor-pointer ${
                        bufferConfig.mode === 'fixed'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Fixed AED
                    </button>
                  </div>

                  {/* Percentage Presets */}
                  {bufferConfig.mode === 'percentage' ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {[15, 25, 35, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setBufferConfig({ ...bufferConfig, percentage: pct })}
                          className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                            bufferConfig.percentage === pct
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {pct}% {pct === 25 ? '★' : ''}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {[1500, 2500, 4000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setBufferConfig({ ...bufferConfig, fixedAmount: amt })}
                          className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                            bufferConfig.fixedAmount === amt
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {amt} AED
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Input */}
                <div className="flex items-center gap-3 pt-1">
                  {bufferConfig.mode === 'percentage' ? (
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Custom %:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={bufferConfig.percentage}
                        onChange={(e) =>
                          setBufferConfig({
                            ...bufferConfig,
                            percentage: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                          })
                        }
                        className="w-20 px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Custom AED:
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={bufferConfig.fixedAmount}
                        onChange={(e) =>
                          setBufferConfig({
                            ...bufferConfig,
                            fixedAmount: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-28 px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <span className="text-xs text-slate-400">AED</span>
                    </div>
                  )}
                  <span className="text-[11px] text-slate-500 italic">
                    Safe cash retained: AED {plan.livingBufferAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Feature 2: Sustainable Monthly Pacing Caps Config */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      2. Sustainable Monthly Pacing Caps
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pacingCapConfig.enabled}
                      onChange={(e) =>
                        setPacingCapConfig({ ...pacingCapConfig, enabled: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
                    <span className="ml-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {pacingCapConfig.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Caps maximum repayment allocated to any single loan in one month, distributing payments sustainably over time.
                </p>

                {pacingCapConfig.enabled ? (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Quick Cap:</span>
                      {[2000, 3000, 5000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPacingCapConfig({ ...pacingCapConfig, maxPerLoanAmount: amt })}
                          className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                            pacingCapConfig.maxPerLoanAmount === amt
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                          }`}
                        >
                          AED {amt.toLocaleString()}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                        Max Payoff / Loan / Mo:
                      </label>
                      <input
                        type="number"
                        min="200"
                        step="250"
                        value={pacingCapConfig.maxPerLoanAmount}
                        onChange={(e) =>
                          setPacingCapConfig({
                            ...pacingCapConfig,
                            maxPerLoanAmount: Math.max(100, parseFloat(e.target.value) || 0),
                          })
                        }
                        className="w-28 px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <span className="text-xs text-slate-400">AED max</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                    Uncapped: The engine will clear maximum debt permitted by the net fund without single-loan ceilings.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FEATURE 3: WHAT-IF SIMULATION ACTIVE BANNER */}
      {viewTab === 'avalanche' && plan.simulatedExcludedCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-cyan-500/10 dark:from-amber-950/40 dark:via-slate-900 dark:to-cyan-950/30 border border-amber-400/60 dark:border-amber-700 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  What-If Simulation Active ({plan.simulatedExcludedCount} loan{plan.simulatedExcludedCount > 1 ? 's' : ''} paused)
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                  No Permanent Deletion
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Simulating what happens when selected loans are closed or paused. Calculations below reflect freed cashflow and saved interest charges.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Simulated Debt Drop</span>
              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                -AED {plan.simulatedDebtReduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-right pl-3 border-l border-amber-300 dark:border-amber-800">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Interest Saved</span>
              <span className="text-sm font-bold font-mono text-cyan-600 dark:text-cyan-400">
                AED {plan.simulatedMonthlyInterestSaved.toFixed(2)}/mo
              </span>
            </div>
            <div className="text-right pl-3 border-l border-amber-300 dark:border-amber-800">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Cashflow Freed</span>
              <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                AED {plan.simulatedMonthlyCashFreed.toFixed(2)}/mo
              </span>
            </div>
            <button
              onClick={handleResetWhatIf}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. NET DISPOSABLE CASH CALCULATION BANNER & CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monthly Income */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-500" />
              Total Monthly Income
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {plan.incomeSourcesCount} source(s)
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            AED {plan.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Auto-synced from <strong>Income Log</strong> ({currentMonth})
          </p>
        </div>

        {/* Total Essentials & Arrears */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-rose-500" />
              Essentials & Arrears
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              {plan.essentialsCount} bill(s)
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            AED {plan.totalEssentials.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Base: AED {plan.baseEssentialsAmount.toFixed(2)}</span>
            <span>Arrears: AED {plan.arrearsAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Net Clearing Fund: (Income - Essentials) - Living Buffer */}
        <div className={`p-4 rounded-2xl shadow-xs space-y-2 border ${
          plan.isDeficit
            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
            : 'bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-300 dark:border-emerald-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Net Clearing Fund
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              plan.isDeficit
                ? 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                : 'bg-emerald-600 text-white'
            }`}>
              {plan.isDeficit ? 'Deficit' : 'For Debt'}
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-bold font-mono ${
            plan.isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
          }`}>
            AED {plan.netFund.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight space-y-0.5">
            <div className="flex justify-between font-mono">
              <span>(Income − Essentials):</span>
              <span>AED {plan.baseNetCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
              <span>− Living Buffer ({bufferConfig.mode === 'percentage' ? `${bufferConfig.percentage}%` : 'Fixed'}):</span>
              <span>AED {plan.livingBufferAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Active Debt Outstanding (incorporating What-If simulation) */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-indigo-500" />
              Active Loans Balance
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {plan.activeLoansCount} active
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
            AED {plan.totalActiveDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Allocated this mo:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              AED {plan.totalSuggestedDebtPayment.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. SMART AVALANCHE ALLOCATION TAB */}
      {viewTab === 'avalanche' && (
        <div className="space-y-6">
          {/* Avalanche Strategy Callout Banner */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                  <span>Balanced Avalanche Payoff Strategy</span>
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                    Highest Interest First
                  </span>
                  {pacingCapConfig.enabled && (
                    <span className="text-[10px] uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                      Pacing Capped
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  The Net Fund of <strong>AED {plan.netFund.toFixed(2)}</strong> (after reserving AED {plan.livingBufferAmount.toFixed(2)} for daily survival)
                  targets loans carrying high interest rates first. Use the <strong>What-If toggle</strong> on each card to simulate closing or pausing loans.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Debt Cleared This Month</span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  AED {plan.totalSuggestedDebtPayment.toFixed(2)}
                </span>
              </div>
              {plan.unallocatedCash > 0 && (
                <div className="text-right pl-3 border-l border-slate-700">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Surplus Reserve</span>
                  <span className="text-sm font-bold font-mono text-indigo-300">
                    AED {plan.unallocatedCash.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Allocation Steps List */}
          {plan.allocations.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Zero Active Debt!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                All family loans are settled or simulated paused. Your net fund is 100% available as family savings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span>Step-by-Step Avalanche Priority Order</span>
                  <span className="text-xs font-normal text-slate-500 lowercase font-sans">
                    ({plan.activeLoansCount} active, {plan.simulatedExcludedCount} simulated paused)
                  </span>
                </h2>
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Toggle eye icon on any loan to simulate closure without losing data.
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {plan.allocations.map((step) => {
                  const percentOfDebtPaid = step.leftToPay > 0
                    ? Math.min(100, Math.round((step.totalSuggestedAllocation / step.leftToPay) * 100))
                    : 100;

                  return (
                    <div
                      key={step.loanId}
                      className={`p-5 rounded-2xl border transition-all shadow-xs ${
                        step.isSimulatedExcluded
                          ? 'bg-slate-100/60 dark:bg-slate-950/30 border-dashed border-slate-300 dark:border-slate-800 opacity-70'
                          : step.willBeSettled
                          ? 'bg-gradient-to-r from-emerald-50/90 via-white to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border-emerald-400/80 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Priority Rank, Lender info, What-If toggle */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Feature 3: What-If Simulation Toggle Switch */}
                            <button
                              type="button"
                              onClick={() => toggleWhatIfLoan(step.loanId)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                step.isSimulatedExcluded
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                              }`}
                              title={step.isSimulatedExcluded ? 'Click to re-include loan in active schedule' : 'Click to simulate loan closure / pause'}
                            >
                              {step.isSimulatedExcluded ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                  <span>Paused in Simulation</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Active (What-If)</span>
                                </>
                              )}
                            </button>

                            {!step.isSimulatedExcluded && (
                              <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs">
                                Priority #{step.priorityRank}
                              </span>
                            )}

                            <span className="text-base font-bold text-slate-900 dark:text-white">
                              {step.lender}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              {step.purpose} ({step.loanId})
                            </span>

                            {/* Interest Rate Badge */}
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              step.ratePct >= 7
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : step.ratePct > 0
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              <Flame className="w-3 h-3 text-amber-500" />
                              {step.ratePct.toFixed(2)}% Monthly Rate
                            </span>

                            {/* Duration Badge */}
                            {step.isOpenEnded ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                                <Clock className="w-3 h-3" />
                                Open-Ended Duration • Dynamic Interest: AED {step.monthlyInterestAmount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <Calendar className="w-3 h-3" />
                                Fixed Duration ({step.interestDurationMonths} mo)
                              </span>
                            )}

                            {/* Feature 2: Pacing Capped Badge */}
                            {step.isPacingCapped && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                                <Gauge className="w-3 h-3" />
                                Pacing Capped (AED {step.appliedPacingCap?.toLocaleString()}/mo)
                              </span>
                            )}

                            {step.willBeSettled && (
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Settled with this Allocation!
                              </span>
                            )}
                          </div>

                          {/* Balance details */}
                          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                            <span>
                              Principal: <strong>AED {step.principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Left to Pay: <strong className="text-rose-600 dark:text-rose-400">AED {step.leftToPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Monthly Min Target:{' '}
                              <strong>AED {step.monthlyTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Right: Allocation & Action */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6 shrink-0 bg-slate-50 dark:bg-slate-950/50 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
                          {step.isSimulatedExcluded ? (
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold block">
                                What-If Simulation Result
                              </span>
                              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Saves <strong>AED {step.monthlyInterestAmount.toFixed(2)}</strong> interest/mo
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Frees <strong>AED {step.monthlyTarget.toFixed(2)}</strong> monthly cashflow
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
                                Suggested Payoff This Month
                              </span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                  AED {step.totalSuggestedAllocation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>Min: AED {step.minRequiredAllocation.toFixed(2)}</span>
                                {step.avalancheExtraAllocation > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    + Avalanche Extra: AED {step.avalancheExtraAllocation.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col sm:items-end gap-1 shrink-0 w-full sm:w-auto">
                            <span className="text-[10px] text-slate-500 uppercase">
                              Projected Balance After
                            </span>
                            <span className={`text-sm font-bold font-mono ${
                              step.projectedRemainingDebt <= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>
                              AED {step.projectedRemainingDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>

                            {!step.isSimulatedExcluded && canEdit && onRecordLoanPayment && step.totalSuggestedAllocation > 0 && (
                              <button
                                onClick={() => handleOpenPayModal(step)}
                                className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Record Payment</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar of Payoff */}
                      {!step.isSimulatedExcluded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                            <span>Month Payment Impact on Debt</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {percentOfDebtPaid}% of loan balance cleared
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                step.willBeSettled ? 'bg-emerald-500' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${percentOfDebtPaid}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. INSTALMENT SCHEDULE & HISTORICAL LEDGER */}
      {viewTab === 'installments' && (
        <div className="space-y-4">
          {/* Aggregate Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Total Planned Instalments</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                AED {totalPlannedSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Paid to Date</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                AED {totalPaidSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Upcoming / Remaining</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                AED {totalRemainingSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <span className="text-slate-500 px-2 font-medium">Loan:</span>
              <button
                onClick={() => setSelectedLoanFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  selectedLoanFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All Loans
              </button>
              {loans.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLoanFilter(l.id)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    selectedLoanFilter === l.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {l.lender} ({l.id})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <span className="text-slate-500 px-2 font-medium">Status:</span>
              {['ALL', 'Pending', 'Paid'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    selectedStatusFilter === st
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Instalment #</th>
                  <th className="py-3 px-4">Loan / Lender</th>
                  <th className="py-3 px-4">Scheduled Month</th>
                  <th className="py-3 px-4 text-right">Planned Amount (AED)</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Paid On</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {filteredInstallments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                      No matching instalment records found.
                    </td>
                  </tr>
                ) : (
                  filteredInstallments.map((inst) => {
                    const isPaid = inst.status === 'Paid';
                    const isCurrentMonth = inst.monthYear === currentMonth;
                    return (
                      <tr
                        key={inst.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          isCurrentMonth ? 'bg-emerald-50/20 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          Instalment #{inst.installmentNumber}
                        </td>
                        <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-white">
                          {inst.lender} ({inst.loanId})
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300">
                          {inst.monthYear}{' '}
                          {isCurrentMonth && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-bold">
                              (Current)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                          {inst.plannedAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{inst.dueDate}</td>
                        <td className="py-3 px-4 font-sans">
                          <span
                            className={`text-xs font-semibold ${
                              isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            • {inst.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-sans">{inst.paidDate || '--'}</td>
                        <td className="py-3 px-4 text-center">
                          {!isPaid && canEdit ? (
                            <button
                              onClick={() => onMarkPaid(inst.id, inst.plannedAmount, 'Bank Transfer')}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded transition-colors cursor-pointer"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-sans font-medium">
                              ✓ Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK EXECUTE PAYMENT MODAL */}
      {paymentTargetLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setPaymentTargetLoan(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Execute Suggested Payoff
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {paymentTargetLoan.lender} ({paymentTargetLoan.loanId}) • Rate: {paymentTargetLoan.ratePct}%
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmExecutePayment} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Amount (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={execPaymentAmount}
                  onChange={(e) => setExecPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Remaining loan balance: AED {paymentTargetLoan.leftToPay.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Method
                </label>
                <select
                  value={execPaymentMethod}
                  onChange={(e) => setExecPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Receipt / Audit Notes
                </label>
                <input
                  type="text"
                  value={execPaymentNotes}
                  onChange={(e) => setExecPaymentNotes(e.target.value)}
                  placeholder="e.g. Bank transfer reference #12345"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentTargetLoan(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Save to Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
