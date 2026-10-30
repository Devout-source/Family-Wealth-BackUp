import React, { useState } from 'react';
import {
  Plus,
  Download,
  Pencil,
  Trash2,
  X,
  TrendingDown,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { LoanRecord } from '../types.ts';
import { exportLoansCSV } from '../utils/exportTools.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { sanitizeCurrency } from '../utils/numberSanitizer.ts';

interface LoanTrendPoint {
  monthLabel: string;
  remainingBalance: number;
  paidAccumulated: number;
  isCurrent: boolean;
  plannedInstallment: number;
}

function computeLoanTrendData(loan: LoanRecord): LoanTrendPoint[] {
  const points: LoanTrendPoint[] = [];
  const duration = Math.max(1, loan.interestDurationMonths || 1);
  const total = loan.totalToRepay;
  const left = loan.leftToPay;
  const monthlyPlanned = loan.plannedPaymentThisMonth || Math.round((total / duration) * 100) / 100;

  // Extract start date
  let startY = 2026;
  let startM = 9;
  if (loan.borrowedDate) {
    const parts = loan.borrowedDate.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        startY = parseInt(parts[0]) || 2026;
        startM = parseInt(parts[1]) || 9;
      } else if (parts[2].length === 4) {
        startY = parseInt(parts[2]) || 2026;
        const monthNamesLower = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const mIdx = monthNamesLower.indexOf(parts[1].toLowerCase());
        startM = mIdx >= 0 ? mIdx + 1 : 9;
      }
    }
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Start point (Loan Inception)
  const startMonthName = monthNames[(startM - 1) % 12];
  points.push({
    monthLabel: `${startMonthName} '26 (Start)`,
    remainingBalance: total,
    paidAccumulated: 0,
    isCurrent: loan.paidSoFar === 0,
    plannedInstallment: 0,
  });

  // Calculate monthly trajectory
  let runningBalance = total;
  for (let step = 1; step <= duration; step++) {
    const mNum = ((startM - 1 + step) % 12) + 1;
    const yNum = startY + Math.floor((startM - 1 + step) / 12);
    const mLabel = `${monthNames[mNum - 1]} '${String(yNum).slice(-2)}`;

    // Payment for this step
    const installmentAmount = step === duration ? runningBalance : Math.min(runningBalance, monthlyPlanned);
    runningBalance = Math.max(0, Math.round((runningBalance - installmentAmount) * 100) / 100);
    const runningPaid = Math.round((total - runningBalance) * 100) / 100;
    const isCurrentStep = Math.abs(runningBalance - left) < monthlyPlanned * 0.5;

    points.push({
      monthLabel: mLabel,
      remainingBalance: runningBalance,
      paidAccumulated: runningPaid,
      isCurrent: isCurrentStep,
      plannedInstallment: installmentAmount,
    });
  }

  return points;
}

interface LoansViewProps {
  loans: LoanRecord[];
  onAddLoan: (loan: LoanRecord) => void;
  onUpdateLoan?: (loan: LoanRecord) => void;
  onDeleteLoan?: (loanId: string) => void;
  onRecordPayment: (loanId: string, amount: number, paymentMethod: string, notes: string) => void;
  canEdit: boolean;
}

export const LoansView: React.FC<LoansViewProps> = ({
  loans,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
  onRecordPayment,
  canEdit,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [payModalLoan, setPayModalLoan] = useState<LoanRecord | null>(null);
  const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);
  const [deleteLoanTarget, setDeleteLoanTarget] = useState<LoanRecord | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('ALL');

  // New loan form state
  const [lender, setLender] = useState('');
  const [purpose, setPurpose] = useState('PERSONAL');
  const [borrowedDate, setBorrowedDate] = useState(new Date().toISOString().slice(0, 10));
  const [principal, setPrincipal] = useState<number>(0);
  const [isOpenEnded, setIsOpenEnded] = useState(false);
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [monthlyRatePct, setMonthlyRatePct] = useState<number>(5.0);
  const [finalDate, setFinalDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Debit Card' | 'Cash' | 'Cheque'>('Bank Transfer');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Real-time calculation previews for new loan
  const calculatedMonthlyInterest = Math.round(principal * (monthlyRatePct / 100) * 100) / 100;
  const calculatedTotalInterest = isOpenEnded
    ? calculatedMonthlyInterest
    : Math.round(calculatedMonthlyInterest * durationMonths * 100) / 100;
  const calculatedTotalToRepay = Math.round((principal + calculatedTotalInterest) * 100) / 100;

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrincipal = sanitizeCurrency(principal);
    const cleanRate = sanitizeCurrency(monthlyRatePct);
    const cleanDuration = isOpenEnded ? 0 : Math.max(1, Math.round(sanitizeCurrency(durationMonths)));

    if (!lender.trim() || cleanPrincipal <= 0) return;

    const monthlyInterest = Math.round(cleanPrincipal * (cleanRate / 100) * 100) / 100;
    const totalInterest = isOpenEnded ? monthlyInterest : Math.round(monthlyInterest * cleanDuration * 100) / 100;
    const totalToRepay = Math.round((cleanPrincipal + totalInterest) * 100) / 100;
    const plannedMonthly = isOpenEnded ? monthlyInterest : Math.round((totalToRepay / (cleanDuration || 1)) * 100) / 100;

    const newLoan: LoanRecord = {
      id: `L${loans.length + 1}`,
      lender: lender.trim().toUpperCase(),
      purpose: purpose.trim().toUpperCase(),
      borrowedDate,
      principal: cleanPrincipal,
      interestStartDate: borrowedDate,
      finalRepaymentDate: finalDate || borrowedDate,
      interestDurationMonths: cleanDuration,
      monthlyInterestRatePct: cleanRate,
      monthlyInterestUsed: monthlyInterest,
      totalInterestTerm: totalInterest,
      totalToRepay: totalToRepay,
      paidSoFar: 0,
      leftToPay: totalToRepay,
      plannedPaymentThisMonth: plannedMonthly,
      dueDateThisPayment: dueDate || borrowedDate,
      paidThisMonth: 0,
      overdueAmount: 0,
      status: 'Active',
      notes: notes.trim(),
      planSummary: isOpenEnded
        ? `Open-ended duration | dynamic monthly interest AED ${monthlyInterest.toFixed(2)}`
        : `${cleanDuration} instalment(s) | total planned AED ${totalToRepay.toFixed(2)}`,
    };

    onAddLoan(newLoan);
    setIsAddModalOpen(false);
    // Reset form
    setLender('');
    setPrincipal(0);
    setDueDate('');
    setFinalDate('');
    setNotes('');
    setIsOpenEnded(false);
  };

  const handleSaveEditedLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan || !onUpdateLoan) return;

    const cleanPrincipal = sanitizeCurrency(editingLoan.principal);
    const cleanRate = sanitizeCurrency(editingLoan.monthlyInterestRatePct);
    const isOpenEndedLoan = !editingLoan.interestDurationMonths || editingLoan.interestDurationMonths <= 0;
    const cleanDur = isOpenEndedLoan ? 0 : Math.round(sanitizeCurrency(editingLoan.interestDurationMonths));
    const cleanPaid = sanitizeCurrency(editingLoan.paidSoFar);
    const cleanPlanned = sanitizeCurrency(editingLoan.plannedPaymentThisMonth);

    const monthlyInt = Math.round(cleanPrincipal * (cleanRate / 100) * 100) / 100;
    const totalInt = isOpenEndedLoan ? monthlyInt : Math.round(monthlyInt * cleanDur * 100) / 100;
    const totalRepay = Math.round((cleanPrincipal + totalInt) * 100) / 100;
    const left = Math.max(0, Math.round((totalRepay - cleanPaid) * 100) / 100);

    const updated: LoanRecord = {
      ...editingLoan,
      principal: cleanPrincipal,
      monthlyInterestRatePct: cleanRate,
      interestDurationMonths: cleanDur,
      paidSoFar: cleanPaid,
      plannedPaymentThisMonth: cleanPlanned || (isOpenEndedLoan ? monthlyInt : Math.round((totalRepay / (cleanDur || 1)) * 100) / 100),
      monthlyInterestUsed: monthlyInt,
      totalInterestTerm: totalInt,
      totalToRepay: totalRepay,
      leftToPay: left,
      status: left <= 0 ? 'Settled' : editingLoan.status,
    };

    onUpdateLoan(updated);
    setEditingLoan(null);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = sanitizeCurrency(paymentAmount);
    if (!payModalLoan || cleanAmount <= 0) return;

    onRecordPayment(payModalLoan.id, cleanAmount, paymentMethod, paymentNotes.trim());
    setPayModalLoan(null);
    setPaymentAmount(0);
    setPaymentNotes('');
  };

  // Summary figures
  const totalPrincipalAll = loans.reduce((s, l) => s + l.principal, 0);
  const totalInterestAll = loans.reduce((s, l) => s + l.totalInterestTerm, 0);
  const totalToRepayAll = loans.reduce((s, l) => s + l.totalToRepay, 0);
  const totalPaidAll = loans.reduce((s, l) => s + l.paidSoFar, 0);
  const totalLeftAll = loans.reduce((s, l) => s + l.leftToPay, 0);

  return (
    <div className="space-y-6">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Loans We Owe</h1>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Clear AED Tracker
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Exact principal, interest calculations, and manual balance adjustment in pure AED.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportLoansCSV(loans)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          {canEdit && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Loan
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Total Principal</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            AED {totalPrincipalAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Total Interest Term</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            AED {totalInterestAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Total To Repay</span>
          <span className="font-bold text-slate-900 dark:text-white">
            AED {totalToRepayAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Paid So Far</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            AED {totalPaidAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Remaining Balance</span>
          <span className="font-bold text-rose-600 dark:text-rose-400">
            AED {totalLeftAll.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Visual Loan Progress & Remaining Balance Trendline */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Active Loan Visual Progress & Remaining Balance Trendlines
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                Recharts Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Visual progress bar showing paid vs left to pay and downward trajectory trendline to AED 0.00 for each loan.
            </p>
          </div>

          {/* Loan Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => setSelectedLoanId('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                selectedLoanId === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Loans ({loans.length})
            </button>
            {loans.map((loan) => (
              <button
                key={loan.id}
                onClick={() => setSelectedLoanId(loan.id)}
                className={`px-2.5 py-1 rounded-md transition-colors font-medium font-mono cursor-pointer ${
                  selectedLoanId === loan.id
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {loan.id} ({loan.lender})
              </button>
            ))}
          </div>
        </div>

        {/* Loan Trend Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loans
            .filter((l) => selectedLoanId === 'ALL' || l.id === selectedLoanId)
            .map((loan) => {
              const trendData = computeLoanTrendData(loan);
              const paidPct = loan.totalToRepay > 0 ? (loan.paidSoFar / loan.totalToRepay) * 100 : 0;
              const leftPct = 100 - paidPct;
              const isSettled = loan.leftToPay <= 0;

              const progressBarData = [
                {
                  name: loan.lender,
                  Paid: loan.paidSoFar,
                  Remaining: loan.leftToPay,
                },
              ];

              return (
                <div
                  key={loan.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4"
                >
                  {/* Top Bar: Lender & Meta */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {loan.id}
                        </span>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">{loan.lender}</h3>
                        <span className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {loan.purpose}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 font-mono">
                        <span>Principal: AED {loan.principal.toFixed(2)}</span>
                        <span>•</span>
                        <span>Rate: {loan.monthlyInterestRatePct}% / mo</span>
                        <span>•</span>
                        <span>{loan.interestDurationMonths} mo</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Remaining Balance</div>
                      <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                        AED {loan.leftToPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isSettled
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {isSettled ? 'Settled' : `${paidPct.toFixed(1)}% Repaid`}
                      </span>
                    </div>
                  </div>

                  {/* 1. Visual Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        Paid: AED {loan.paidSoFar.toFixed(2)} ({paidPct.toFixed(1)}%)
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        Remaining: AED {loan.leftToPay.toFixed(2)} ({leftPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-8 w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200/60 dark:border-slate-700/50 min-w-0">
                      <ResponsiveContainer width="100%" height={32} minWidth={100} minHeight={32} debounce={50}>
                        <BarChart
                          data={progressBarData}
                          layout="vertical"
                          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                        >
                          <XAxis type="number" hide domain={[0, loan.totalToRepay || 1]} />
                          <YAxis type="category" dataKey="name" hide />
                          <Tooltip
                            formatter={(value: any, name: any) => [`AED ${Number(value).toFixed(2)}`, name]}
                            contentStyle={{
                              fontSize: '11px',
                              borderRadius: '8px',
                              backgroundColor: '#1e293b',
                              color: '#fff',
                              border: 'none',
                            }}
                          />
                          <Bar dataKey="Paid" stackId="a" fill="#10b981" radius={[4, 0, 0, 4]} isAnimationActive={false} />
                          <Bar dataKey="Remaining" stackId="a" fill="#f43f5e" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Borrowed: {loan.borrowedDate}</span>
                      <span>Total Obligation: AED {loan.totalToRepay.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* 2. Remaining Balance Trend Line via Recharts */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <TrendingDown className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Remaining Balance Trajectory</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Target: {loan.finalRepaymentDate} (AED 0.00)
                      </span>
                    </div>
                    <div className="h-44 w-full pt-1 min-w-0">
                      <ResponsiveContainer width="100%" height={165} minWidth={100} minHeight={165} debounce={50}>
                        <AreaChart data={trendData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                          <defs>
                            <linearGradient id={`grad-${loan.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickFormatter={(v) => `${v}`}
                            domain={[0, 'auto']}
                          />
                          <Tooltip
                            content={({ active, payload, label }: any) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg border border-slate-700 text-xs font-mono space-y-1">
                                    <div className="font-bold text-slate-200">{label}</div>
                                    <div className="text-rose-400">
                                      Remaining: AED {data.remainingBalance.toFixed(2)}
                                    </div>
                                    <div className="text-emerald-400">
                                      Paid So Far: AED {data.paidAccumulated.toFixed(2)}
                                    </div>
                                    {data.plannedInstallment > 0 && (
                                      <div className="text-slate-400 text-[10px]">
                                        Installment: AED {data.plannedInstallment.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <ReferenceLine
                            y={loan.leftToPay}
                            stroke="#f43f5e"
                            strokeDasharray="4 4"
                            label={{
                              value: `Now: AED ${loan.leftToPay.toFixed(0)}`,
                              position: 'top',
                              fill: '#f43f5e',
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="remainingBalance"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill={`url(#grad-${loan.id})`}
                            dot={{ r: 3, fill: '#4f46e5' }}
                            activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff' }}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Planned This Month: AED {loan.plannedPaymentThisMonth.toFixed(2)}</span>
                      <span>Next Due: {loan.dueDateThisPayment}</span>
                      {!isSettled && canEdit && (
                        <button
                          onClick={() => {
                            setPayModalLoan(loan);
                            setPaymentAmount(loan.plannedPaymentThisMonth || loan.leftToPay);
                          }}
                          className="px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                        >
                          Make Payment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* High-density Table matching Excel columns */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-medium">
            <tr>
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">Lender</th>
              <th className="py-3 px-4">Purpose</th>
              <th className="py-3 px-4 text-right">Principal (AED)</th>
              <th className="py-3 px-4 text-right">Rate / Mo</th>
              <th className="py-3 px-4 text-right">Duration</th>
              <th className="py-3 px-4 text-right">Interest (AED)</th>
              <th className="py-3 px-4 text-right">Total To Repay</th>
              <th className="py-3 px-4 text-right">Paid So Far</th>
              <th className="py-3 px-4 text-right">Left To Pay</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {loans.map((loan) => {
              const isSettled = loan.leftToPay <= 0;
              return (
                <tr key={loan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{loan.id}</td>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-white">{loan.lender}</td>
                  <td className="py-3 px-4 font-sans text-slate-500">{loan.purpose}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                    {loan.principal.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {loan.monthlyInterestRatePct.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {loan.interestDurationMonths} mo
                  </td>
                  <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">
                    {loan.totalInterestTerm.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                    {loan.totalToRepay.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    {loan.paidSoFar.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                    {loan.leftToPay.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{loan.dueDateThisPayment}</td>
                  <td className="py-3 px-4 font-sans">
                    <span
                      className={`text-xs font-semibold ${
                        isSettled
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : loan.status === 'Overdue'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      • {isSettled ? 'Settled' : loan.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-sans">
                    <div className="flex items-center justify-center gap-1.5">
                      {!isSettled && canEdit && (
                        <button
                          onClick={() => {
                            setPayModalLoan(loan);
                            setPaymentAmount(loan.plannedPaymentThisMonth || loan.leftToPay);
                          }}
                          className="px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                          title="Record Payment"
                        >
                          Pay
                        </button>
                      )}
                      {canEdit && (
                        <>
                          <button
                            onClick={() => setEditingLoan({ ...loan })}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Edit Loan Numbers"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteLoan && (
                            <button
                              onClick={() => setDeleteLoanTarget(loan)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Loan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Loan Modal */}
      {editingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Loan {editingLoan.id} ({editingLoan.lender})
              </h3>
              <button onClick={() => setEditingLoan(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Update loan numbers directly. Interest and remaining balances will auto-recalculate in AED.
            </p>
            <form onSubmit={handleSaveEditedLoan} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Lender Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingLoan.lender}
                    onChange={(e) => setEditingLoan({ ...editingLoan, lender: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Purpose
                  </label>
                  <input
                    type="text"
                    value={editingLoan.purpose}
                    onChange={(e) => setEditingLoan({ ...editingLoan, purpose: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Principal (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={editingLoan.principal}
                    onChange={(e) => setEditingLoan({ ...editingLoan, principal: parseFloat(e.target.value) || 0 })}
                    onBlur={() => setEditingLoan({ ...editingLoan, principal: sanitizeCurrency(editingLoan.principal) })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Monthly Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingLoan.monthlyInterestRatePct}
                    onChange={(e) => setEditingLoan({ ...editingLoan, monthlyInterestRatePct: parseFloat(e.target.value) || 0 })}
                    onBlur={() => setEditingLoan({ ...editingLoan, monthlyInterestRatePct: sanitizeCurrency(editingLoan.monthlyInterestRatePct) })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Duration (mo)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editingLoan.interestDurationMonths}
                    onChange={(e) => setEditingLoan({ ...editingLoan, interestDurationMonths: parseInt(e.target.value) || 1 })}
                    onBlur={() => setEditingLoan({ ...editingLoan, interestDurationMonths: Math.max(1, Math.round(sanitizeCurrency(editingLoan.interestDurationMonths))) })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Already Paid So Far (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingLoan.paidSoFar}
                    onChange={(e) => setEditingLoan({ ...editingLoan, paidSoFar: parseFloat(e.target.value) || 0 })}
                    onBlur={() => setEditingLoan({ ...editingLoan, paidSoFar: sanitizeCurrency(editingLoan.paidSoFar) })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Planned This Month (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingLoan.plannedPaymentThisMonth}
                    onChange={(e) => setEditingLoan({ ...editingLoan, plannedPaymentThisMonth: parseFloat(e.target.value) || 0 })}
                    onBlur={() => setEditingLoan({ ...editingLoan, plannedPaymentThisMonth: sanitizeCurrency(editingLoan.plannedPaymentThisMonth) })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Borrowed Date
                  </label>
                  <input
                    type="date"
                    value={editingLoan.borrowedDate}
                    onChange={(e) => setEditingLoan({ ...editingLoan, borrowedDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Final Repayment Date
                  </label>
                  <input
                    type="date"
                    value={editingLoan.finalRepaymentDate}
                    onChange={(e) => setEditingLoan({ ...editingLoan, finalRepaymentDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Notes / Plan Summary
                </label>
                <input
                  type="text"
                  value={editingLoan.notes}
                  onChange={(e) => setEditingLoan({ ...editingLoan, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLoan(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Record Payment for {payModalLoan.lender} ({payModalLoan.id})
            </h3>
            <p className="text-xs text-slate-500">
              Outstanding Balance: <strong className="font-mono text-rose-600">AED {payModalLoan.leftToPay.toFixed(2)}</strong>
            </p>
            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Amount (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payModalLoan.leftToPay}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  onBlur={() => setPaymentAmount(sanitizeCurrency(paymentAmount))}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="Bank Transfer">Bank Transfer (e.g. Emirates NBD)</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Notes / Receipt Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ref #1823 via mobile banking"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalLoan(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Loan Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Family Loan Record</h3>
            <p className="text-xs text-slate-500">
              Interest and total repayment amounts are calculated automatically in pure AED.
            </p>
            <form onSubmit={handleCreateLoan} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Lender / Person
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JANAKA or BANK"
                    value={lender}
                    onChange={(e) => setLender(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Loan Purpose
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Principal (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={principal || ''}
                    onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
                    onBlur={() => setPrincipal(sanitizeCurrency(principal))}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Monthly Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyRatePct}
                    onChange={(e) => setMonthlyRatePct(parseFloat(e.target.value) || 0)}
                    onBlur={() => setMonthlyRatePct(sanitizeCurrency(monthlyRatePct))}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Duration
                    </label>
                    <label className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isOpenEnded}
                        onChange={(e) => setIsOpenEnded(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Open-ended</span>
                    </label>
                  </div>
                  {isOpenEnded ? (
                    <div className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-300 dark:border-emerald-800 truncate">
                      Dynamic ({monthlyRatePct}% / mo)
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(parseInt(e.target.value) || 1)}
                      onBlur={() => setDurationMonths(Math.max(1, Math.round(sanitizeCurrency(durationMonths))))}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                      placeholder="e.g. 5"
                    />
                  )}
                </div>
              </div>
              {/* Real-time Calculation Preview Card */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg space-y-1.5 text-xs font-mono">
                <span className="font-sans font-semibold text-emerald-800 dark:text-emerald-300 block text-[11px]">
                  Automatic Mathematical Breakdown:
                </span>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Monthly Interest:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">AED {calculatedMonthlyInterest.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{isOpenEnded ? 'Dynamic Interest Target:' : `Total Interest for ${durationMonths} month(s):`}</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">AED {calculatedTotalInterest.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                  <span className="font-sans font-bold">Total To Repay:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">AED {calculatedTotalToRepay.toFixed(2)}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Borrowed Date
                  </label>
                  <input
                    type="date"
                    value={borrowedDate}
                    onChange={(e) => setBorrowedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Final Date
                  </label>
                  <input
                    type="date"
                    value={finalDate}
                    onChange={(e) => setFinalDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Agreement Notes
                </label>
                <input
                  type="text"
                  placeholder="Terms, bank account or guarantor info"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Save Loan Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteLoanTarget}
        title={`Delete Loan ${deleteLoanTarget?.id} (${deleteLoanTarget?.lender})`}
        message="Are you sure you want to delete this loan record and its scheduled instalments from the vault?"
        onConfirm={() => {
          if (deleteLoanTarget && onDeleteLoan) {
            onDeleteLoan(deleteLoanTarget.id);
            setDeleteLoanTarget(null);
          }
        }}
        onCancel={() => setDeleteLoanTarget(null)}
      />
    </div>
  );
};
