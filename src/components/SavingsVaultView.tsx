import React, { useState } from 'react';
import {
  Landmark,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  X,
} from 'lucide-react';
import { SavingsTransaction, FamilyMember } from '../types.ts';
import { sanitizeCurrency } from '../utils/numberSanitizer.ts';

interface SavingsVaultViewProps {
  savingsTransactions: SavingsTransaction[];
  currentMonth: string;
  members: FamilyMember[];
  onAddTransaction: (transaction: SavingsTransaction) => void;
  canEdit: boolean;
  surplusAvailable?: number;
}

export const SavingsVaultView: React.FC<SavingsVaultViewProps> = ({
  savingsTransactions,
  currentMonth,
  members,
  onAddTransaction,
  canEdit,
  surplusAvailable = 0,
}) => {
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Form State
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');
  const [filterType, setFilterType] = useState<'ALL' | 'deposit' | 'withdrawal'>('ALL');

  // Compute Balances
  const totalDeposits = savingsTransactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + sanitizeCurrency(t.amount), 0);

  const totalWithdrawals = savingsTransactions
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + sanitizeCurrency(t.amount), 0);

  const currentAccumulatedBalance = Math.max(0, totalDeposits - totalWithdrawals);

  // Month-specific stats
  const thisMonthDeposits = savingsTransactions
    .filter((t) => t.monthYear === currentMonth && t.type === 'deposit')
    .reduce((sum, t) => sum + sanitizeCurrency(t.amount), 0);

  const thisMonthWithdrawals = savingsTransactions
    .filter((t) => t.monthYear === currentMonth && t.type === 'withdrawal')
    .reduce((sum, t) => sum + sanitizeCurrency(t.amount), 0);

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = sanitizeCurrency(amount);
    if (cleanAmount <= 0) return;

    const newTx: SavingsTransaction = {
      id: `sav-${Date.now()}`,
      date: date || new Date().toISOString().slice(0, 10),
      monthYear: date ? date.slice(0, 7) : currentMonth,
      type: 'deposit',
      amount: cleanAmount,
      notes: notes.trim() || 'Monthly liquidity deposit',
      memberId: selectedMemberId || undefined,
    };

    onAddTransaction(newTx);
    setIsDepositModalOpen(false);
    setAmount(0);
    setNotes('');
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = sanitizeCurrency(amount);
    if (cleanAmount <= 0 || cleanAmount > currentAccumulatedBalance) return;

    const newTx: SavingsTransaction = {
      id: `sav-${Date.now()}`,
      date: date || new Date().toISOString().slice(0, 10),
      monthYear: date ? date.slice(0, 7) : currentMonth,
      type: 'withdrawal',
      amount: cleanAmount,
      notes: notes.trim() || 'Family emergency reserve withdrawal',
      memberId: selectedMemberId || undefined,
    };

    onAddTransaction(newTx);
    setIsWithdrawModalOpen(false);
    setAmount(0);
    setNotes('');
  };

  const handleQuickDepositSurplus = (depositAmount: number) => {
    setAmount(Math.round(depositAmount));
    setNotes(`Surplus allocation for ${currentMonth}`);
    setIsDepositModalOpen(true);
  };

  // Filtered transactions sorted newest first
  const sortedTransactions = [...savingsTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .filter((t) => filterType === 'ALL' || t.type === filterType);

  return (
    <div className="w-full max-w-full space-y-6 min-w-0">
      {/* Header & Prominent Bank Icon Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <Landmark className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Capital Protection & Liquidity
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
                Pure AED
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              Dedicated Savings Vault
            </h1>
            <p className="text-xs text-slate-500">
              Synchronized multi-month reserve buffer with full deposit & withdrawal ledger
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setAmount(0);
                setNotes('');
                setIsWithdrawModalOpen(true);
              }}
              disabled={currentAccumulatedBalance <= 0}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
            <button
              onClick={() => {
                setAmount(0);
                setNotes('');
                setIsDepositModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Deposit into Vault</span>
            </button>
          </div>
        )}
      </div>

      {/* Intelligent Surplus Detection Banner */}
      {surplusAvailable > 50 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-emerald-500/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Intelligent Surplus Detected for {currentMonth}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  +AED {surplusAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Your monthly income exceeds committed expenses and debt obligations. Protect your gains by sweeping a portion into the Savings Vault.
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleQuickDepositSurplus(surplusAvailable * 0.5)}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-emerald-300 dark:border-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                Deposit 50% (AED {Math.round(surplusAvailable * 0.5).toLocaleString()})
              </button>
              <button
                onClick={() => handleQuickDepositSurplus(surplusAvailable)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Deposit All (AED {Math.round(surplusAvailable).toLocaleString()})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Prominent Accumulated Savings Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Main Vault Balance */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400">
              Total Accumulated Vault Balance
            </span>
            <PiggyBank className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
            AED {currentAccumulatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">
            Secure liquidity available for family emergencies and goals
          </p>
        </div>

        {/* Total Inflows into Vault */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Lifetime Deposits</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            AED {totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">
            This Month: <strong className="font-mono text-emerald-600">+AED {thisMonthDeposits.toLocaleString()}</strong>
          </p>
        </div>

        {/* Total Outflows from Vault */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Lifetime Withdrawals</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-700 dark:text-slate-300">
            AED {totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">
            This Month: <strong className="font-mono text-rose-500">-AED {thisMonthWithdrawals.toLocaleString()}</strong>
          </p>
        </div>
      </div>

      {/* Transaction Log & History */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Vault Transaction Ledger ({savingsTransactions.length})
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setFilterType('deposit')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'deposit'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Deposits
            </button>
            <button
              onClick={() => setFilterType('withdrawal')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === 'withdrawal'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Withdrawals
            </button>
          </div>
        </div>

        {sortedTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No savings transactions logged yet. Deposit unspent funds or surplus cash to start building your vault.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden">
            {sortedTransactions.map((tx) => {
              const member = members.find((m) => m.id === tx.memberId);
              const isDeposit = tx.type === 'deposit';

              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isDeposit
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}
                    >
                      {isDeposit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {tx.notes || (isDeposit ? 'Savings Deposit' : 'Vault Withdrawal')}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{tx.date}</span>
                        {member && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                              <span className={`w-1.5 h-1.5 rounded-full ${member.avatarColor}`} />
                              {member.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-bold text-sm ${
                        isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isDeposit ? '+' : '-'}AED {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {isDeposit ? 'Deposit' : 'Withdrawal'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Deposit into Savings Vault</h3>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Deposit Amount (AED) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 2500"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Contributing Member</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.relationship})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Notes / Source of Funds
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly surplus reserve or bonus savings"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={amount <= 0}
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <Minus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Withdraw from Savings Vault</h3>
              </div>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              Max available vault balance to withdraw: <strong>AED {currentAccumulatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Withdrawal Amount (AED) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={currentAccumulatedBalance}
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 1000"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Authorizing Member</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.relationship})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Reason for Withdrawal *
                </label>
                <input
                  type="text"
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Medical emergency or unexpected car repair"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={amount <= 0 || amount > currentAccumulatedBalance}
                  className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
