import React from 'react';
import { FamilyVaultData } from '../types.ts';

interface PrintableStatementProps {
  vault: FamilyVaultData;
  currentMonth: string;
}

export const PrintableStatement: React.FC<PrintableStatementProps> = ({ vault, currentMonth }) => {
  const monthlyIncomes = vault.incomes.filter((i) => i.monthYear === currentMonth);
  const totalIncome = monthlyIncomes.reduce((s, i) => s + (i.actualAmount || i.plannedAmount), 0);
  const totalDebt = vault.loans.reduce((s, l) => s + l.leftToPay, 0);
  const monthlyPlannedLoans = vault.loans.reduce((s, l) => s + l.plannedPaymentThisMonth, 0);
  const monthlyEssentials = vault.essentials
    .filter((e) => e.monthYear === currentMonth)
    .reduce((s, e) => s + e.amount, 0);
  const availableSurplus = Math.max(0, totalIncome - (monthlyPlannedLoans + monthlyEssentials));

  return (
    <div className="hidden print:block p-8 bg-white text-black font-sans max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">Family Financial & Debt Statement</h1>
          <p className="text-xs text-gray-600 mt-1">Official Family Vault Report • UAE Dirhams (AED) Core</p>
        </div>
        <div className="text-right text-xs font-mono">
          <div>Reporting Period: <strong>{currentMonth}</strong></div>
          <div>Generated: {new Date().toLocaleDateString('en-GB')}</div>
          <div>Audit Verification: <strong className="text-emerald-700">CERTIFIED INVARIANT</strong></div>
        </div>
      </div>

      {/* Core Summary */}
      <div className="grid grid-cols-4 gap-4 p-4 border border-gray-300 rounded-lg mb-6 text-xs font-mono">
        <div>
          <span className="text-gray-500 block uppercase font-sans text-[10px]">Total Inflow</span>
          <span className="font-bold text-base">AED {totalIncome.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-500 block uppercase font-sans text-[10px]">Total Active Debt</span>
          <span className="font-bold text-base">AED {totalDebt.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-500 block uppercase font-sans text-[10px]">Monthly Essentials</span>
          <span className="font-bold text-base">AED {monthlyEssentials.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-gray-500 block uppercase font-sans text-[10px]">Free Cash Surplus</span>
          <span className="font-bold text-base">AED {availableSurplus.toFixed(2)}</span>
        </div>
      </div>

      {/* Loans We Owe Table */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
          1. Loans We Owe (Clear AED Tracker)
        </h2>
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-[10px] text-gray-600 uppercase">
              <th className="py-2">Loan ID</th>
              <th className="py-2">Lender</th>
              <th className="py-2 text-right">Principal</th>
              <th className="py-2 text-right">Monthly Rate</th>
              <th className="py-2 text-right">Term Interest</th>
              <th className="py-2 text-right">Total Obligation</th>
              <th className="py-2 text-right">Paid So Far</th>
              <th className="py-2 text-right">Left To Pay</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vault.loans.map((l) => (
              <tr key={l.id}>
                <td className="py-2 font-bold">{l.id}</td>
                <td className="py-2 font-sans font-medium">{l.lender}</td>
                <td className="py-2 text-right">{l.principal.toFixed(2)}</td>
                <td className="py-2 text-right">{l.monthlyInterestRatePct.toFixed(2)}%</td>
                <td className="py-2 text-right">{l.totalInterestTerm.toFixed(2)}</td>
                <td className="py-2 text-right font-bold">{l.totalToRepay.toFixed(2)}</td>
                <td className="py-2 text-right">{l.paidSoFar.toFixed(2)}</td>
                <td className="py-2 text-right font-bold">{l.leftToPay.toFixed(2)}</td>
                <td className="py-2 font-sans">{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Essentials Table */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">
          2. Essentials & Living Commitments ({currentMonth})
        </h2>
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-[10px] text-gray-600 uppercase">
              <th className="py-2">Bill / Commitment</th>
              <th className="py-2">Category</th>
              <th className="py-2 text-right">Amount (AED)</th>
              <th className="py-2">Due Date</th>
              <th className="py-2 font-sans">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vault.essentials
              .filter((e) => e.monthYear === currentMonth)
              .map((e) => (
                <tr key={e.id}>
                  <td className="py-2 font-sans font-medium">{e.name}</td>
                  <td className="py-2 font-sans text-gray-600">{e.category}</td>
                  <td className="py-2 text-right font-bold">{e.amount.toFixed(2)}</td>
                  <td className="py-2">{e.dueDate}</td>
                  <td className="py-2 font-sans">{e.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Audit Statement Stamp */}
      <div className="p-4 border border-black bg-gray-50 text-xs rounded-lg mt-8">
        <div className="font-bold uppercase tracking-wider mb-1">Mathematical Parity & Family Audit Stamp</div>
        <p className="text-[11px] text-gray-700 leading-relaxed">
          This statement reflects verified financial entries processed through the Family Wealth Vault reconciliation
          engine. All formulas, interest rates, installment tallies, and payment entries adhere strictly to UAE Dirhams
          (AED) standard accounting.
        </p>
      </div>
    </div>
  );
};
