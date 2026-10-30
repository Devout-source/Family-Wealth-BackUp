import React, { useState } from 'react';
import { Pencil, Trash2, Plus, AlertCircle, CheckCircle2, X, BookmarkCheck, Copy, Sparkles } from 'lucide-react';
import { EssentialBill, FamilyMember, RecurringBillTemplate } from '../types.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { sanitizeCurrency } from '../utils/numberSanitizer.ts';

export interface EssentialsViewProps {
  essentials: EssentialBill[];
  currentMonth: string;
  members: FamilyMember[];
  templates?: RecurringBillTemplate[];
  onAddEssential?: (bill: EssentialBill) => void;
  onUpdateEssential?: (bill: EssentialBill) => void;
  onDeleteEssential?: (billId: string) => void;
  onMarkPaid: (id: string, date: string) => void;
  onRecordArrearsPayment?: (billId: string, amount: number, paymentMethod: string, notes: string) => void;
  onSaveTemplate?: (template: RecurringBillTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onApplyTemplates?: () => void;
  canEdit?: boolean;
  availableMoney?: number;
}

export const EssentialsView: React.FC<EssentialsViewProps> = ({
  essentials,
  currentMonth,
  templates = [],
  onAddEssential,
  onUpdateEssential,
  onDeleteEssential,
  onMarkPaid,
  onRecordArrearsPayment,
  onSaveTemplate,
  onDeleteTemplate,
  onApplyTemplates,
  canEdit = true,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<EssentialBill | null>(null);
  const [deleteBillTarget, setDeleteBillTarget] = useState<EssentialBill | null>(null);
  const [arrearsBillTarget, setArrearsBillTarget] = useState<EssentialBill | null>(null);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [templateSavedToast, setTemplateSavedToast] = useState<string | null>(null);

  // Add form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<EssentialBill['category']>('Housing');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState('2026-10-10');
  const [hasArrears, setHasArrears] = useState(false);
  const [arrearsAmount, setArrearsAmount] = useState<number>(0);

  // Arrears Payment form state
  const [payArrearsAmount, setPayArrearsAmount] = useState<number>(0);
  const [payArrearsMethod, setPayArrearsMethod] = useState('Bank Transfer');
  const [payArrearsNotes, setPayArrearsNotes] = useState('');

  const totalMonthlyEssentials = essentials.reduce((acc, e) => acc + e.amount, 0);
  const totalArrearsBacklog = essentials.reduce((acc, e) => {
    if (e.hasArrears) {
      const remaining = Math.max(0, (e.arrearsAmount || 0) - (e.arrearsPaidSoFar || 0));
      return acc + remaining;
    }
    return acc;
  }, 0);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = sanitizeCurrency(amount);
    const cleanArrears = hasArrears ? sanitizeCurrency(arrearsAmount) : 0;
    if (!name.trim() || cleanAmount <= 0 || !onAddEssential) return;

    const newBill: EssentialBill = {
      id: `ess-${Date.now()}`,
      monthYear: currentMonth,
      name: name.trim(),
      category,
      amount: cleanAmount,
      dueDate,
      isRecurring: true,
      status: 'Pending',
      hasArrears,
      arrearsAmount: cleanArrears,
      arrearsPaidSoFar: 0,
      arrearsNotes: hasArrears ? 'Backlog pending repayment' : undefined,
    };

    onAddEssential(newBill);
    setIsAddModalOpen(false);
    setName('');
    setAmount(0);
    setHasArrears(false);
    setArrearsAmount(0);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill || !onUpdateEssential) return;
    const cleanAmount = sanitizeCurrency(editingBill.amount);
    const cleanArrears = editingBill.hasArrears ? sanitizeCurrency(editingBill.arrearsAmount) : 0;
    const cleanArrearsPaid = editingBill.hasArrears ? sanitizeCurrency(editingBill.arrearsPaidSoFar) : 0;
    onUpdateEssential({
      ...editingBill,
      name: editingBill.name.trim(),
      amount: cleanAmount,
      arrearsAmount: cleanArrears,
      arrearsPaidSoFar: cleanArrearsPaid,
    });
    setEditingBill(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteBillTarget || !onDeleteEssential) return;
    onDeleteEssential(deleteBillTarget.id);
    setDeleteBillTarget(null);
  };

  const handleArrearsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanArrearsPay = sanitizeCurrency(payArrearsAmount);
    if (!arrearsBillTarget || cleanArrearsPay <= 0 || !onRecordArrearsPayment) return;
    onRecordArrearsPayment(
      arrearsBillTarget.id,
      cleanArrearsPay,
      payArrearsMethod,
      payArrearsNotes.trim() || 'Arrears backlog settlement'
    );
    setArrearsBillTarget(null);
    setPayArrearsAmount(0);
    setPayArrearsNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Summary Cards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Essential Living & Household Bills
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track mandatory family living expenses, housing, utilities, groceries, and historical arrears backlogs in AED.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canEdit && onApplyTemplates && templates && templates.length > 0 && (
            <button
              onClick={onApplyTemplates}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold rounded-xl transition cursor-pointer"
              title="Generate this month's bills from saved recurring templates"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Apply Templates ({templates.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsTemplatesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            title="View and configure reusable recurring bill templates"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Templates</span>
          </button>

          {canEdit && onAddEssential && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Essential Bill
            </button>
          )}
        </div>
      </div>

      {templateSavedToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{templateSavedToast}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Monthly Essentials ({currentMonth})
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            AED {totalMonthlyEssentials.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {essentials.length} active household bills
          </span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Active Arrears Backlog
          </span>
          <div className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-300 mt-1">
            AED {totalArrearsBacklog.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 block">
            Past dues awaiting repayment installments
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Settled This Month
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            AED {essentials.filter((e) => e.status === 'Paid').reduce((a, b) => a + b.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {essentials.filter((e) => e.status === 'Paid').length} bills marked paid
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs">
              <th className="py-3.5 px-4">Bill Name</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4 text-right">Monthly (AED)</th>
              <th className="py-3.5 px-4 text-right">Total Arrears</th>
              <th className="py-3.5 px-4 text-right">Paid Arrears</th>
              <th className="py-3.5 px-4 text-right">Remaining Arrears</th>
              <th className="py-3.5 px-4 text-right font-bold">Total Due (AED)</th>
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
            {essentials.map((bill) => {
              const arrTotal = bill.hasArrears ? bill.arrearsAmount || 0 : 0;
              const arrPaid = bill.hasArrears ? bill.arrearsPaidSoFar || 0 : 0;
              const arrRemaining = Math.max(0, arrTotal - arrPaid);
              const netDue = bill.amount + arrRemaining;
              const isPaid = bill.status === 'Paid';

              return (
                <tr key={bill.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span>{bill.name}</span>
                      {bill.hasArrears && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          Arrears
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{bill.category}</td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-900 dark:text-white">
                    {bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-amber-600 dark:text-amber-400">
                    {bill.hasArrears ? arrTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400">
                    {bill.hasArrears ? arrPaid.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                    {arrRemaining > 0 ? arrRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                    {netDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{bill.dueDate}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {isPaid ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {!isPaid && canEdit && (
                        <button
                          onClick={() => onMarkPaid(bill.id, new Date().toISOString().slice(0, 10))}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                          title="Mark Bill as Paid"
                        >
                          Mark Paid
                        </button>
                      )}
                      {bill.hasArrears && arrRemaining > 0 && canEdit && onRecordArrearsPayment && (
                        <button
                          onClick={() => {
                            setArrearsBillTarget(bill);
                            setPayArrearsAmount(Math.min(arrRemaining, 500));
                          }}
                          className="px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer border border-amber-200 dark:border-amber-800"
                          title="Pay Arrears Installment"
                        >
                          Pay Arrears
                        </button>
                      )}
                      {canEdit && onSaveTemplate && (
                        <button
                          onClick={() => {
                            const day = parseInt(bill.dueDate?.slice(-2)) || 15;
                            onSaveTemplate({
                              id: `tmpl-${Date.now()}`,
                              name: bill.name,
                              category: bill.category,
                              amount: bill.amount,
                              dueDateDay: day,
                              hasArrears: bill.hasArrears,
                              arrearsAmount: bill.arrearsAmount,
                              notes: bill.arrearsNotes || 'Saved recurring template',
                            });
                            setTemplateSavedToast(`Saved "${bill.name}" as reusable monthly template!`);
                            setTimeout(() => setTemplateSavedToast(null), 3000);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                          title="Save as Reusable Recurring Template"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canEdit && onUpdateEssential && (
                        <button
                          onClick={() => setEditingBill({ ...bill })}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Edit Bill"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canEdit && onDeleteEssential && (
                        <button
                          onClick={() => setDeleteBillTarget(bill)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Essential Bill Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Add Essential Expense</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bill Name (e.g., DEWA Electricity, Groceries)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="DEWA / Landlord Rent"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EssentialBill['category'])}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  >
                    <option value="Housing">Housing / Rent</option>
                    <option value="Utilities">DEWA / Utilities</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Telecom">Telecom / Wi-Fi</option>
                    <option value="Education">School / Tuition</option>
                    <option value="Healthcare">Medical / Healthcare</option>
                    <option value="Transportation">Transportation / Fuel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Amount (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    onBlur={() => setAmount(sanitizeCurrency(amount))}
                    placeholder="1200.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasArrears}
                    onChange={(e) => setHasArrears(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Includes Historical Arrears / Backlog
                  </span>
                </label>
                {hasArrears && (
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Total Past Arrears Backlog (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={arrearsAmount || ''}
                      onChange={(e) => setArrearsAmount(parseFloat(e.target.value) || 0)}
                      onBlur={() => setArrearsAmount(sanitizeCurrency(arrearsAmount))}
                      placeholder="e.g. 1500"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-xs"
                >
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bill Modal */}
      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">Edit Essential Bill</h3>
              <button
                onClick={() => setEditingBill(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bill Name
                </label>
                <input
                  type="text"
                  required
                  value={editingBill.name}
                  onChange={(e) => setEditingBill({ ...editingBill, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Amount (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingBill.amount}
                    onChange={(e) => setEditingBill({ ...editingBill, amount: parseFloat(e.target.value) || 0 })}
                    onBlur={() => setEditingBill({ ...editingBill, amount: sanitizeCurrency(editingBill.amount) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editingBill.dueDate}
                    onChange={(e) => setEditingBill({ ...editingBill, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingBill.hasArrears || false}
                    onChange={(e) => setEditingBill({ ...editingBill, hasArrears: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Has Arrears Backlog
                  </span>
                </label>
                {editingBill.hasArrears && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">
                        Total Backlog (AED)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingBill.arrearsAmount || 0}
                        onChange={(e) => setEditingBill({ ...editingBill, arrearsAmount: parseFloat(e.target.value) || 0 })}
                        onBlur={() => setEditingBill({ ...editingBill, arrearsAmount: sanitizeCurrency(editingBill.arrearsAmount) })}
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">
                        Paid So Far (AED)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingBill.arrearsPaidSoFar || 0}
                        onChange={(e) => setEditingBill({ ...editingBill, arrearsPaidSoFar: parseFloat(e.target.value) || 0 })}
                        onBlur={() => setEditingBill({ ...editingBill, arrearsPaidSoFar: sanitizeCurrency(editingBill.arrearsPaidSoFar) })}
                        className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBill(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-xs"
                >
                  Update Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Arrears Installment Modal */}
      {arrearsBillTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Record Arrears Payment</h3>
                <p className="text-xs text-slate-500">{arrearsBillTarget.name}</p>
              </div>
              <button
                onClick={() => setArrearsBillTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleArrearsSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                Remaining Backlog: <strong>AED {Math.max(0, (arrearsBillTarget.arrearsAmount || 0) - (arrearsBillTarget.arrearsPaidSoFar || 0)).toFixed(2)}</strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payArrearsAmount || ''}
                  onChange={(e) => setPayArrearsAmount(parseFloat(e.target.value) || 0)}
                  onBlur={() => setPayArrearsAmount(sanitizeCurrency(payArrearsAmount))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={payArrearsMethod}
                  onChange={(e) => setPayArrearsMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={payArrearsNotes}
                  onChange={(e) => setPayArrearsNotes(e.target.value)}
                  placeholder="Installment payment for arrears backlog"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setArrearsBillTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition shadow-xs"
                >
                  Confirm Arrears Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Recurring Bill Templates Modal */}
      {isTemplatesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">Recurring Bill Templates</h3>
              </div>
              <button
                onClick={() => setIsTemplatesModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <p className="text-slate-500">
                Standard monthly expenses like apartment rent, DEWA, and WiFi saved as reusable templates so you never have to manually re-enter them each month.
              </p>

              {(!templates || templates.length === 0) ? (
                <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No recurring templates saved yet. Click the copy icon next to any bill in the table to save it as a template.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{tmpl.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {tmpl.category}
                          </span>
                          <span>•</span>
                          <span>Due day: {tmpl.dueDateDay} of each month</span>
                          {tmpl.notes && <span>• {tmpl.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          AED {tmpl.amount.toFixed(2)}
                        </span>
                        {canEdit && onDeleteTemplate && (
                          <button
                            onClick={() => onDeleteTemplate(tmpl.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Delete Template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                {templates?.length || 0} template(s) saved
              </span>
              <div className="flex items-center gap-2">
                {canEdit && onApplyTemplates && templates && templates.length > 0 && (
                  <button
                    onClick={() => {
                      onApplyTemplates();
                      setIsTemplatesModalOpen(false);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply for {currentMonth}</span>
                  </button>
                )}
                <button
                  onClick={() => setIsTemplatesModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteBillTarget && (
        <ConfirmDeleteModal
          isOpen={true}
          onCancel={() => setDeleteBillTarget(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete ${deleteBillTarget.name}?`}
          message="Are you sure you want to remove this essential bill? This will update your monthly obligation calculations."
        />
      )}
    </div>
  );
};