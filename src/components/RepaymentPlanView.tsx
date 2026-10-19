import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { RepaymentInstallment, LoanRecord } from '../types.ts';
import { exportInstallmentsCSV } from '../utils/exportTools.ts';

interface RepaymentPlanViewProps {
  installments: RepaymentInstallment[];
  loans: LoanRecord[];
  currentMonth: string;
  onMarkPaid: (installmentId: string, paidAmount: number, paymentMethod: string) => void;
  canEdit: boolean;
}

export const RepaymentPlanView: React.FC<RepaymentPlanViewProps> = ({
  installments,
  loans,
  currentMonth,
  onMarkPaid,
  canEdit,
}) => {
  const [selectedLoanFilter, setSelectedLoanFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  const filteredInstallments = installments.filter((inst) => {
    if (selectedLoanFilter !== 'ALL' && inst.loanId !== selectedLoanFilter) return false;
    if (selectedStatusFilter !== 'ALL' && inst.status !== selectedStatusFilter) return false;
    return true;
  });

  const totalPlannedSum = filteredInstallments.reduce((acc, i) => acc + i.plannedAmount, 0);
  const totalPaidSum = filteredInstallments
    .filter((i) => i.status === 'Paid')
    .reduce((acc, i) => acc + (i.paidAmount || i.plannedAmount), 0);
  const totalRemainingSum = totalPlannedSum - totalPaidSum;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Repayment Plan</h1>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Instalment Schedules
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Instalment-by-instalment repayment schedule across all active family loans.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportInstallmentsCSV(installments)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Aggregate Strip */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono">
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
            {filteredInstallments.map((inst) => {
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
                    {inst.monthYear} {isCurrentMonth && <span className="text-[10px] text-emerald-600 font-sans font-bold">(Current)</span>}
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
                      {isPaid ? 'Paid' : inst.status}
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
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs font-sans font-medium">✓ Settled</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
