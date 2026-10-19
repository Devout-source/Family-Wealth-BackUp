import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Download,
  Printer,
  Wrench,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { AuditIssue } from '../types.ts';
import { exportAuditIssuesToCSV } from '../utils/mathAudit.ts';
import { triggerPrintReport } from '../utils/exportTools.ts';

interface AuditLogViewProps {
  issues: AuditIssue[];
  onAutoReconcile: () => void;
  onRefreshScan: () => void;
  canEdit: boolean;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  issues,
  onAutoReconcile,
  onRefreshScan,
  canEdit,
}) => {
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const handleExportCSV = () => {
    const csvContent = exportAuditIssuesToCSV(issues);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `family_vault_math_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mathematical Audit & Reconciliation</h1>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                issues.length > 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              {issues.length > 0 ? `${issues.length} Discrepancy Found` : 'All Formulas Balanced'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic integrity scanner checking loan interest formulas, installment sums, and payments ledger parity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onRefreshScan}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-scan Math
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit CSV
          </button>
          <button
            onClick={triggerPrintReport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print PDF Report
          </button>
          {issues.length > 0 && canEdit && (
            <button
              onClick={onAutoReconcile}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              Auto-Reconcile Formulas
            </button>
          )}
        </div>
      </div>

      {/* Audit Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Arithmetic Errors</span>
          <span className="font-bold text-rose-600 dark:text-rose-400 text-base">{errorCount}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Schedule Variances</span>
          <span className="font-bold text-amber-600 dark:text-amber-400 text-base">{warningCount}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-sans">Reconciliation Status</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-base font-sans">
            {issues.length === 0 ? '✓ Zero Errors' : 'Action Required'}
          </span>
        </div>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            100% Mathematical Precision Verified
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All loan interest formulas, principal additions, repayment installment schedules, and payment ledger entries
            align with 0.00 AED variance.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`p-4 rounded-xl border transition-colors ${
                issue.severity === 'error'
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {issue.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{issue.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {issue.sheet}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-6 leading-relaxed">
                    {issue.description}
                  </p>
                </div>
                <div className="pl-6 sm:pl-0 shrink-0 text-left sm:text-right font-mono text-xs">
                  <div className="text-slate-500 text-[10px]">Expected: <strong className="text-emerald-600 dark:text-emerald-400">{issue.expectedValue}</strong></div>
                  <div className="text-slate-500 text-[10px]">Stored: <strong className="text-rose-600 dark:text-rose-400">{issue.actualValue}</strong></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
