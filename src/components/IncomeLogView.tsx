import React, { useState } from 'react';
import { Plus, Download, Trash2, Pencil, X } from 'lucide-react';
import { IncomeEntry, FamilyMember } from '../types.ts';
import { exportIncomesCSV } from '../utils/exportTools.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { sanitizeCurrency } from '../utils/numberSanitizer.ts';

interface IncomeLogViewProps {
  incomes: IncomeEntry[];
  members: FamilyMember[];
  currentMonth: string;
  onAddIncome: (income: IncomeEntry) => void;
  onUpdateIncome?: (income: IncomeEntry) => void;
  onDeleteIncome?: (incomeId: string) => void;
  canEdit: boolean;
}

export const IncomeLogView: React.FC<IncomeLogViewProps> = ({
  incomes,
  members,
  currentMonth,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
  canEdit,
}) => {
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);
  const [deleteIncomeTarget, setDeleteIncomeTarget] = useState<IncomeEntry | null>(null);

  // Form state
  const [memberId, setMemberId] = useState(members[0]?.id || 'm1');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState<IncomeEntry['category']>('Salary');
  const [amount, setAmount] = useState<number>(0);
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const filteredIncomes = incomes.filter((i) => {
    if (filterMonth !== 'ALL' && i.monthYear !== filterMonth) return false;
    return true;
  });

  const totalIncome = filteredIncomes.reduce((acc, i) => acc + (i.actualAmount || i.plannedAmount), 0);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = sanitizeCurrency(amount);
    if (!source || cleanAmount <= 0) return;

    const newIncome: IncomeEntry = {
      id: `inc-${Date.now()}`,
      monthYear: filterMonth === 'ALL' ? currentMonth : filterMonth,
      memberId,
      source: source.trim(),
      category,
      plannedAmount: cleanAmount,
      actualAmount: cleanAmount,
      dateReceived,
      isRecurring: true,
      notes: notes.trim(),
    };

    onAddIncome(newIncome);
    setIsModalOpen(false);
    setSource('');
    setAmount(0);
    setNotes('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncome || !onUpdateIncome) return;
    const cleanAmount = sanitizeCurrency(editingIncome.actualAmount);

    onUpdateIncome({
      ...editingIncome,
      actualAmount: cleanAmount,
      plannedAmount: cleanAmount,
    });
    setEditingIncome(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Income Log</h1>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              Family Earnings & Inflows
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Salaries and member contributions in pure AED. Easily edit, adjust, or add new amounts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportIncomesCSV(incomes, members)}
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
              Add Income
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Strip */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
            Total Inflow ({filterMonth === 'ALL' ? 'All Records' : filterMonth})
          </span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            AED {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setFilterMonth(currentMonth)}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              filterMonth === currentMonth
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Current ({currentMonth})
          </button>
          <button
            onClick={() => setFilterMonth('ALL')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              filterMonth === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            All Historical
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-medium">
            <tr>
              <th className="py-3 px-4">Date Received</th>
              <th className="py-3 px-4">Family Member</th>
              <th className="py-3 px-4">Source / Employer</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Actual (AED)</th>
              <th className="py-3 px-4">Recurring</th>
              <th className="py-3 px-4">Notes</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {filteredIncomes.map((inc) => {
              const member = memberMap.get(inc.memberId);
              return (
                <tr key={inc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-500">{inc.dateReceived}</td>
                  <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full ${member?.avatarColor || 'bg-slate-600'} text-white text-[9px] flex items-center justify-center font-bold`}>
                      {member?.avatarInitials || 'M'}
                    </span>
                    <span>{member?.name || 'Family Member'}</span>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300 font-medium">{inc.source}</td>
                  <td className="py-3 px-4 font-sans text-slate-500">• {inc.category}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {inc.actualAmount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-500">
                    {inc.isRecurring ? 'Recurring' : 'One-time'}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-400 truncate max-w-[200px]">{inc.notes || '--'}</td>
                  <td className="py-3 px-4 text-center font-sans">
                    {canEdit && (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingIncome({ ...inc })}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Edit Income"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteIncome && (
                          <button
                            onClick={() => setDeleteIncomeTarget(inc)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Income"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Income Entry</h3>
              <button onClick={() => setEditingIncome(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Family Member
                </label>
                <select
                  value={editingIncome.memberId}
                  onChange={(e) => setEditingIncome({ ...editingIncome, memberId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.relationship})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Source Description
                </label>
                <input
                  type="text"
                  required
                  value={editingIncome.source}
                  onChange={(e) => setEditingIncome({ ...editingIncome, source: e.target.value })}
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
                    value={editingIncome.actualAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingIncome({ ...editingIncome, actualAmount: val, plannedAmount: val });
                    }}
                    onBlur={() => {
                      const clean = sanitizeCurrency(editingIncome.actualAmount);
                      setEditingIncome({ ...editingIncome, actualAmount: clean, plannedAmount: clean });
                    }}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={editingIncome.category}
                    onChange={(e: any) => setEditingIncome({ ...editingIncome, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Investment">Investment</option>
                    <option value="Rental">Rental</option>
                    <option value="Contribution">Contribution</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Date Received
                </label>
                <input
                  type="date"
                  value={editingIncome.dateReceived}
                  onChange={(e) => setEditingIncome({ ...editingIncome, dateReceived: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={editingIncome.notes}
                  onChange={(e) => setEditingIncome({ ...editingIncome, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIncome(null)}
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

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Family Income Entry</h3>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Family Member
                </label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.relationship})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Income Source Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary Salary or Consulting Project"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Investment">Investment</option>
                    <option value="Rental">Rental</option>
                    <option value="Contribution">Contribution</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
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
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Date Received
                </label>
                <input
                  type="date"
                  value={dateReceived}
                  onChange={(e) => setDateReceived(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional details"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  Save Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteIncomeTarget}
        title={`Delete Income Entry (${deleteIncomeTarget?.source})`}
        message="Are you sure you want to delete this income entry from the family ledger?"
        onConfirm={() => {
          if (deleteIncomeTarget && onDeleteIncome) {
            onDeleteIncome(deleteIncomeTarget.id);
            setDeleteIncomeTarget(null);
          }
        }}
        onCancel={() => setDeleteIncomeTarget(null)}
      />
    </div>
  );
};
