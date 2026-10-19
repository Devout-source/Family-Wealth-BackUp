import React, { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Phone,
} from 'lucide-react';
import { CreditCard as CreditCardType, OtherSpending, MoneyLent, FamilyMember } from '../types.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { sanitizeCurrency } from '../utils/numberSanitizer.ts';

interface CreditCardsAndOtherViewProps {
  creditCards: CreditCardType[];
  otherSpending: OtherSpending[];
  moneyLent: MoneyLent[];
  members: FamilyMember[];
  currentMonth: string;
  onUpdateCreditCardBalance: (cardId: string, newBalance: number) => void;
  onUpdateCreditCard?: (card: CreditCardType) => void;
  onDeleteCreditCard?: (cardId: string) => void;
  onAddCreditCard?: (card: CreditCardType) => void;
  onAddOtherSpending: (item: OtherSpending) => void;
  onUpdateOtherSpending?: (item: OtherSpending) => void;
  onDeleteOtherSpending?: (spendId: string) => void;
  onAddMoneyLent: (item: MoneyLent) => void;
  onUpdateMoneyLent?: (item: MoneyLent) => void;
  onDeleteMoneyLent?: (lentId: string) => void;
  onRecordLentRepayment: (lentId: string, amount: number) => void;
  viewMode: 'credit_cards' | 'other_spending' | 'money_lent';
  canEdit: boolean;
}

export const CreditCardsAndOtherView: React.FC<CreditCardsAndOtherViewProps> = ({
  creditCards,
  otherSpending,
  moneyLent,
  members,
  currentMonth,
  onUpdateCreditCardBalance,
  onUpdateCreditCard,
  onDeleteCreditCard,
  onAddCreditCard,
  onAddOtherSpending,
  onUpdateOtherSpending,
  onDeleteOtherSpending,
  onAddMoneyLent,
  onUpdateMoneyLent,
  onDeleteMoneyLent,
  onRecordLentRepayment,
  viewMode,
  canEdit,
}) => {
  // Modal states
  const [isSpendModalOpen, setIsSpendModalOpen] = useState(false);
  const [isLentModalOpen, setIsLentModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [editingLent, setEditingLent] = useState<MoneyLent | null>(null);
  const [editingSpending, setEditingSpending] = useState<OtherSpending | null>(null);
  const [repayingLent, setRepayingLent] = useState<MoneyLent | null>(null);
  const [repayAmount, setRepayAmount] = useState<number>(0);

  // In-app Delete Confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'card' | 'spending' | 'lent';
    id: string;
    title: string;
  } | null>(null);

  // New Card form
  const [cardBank, setCardBank] = useState('Emirates NBD');
  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState<number>(10000);
  const [cardBalance, setCardBalance] = useState<number>(0);
  const [cardMinPayment, setCardMinPayment] = useState<number>(0);
  const [cardDueDate, setCardDueDate] = useState('');
  const [cardApr, setCardApr] = useState<number>(3.25);

  // Other spend form
  const [spendCategory, setSpendCategory] = useState<OtherSpending['category']>('Dining');
  const [spendDesc, setSpendDesc] = useState('');
  const [spendAmount, setSpendAmount] = useState<number>(0);
  const [spendDate, setSpendDate] = useState(new Date().toISOString().slice(0, 10));
  const [spendMemberId, setSpendMemberId] = useState(members[0]?.id || 'm1');

  // Money lent form
  const [borrower, setBorrower] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');
  const [lentPrincipal, setLentPrincipal] = useState<number>(0);
  const [hasInterest, setHasInterest] = useState(false);
  const [lentRatePct, setLentRatePct] = useState<number>(0);
  const [lentReturnDate, setLentReturnDate] = useState('');
  const [lentNotes, setLentNotes] = useState('');

  const handleCreateSpending = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = sanitizeCurrency(spendAmount);
    if (!spendDesc.trim() || cleanAmount <= 0) return;

    onAddOtherSpending({
      id: `oth-${Date.now()}`,
      monthYear: currentMonth,
      category: spendCategory,
      description: spendDesc.trim(),
      amount: cleanAmount,
      date: spendDate,
      memberId: spendMemberId,
    });
    setIsSpendModalOpen(false);
    setSpendDesc('');
    setSpendAmount(0);
  };

  const handleSaveEditedSpending = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpending || !onUpdateOtherSpending) return;
    const cleanAmount = sanitizeCurrency(editingSpending.amount);

    onUpdateOtherSpending({
      ...editingSpending,
      description: editingSpending.description.trim(),
      amount: cleanAmount,
    });
    setEditingSpending(null);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLimit = sanitizeCurrency(cardLimit);
    const cleanBalance = sanitizeCurrency(cardBalance);
    const cleanMinPayment = sanitizeCurrency(cardMinPayment) || Math.round(cleanBalance * 0.05 * 100) / 100;
    const cleanApr = sanitizeCurrency(cardApr);

    if (!cardName.trim() || !onAddCreditCard) return;

    onAddCreditCard({
      id: `cc-${Date.now()}`,
      bank: cardBank.trim(),
      cardName: cardName.trim(),
      creditLimit: cleanLimit,
      statementBalance: cleanBalance,
      minPayment: cleanMinPayment,
      dueDate: cardDueDate.trim() || '25th of month',
      apr: cleanApr,
      status: 'Current',
    });
    setIsAddCardModalOpen(false);
    setCardName('');
    setCardBalance(0);
    setCardMinPayment(0);
  };

  const handleCreateMoneyLent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrincipal = sanitizeCurrency(lentPrincipal);
    const cleanRate = hasInterest ? sanitizeCurrency(lentRatePct) : 0;
    if (!borrower.trim() || cleanPrincipal <= 0) return;

    const totalToRecover = hasInterest
      ? Math.round(cleanPrincipal * (1 + (cleanRate / 100) * 3) * 100) / 100
      : cleanPrincipal;

    onAddMoneyLent({
      id: `ml-${Date.now()}`,
      borrower: borrower.trim(),
      borrowerContact: borrowerContact.trim() || undefined,
      hasInterest,
      dateLent: new Date().toISOString().slice(0, 10),
      principal: cleanPrincipal,
      monthlyRatePct: hasInterest ? cleanRate : undefined,
      totalToRecover,
      expectedReturnDate: lentReturnDate.trim() || 'Flexible',
      repaidAmount: 0,
      balanceRemaining: totalToRecover,
      status: 'Active',
      notes: lentNotes.trim(),
    });
    setIsLentModalOpen(false);
    setBorrower('');
    setBorrowerContact('');
    setLentPrincipal(0);
    setLentNotes('');
  };

  const handleSaveEditedLent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLent || !onUpdateMoneyLent) return;
    const principal = sanitizeCurrency(editingLent.principal);
    const rate = editingLent.hasInterest ? sanitizeCurrency(editingLent.monthlyRatePct || 0) : 0;
    const repaid = sanitizeCurrency(editingLent.repaidAmount);

    const totalToRecover = editingLent.hasInterest
      ? Math.round(principal * (1 + (rate / 100) * 3) * 100) / 100
      : principal;
    const balanceRemaining = Math.max(0, Math.round((totalToRecover - repaid) * 100) / 100);

    const updated: MoneyLent = {
      ...editingLent,
      borrower: editingLent.borrower.trim(),
      principal,
      monthlyRatePct: editingLent.hasInterest ? rate : undefined,
      repaidAmount: repaid,
      totalToRecover,
      balanceRemaining,
      status: balanceRemaining <= 0 ? 'Repaid' : 'Active',
    };
    onUpdateMoneyLent(updated);
    setEditingLent(null);
  };

  const handleConfirmRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = sanitizeCurrency(repayAmount);
    if (!repayingLent || cleanAmount <= 0) return;

    onRecordLentRepayment(repayingLent.id, cleanAmount);
    setRepayingLent(null);
    setRepayAmount(0);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'card' && onDeleteCreditCard) {
      onDeleteCreditCard(deleteTarget.id);
    } else if (deleteTarget.type === 'spending' && onDeleteOtherSpending) {
      onDeleteOtherSpending(deleteTarget.id);
    } else if (deleteTarget.type === 'lent' && onDeleteMoneyLent) {
      onDeleteMoneyLent(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  // 1. Credit Cards View
  if (viewMode === 'credit_cards') {
    const totalBalance = creditCards.reduce((s, c) => s + c.statementBalance, 0);
    const totalLimit = creditCards.reduce((s, c) => s + c.creditLimit, 0);
    const totalMinDue = creditCards.reduce((s, c) => s + c.minPayment, 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Credit Card Tracker</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Limits, statement balances, APR rates, and minimum payments in pure AED.
            </p>
          </div>
          {canEdit && onAddCreditCard && (
            <button
              onClick={() => setIsAddCardModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Credit Card
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Total Statement Balances</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 text-base">
              AED {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Aggregate Credit Limit</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-base">
              AED {totalLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Total Minimum Payments Due</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 text-base">
              AED {totalMinDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {creditCards.map((card) => {
            const utilizationPct = Math.round((card.statementBalance / (card.creditLimit || 1)) * 100);
            return (
              <div
                key={card.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">
                      {card.bank}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{card.cardName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 font-medium">
                      APR: {card.apr}% / mo
                    </span>
                    {canEdit && onDeleteCreditCard && (
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            type: 'card',
                            id: card.id,
                            title: `Delete Credit Card (${card.cardName})`,
                          })
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-sans">Statement Balance</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      AED {card.statementBalance.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-sans">Minimum Due</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                      AED {card.minPayment.toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 flex justify-between">
                    <span className="text-slate-500 text-[11px] font-sans">Payment Due Date:</span>
                    <span className="text-slate-800 dark:text-slate-200">{card.dueDate}</span>
                  </div>
                </div>

                {/* Utilization meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Credit Limit Utilization</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {utilizationPct}% (AED {card.creditLimit.toFixed(2)} limit)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        utilizationPct > 60 ? 'bg-rose-500' : utilizationPct > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, utilizationPct)}%` }}
                    />
                  </div>
                </div>

                {canEdit && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setEditingCard({ ...card })}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit Card Numbers
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Card Modal */}
        {isAddCardModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Family Credit Card</h3>
                <button onClick={() => setIsAddCardModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateCard} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Bank</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Emirates NBD, ADCB"
                      value={cardBank}
                      onChange={(e) => setCardBank(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Card Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Titanium CashPlus"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Limit (AED)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={cardLimit || ''}
                      onChange={(e) => setCardLimit(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Balance (AED)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cardBalance || ''}
                      onChange={(e) => setCardBalance(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Due Date</label>
                    <input
                      type="text"
                      placeholder="e.g. 26th of month"
                      value={cardDueDate}
                      onChange={(e) => setCardDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">APR % / mo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cardApr || ''}
                      onChange={(e) => setCardApr(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Min Pay (AED)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Auto: 5%"
                      value={cardMinPayment || ''}
                      onChange={(e) => setCardMinPayment(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCardModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                  >
                    Save Card
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Card Modal */}
        {editingCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Card: {editingCard.cardName}
                </h3>
                <button onClick={() => setEditingCard(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Statement Balance (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCard.statementBalance}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        statementBalance: parseFloat(e.target.value) || 0,
                        minPayment: Math.round((parseFloat(e.target.value) || 0) * 0.05 * 100) / 100,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Credit Limit (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingCard.creditLimit}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          creditLimit: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Minimum Due (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingCard.minPayment}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          minPayment: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCard(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateCreditCard) onUpdateCreditCard(editingCard);
                      else onUpdateCreditCardBalance(editingCard.id, editingCard.statementBalance);
                      setEditingCard(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDeleteModal
          isOpen={!!deleteTarget}
          title={deleteTarget?.title || 'Delete Item'}
          message="Are you sure you want to delete this record? This action will remove it from the vault and update all calculations."
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    );
  }

  // 2. Other Spending View
  if (viewMode === 'other_spending') {
    const monthlySpending = otherSpending.filter((s) => s.monthYear === currentMonth);
    const totalSpent = monthlySpending.reduce((s, item) => s + item.amount, 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Other & Discretionary Spending</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Dining, fuel, shopping, and everyday variable family expenses for {currentMonth}.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setIsSpendModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Total Discretionary ({currentMonth})
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              AED {totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">{monthlySpending.length} transactions</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount (AED)</th>
                <th className="py-3 px-4">Spent By</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {monthlySpending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    No discretionary expenses logged for {currentMonth}. Click "+ Add Expense" above.
                  </td>
                </tr>
              ) : (
                monthlySpending.map((s) => {
                  const member = members.find((m) => m.id === s.memberId);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-500">{s.date}</td>
                      <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300 font-medium">
                        • {s.category}
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-white">
                        {s.description}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {s.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-400">
                        {member ? member.name.split(' ')[0] : 'Family Member'}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEdit && onUpdateOtherSpending && (
                            <button
                              onClick={() => setEditingSpending({ ...s })}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="Edit Expense"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && onDeleteOtherSpending && (
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'spending',
                                  id: s.id,
                                  title: `Delete Expense (${s.description})`,
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Expense"
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

        {/* Add Spending Modal */}
        {isSpendModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Discretionary Expense</h3>
                <button onClick={() => setIsSpendModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateSpending} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekend dinner or family pharmacy"
                    value={spendDesc}
                    onChange={(e) => setSpendDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Category
                    </label>
                    <select
                      value={spendCategory}
                      onChange={(e: any) => setSpendCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="Dining">Dining & Food</option>
                      <option value="Shopping">Shopping & Apparel</option>
                      <option value="Vehicle & Salik">Vehicle Fuel & Salik</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Gifts & Charity">Gifts & Charity</option>
                      <option value="Misc">Miscellaneous</option>
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
                      value={spendAmount || ''}
                      onChange={(e) => setSpendAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={spendDate}
                      onChange={(e) => setSpendDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Member
                    </label>
                    <select
                      value={spendMemberId}
                      onChange={(e) => setSpendMemberId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSpendModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                  >
                    Save Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Spending Modal */}
        {editingSpending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Expense</h3>
                <button onClick={() => setEditingSpending(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveEditedSpending} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSpending.description}
                    onChange={(e) => setEditingSpending({ ...editingSpending, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Category
                    </label>
                    <select
                      value={editingSpending.category}
                      onChange={(e: any) => setEditingSpending({ ...editingSpending, category: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="Dining">Dining & Food</option>
                      <option value="Shopping">Shopping & Apparel</option>
                      <option value="Vehicle & Salik">Vehicle Fuel & Salik</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Gifts & Charity">Gifts & Charity</option>
                      <option value="Misc">Miscellaneous</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                      Amount (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingSpending.amount}
                      onChange={(e) =>
                        setEditingSpending({ ...editingSpending, amount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingSpending(null)}
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

        <ConfirmDeleteModal
          isOpen={!!deleteTarget}
          title={deleteTarget?.title || 'Delete Expense'}
          message="Are you sure you want to delete this expense entry? This cannot be undone."
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    );
  }

  // 3. Money Lent Out View
  const totalLentBalance = moneyLent.reduce((s, m) => s + m.balanceRemaining, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Money Lent Out (Clear AED)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Loans extended by family members to colleagues or relatives. Manage borrower contacts, interest, and repayments.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsLentModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Loan Lent
          </button>
        )}
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Outstanding Capital</span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            AED {totalLentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <span className="text-xs text-slate-500 font-mono">{moneyLent.length} active borrower(s)</span>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-medium">
            <tr>
              <th className="py-3 px-4">Borrower & Contact</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4 text-right">Principal (AED)</th>
              <th className="py-3 px-4 text-right">Monthly Rate</th>
              <th className="py-3 px-4 text-right">Total Recoverable</th>
              <th className="py-3 px-4 text-right">Repaid</th>
              <th className="py-3 px-4 text-right">Balance Due</th>
              <th className="py-3 px-4">Expected Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {moneyLent.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                  No money lent records found. Click "+ Record Loan Lent" above to add borrower.
                </td>
              </tr>
            ) : (
              moneyLent.map((ml) => {
                const isSettled = ml.balanceRemaining <= 0;
                return (
                  <tr key={ml.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-slate-900 dark:text-white">{ml.borrower}</div>
                      {ml.borrowerContact ? (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{ml.borrowerContact}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">No phone stored</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500">
                      {ml.hasInterest ? 'Interest-bearing' : 'No Interest'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                      {ml.principal.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                      {ml.hasInterest ? `${ml.monthlyRatePct}%` : '0%'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {ml.totalToRecover.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                      {ml.repaidAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                      {ml.balanceRemaining.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{ml.expectedReturnDate}</td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`text-xs font-semibold ${
                          isSettled ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {isSettled ? 'Repaid' : ml.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        {!isSettled && canEdit && (
                          <button
                            onClick={() => {
                              setRepayingLent(ml);
                              setRepayAmount(ml.balanceRemaining);
                            }}
                            className="px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded transition-colors cursor-pointer"
                            title="Record Repayment"
                          >
                            Repay
                          </button>
                        )}
                        {canEdit && onUpdateMoneyLent && (
                          <button
                            onClick={() => setEditingLent({ ...ml })}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Edit Borrower & Loan Terms"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canEdit && onDeleteMoneyLent && (
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: 'lent',
                                id: ml.id,
                                title: `Delete Loan to ${ml.borrower}`,
                              })
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Borrower Record"
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

      {/* Record Loan Lent Modal */}
      {isLentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Money Lent</h3>
              <button onClick={() => setIsLentModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMoneyLent} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Borrower Name / Contact Person
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmed Mansour or Cousin Rashid"
                  value={borrower}
                  onChange={(e) => setBorrower(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +971 50 123 4567"
                  value={borrowerContact}
                  onChange={(e) => setBorrowerContact(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Principal (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={lentPrincipal || ''}
                    onChange={(e) => setLentPrincipal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Expected Return Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 15-Nov-2026 or Flexible"
                    value={lentReturnDate}
                    onChange={(e) => setLentReturnDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={hasInterest}
                    onChange={(e) => setHasInterest(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 cursor-pointer"
                  />
                  <span>Interest-bearing arrangement</span>
                </label>
                {hasInterest && (
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Monthly Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={lentRatePct || ''}
                      onChange={(e) => setLentRatePct(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Friendly bridge loan"
                  value={lentNotes}
                  onChange={(e) => setLentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLentModalOpen(false)}
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

      {/* Edit Loan Lent Modal */}
      {editingLent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Borrower: {editingLent.borrower}
              </h3>
              <button onClick={() => setEditingLent(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditedLent} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Borrower Name
                </label>
                <input
                  type="text"
                  required
                  value={editingLent.borrower}
                  onChange={(e) => setEditingLent({ ...editingLent, borrower: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={editingLent.borrowerContact || ''}
                  onChange={(e) => setEditingLent({ ...editingLent, borrowerContact: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Principal (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={editingLent.principal}
                    onChange={(e) =>
                      setEditingLent({ ...editingLent, principal: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Repaid to Date (AED)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingLent.repaidAmount}
                    onChange={(e) =>
                      setEditingLent({ ...editingLent, repaidAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold text-emerald-600"
                  />
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingLent.hasInterest}
                    onChange={(e) => setEditingLent({ ...editingLent, hasInterest: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 cursor-pointer"
                  />
                  <span>Interest-bearing arrangement</span>
                </label>
                {editingLent.hasInterest && (
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Monthly Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingLent.monthlyRatePct || 0}
                      onChange={(e) =>
                        setEditingLent({ ...editingLent, monthlyRatePct: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Expected Date
                  </label>
                  <input
                    type="text"
                    value={editingLent.expectedReturnDate}
                    onChange={(e) => setEditingLent({ ...editingLent, expectedReturnDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Notes</label>
                  <input
                    type="text"
                    value={editingLent.notes}
                    onChange={(e) => setEditingLent({ ...editingLent, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLent(null)}
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

      {/* In-App Repayment Modal */}
      {repayingLent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Repayment from {repayingLent.borrower}
              </h3>
              <button onClick={() => setRepayingLent(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmRepayment} className="space-y-3.5">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between text-xs font-mono">
                <span className="text-slate-500 font-sans">Remaining Balance:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  AED {repayingLent.balanceRemaining.toFixed(2)}
                </span>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Amount Received (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={repayingLent.balanceRemaining}
                  required
                  value={repayAmount || ''}
                  onChange={(e) => setRepayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRepayingLent(null)}
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

      {/* Confirmation Modal for Deletions */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.title || 'Delete Record'}
        message="Are you sure you want to delete this contact / borrower record? This will adjust your family ledger accordingly."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
