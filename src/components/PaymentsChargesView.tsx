import React, { useState } from 'react';
import { Plus, Download, Pencil, Trash2, X } from 'lucide-react';
import { PaymentCharge, FamilyMember } from '../types.ts';
import { exportPaymentsCSV } from '../utils/exportTools.ts';
import { sanitizeCurrency } from '../utils/numberSanitizer.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';

interface PaymentsChargesViewProps {
  payments: PaymentCharge[];
  members: FamilyMember[];
  currentMonth: string;
  onAddPayment: (payment: PaymentCharge) => void;
  onUpdatePayment?: (payment: PaymentCharge) => void;
  onDeletePayment?: (paymentId: string) => void;
  canEdit: boolean;
}

export const PaymentsChargesView: React.FC<PaymentsChargesViewProps> = ({
  payments,
  members,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  canEdit,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentCharge | null>(null);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<PaymentCharge | null>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<PaymentCharge['category']>('Loan Repayment');
  const [targetName, setTargetName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paidByMemberId, setPaidByMemberId] = useState(members[0]?.id || 'm1');
  const [paymentMethod, setPaymentMethod] = useState<PaymentCharge['paymentMethod']>('Bank Transfer');
  const [receiptNotes, setReceiptNotes] = useState('');

  const filteredPayments = payments.filter((p) => {
    if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
    return true;
  });

  const totalPayments = filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = sanitizeCurrency(amount);
    if (!targetName.trim() || cleanAmount <= 0) return;
    const newPayment: PaymentCharge = {
      id: `pay-${Date.now()}`,
      date,
      monthYear: date.slice(0, 7),
      category,
      targetId: 'custom',
      targetName: targetName.trim(),
      amount: cleanAmount,
      paidByMemberId,
      paymentMethod,
      receiptNotes: receiptNotes.trim(),
    };
    onAddPayment(newPayment);
    setIsModalOpen(false);
    setTargetName('');
    setAmount(0);
    setReceiptNotes('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !onUpdatePayment) return;
    const cleanAmount = sanitizeCurrency(editingPayment.amount);
    onUpdatePayment({
      ...editingPayment,
      targetName: editingPayment.targetName.trim(),
      amount: cleanAmount,
    });
    setEditingPayment(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Payments & Charges</h1>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Actual Settlement Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of every single payment executed for loans, rent, bills, and card dues in pure AED.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportPaymentsCSV(payments)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          {canEdit && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Strip */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Recorded Outflow</span>
          <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
            AED {totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          <span className="text-slate-500 px-2 font-medium">Category:</span>
          {['ALL', 'Loan Repayment', 'Essential', 'Credit Card', 'Other Spending'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                filterCategory === cat
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-medium">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Paid For / Target</th>
              <th className="py-3 px-4 text-right">Amount (AED)</th>
              <th className="py-3 px-4">Paid By</th>
              <th className="py-3 px-4">Method</th>
              <th className="py-3 px-4">Receipt / Notes</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                  No payment records found for this filter.
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => {
                const member = memberMap.get(p.paidByMemberId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-500">{p.date}</td>
                    <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300 font-medium">
                      • {p.category}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-white">
                      {p.targetName}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                      {p.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-400">
                      {member ? member.name.split(' ')[0] : 'Family'}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500">{p.paymentMethod}</td>
                    <td className="py-3 px-4 font-sans text-slate-400 truncate max-w-[220px]">
                      {p.receiptNotes || '--'}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        {canEdit && onUpdatePayment && (
                          <button
                            onClick={() => setEditingPayment({ ...p })}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Edit Payment"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canEdit && onDeletePayment && (
                          <button
                            onClick={() => setDeletePaymentTarget(p)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Outflow / Charge</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Date Paid
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Loan Repayment">Loan Repayment</option>
                    <option value="Essential">Essential / Bill</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Other Spending">Other Spending</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Recipient / Expense Target Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JANAKA or Carrefour or DEWA"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Amount (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    onBlur={() => setAmount(sanitizeCurrency(amount))}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Paid By (Family Member)
                </label>
                <select
                  value={paidByMemberId}
                  onChange={(e) => setPaidByMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Receipt Notes / Ref #
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer ref #39401"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Payment Entry</h3>
              <button onClick={() => setEditingPayment(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Recipient / Expense Target Name
                </label>
                <input
                  type="text"
                  required
                  value={editingPayment.targetName}
                  onChange={(e) => setEditingPayment({ ...editingPayment, targetName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Amount (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editingPayment.amount}
                    onChange={(e) =>
                      setEditingPayment({ ...editingPayment, amount: parseFloat(e.target.value) || 0 })
                    }
                    onBlur={() =>
                      setEditingPayment({ ...editingPayment, amount: sanitizeCurrency(editingPayment.amount) })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Date Paid
                  </label>
                  <input
                    type="date"
                    value={editingPayment.date}
                    onChange={(e) => setEditingPayment({ ...editingPayment, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={editingPayment.category}
                    onChange={(e: any) => setEditingPayment({ ...editingPayment, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Loan Repayment">Loan Repayment</option>
                    <option value="Essential">Essential / Bill</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Other Spending">Other Spending</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={editingPayment.paymentMethod}
                    onChange={(e: any) =>
                      setEditingPayment({ ...editingPayment, paymentMethod: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Receipt Notes / Ref #
                </label>
                <input
                  type="text"
                  value={editingPayment.receiptNotes}
                  onChange={(e) => setEditingPayment({ ...editingPayment, receiptNotes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
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

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deletePaymentTarget}
        title={`Delete Payment (${deletePaymentTarget?.targetName})`}
        message="Are you sure you want to delete this payment record from the ledger?"
        onConfirm={() => {
          if (deletePaymentTarget && onDeletePayment) {
            onDeletePayment(deletePaymentTarget.id);
            setDeletePaymentTarget(null);
          }
        }}
        onCancel={() => setDeletePaymentTarget(null)}
      />
    </div>
  );
};
