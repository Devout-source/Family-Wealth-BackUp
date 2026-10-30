import React, { useState } from 'react';
import { Sliders, X } from 'lucide-react';
import { FamilyVaultData } from '../types.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';
import { sanitizeCurrency } from '../utils/numberSanitizer.ts';

interface QuickNumbersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: FamilyVaultData;
  currentMonth: string;
  onApplyCustomBaseline: (newVault: FamilyVaultData) => void;
}

export const QuickNumbersManagerModal: React.FC<QuickNumbersManagerModalProps> = ({
  isOpen,
  onClose,
  vault,
  currentMonth,
  onApplyCustomBaseline,
}) => {
  // Find current loans or defaults
  const l1 = vault.loans.find((l) => l.id === 'L1') || vault.loans[0];
  const l2 = vault.loans.find((l) => l.id === 'L2') || vault.loans[1];

  // Incomes by member
  const incSampath = vault.incomes.find((i) => i.memberId === 'm1' && i.monthYear === currentMonth) || vault.incomes.find((i) => i.memberId === 'm1');
  const incIrosha = vault.incomes.find((i) => i.memberId === 'm2' && i.monthYear === currentMonth) || vault.incomes.find((i) => i.memberId === 'm2');
  const incSadesh = vault.incomes.find((i) => i.memberId === 'm3' && i.monthYear === currentMonth) || vault.incomes.find((i) => i.memberId === 'm3');

  const rentBill = vault.essentials.find((e) => e.name.toLowerCase().includes('rent'));
  const dewaBill = vault.essentials.find((e) => e.name.toLowerCase().includes('dewa'));

  // Editable state
  const [sampathSalary, setSampathSalary] = useState<number>(incSampath?.actualAmount || 22000);
  const [iroshaSalary, setIroshaSalary] = useState<number>(incIrosha?.actualAmount || 5800);
  const [sadeshSalary, setSadeshSalary] = useState<number>(incSadesh?.actualAmount || 9500);

  const [l1Lender, setL1Lender] = useState<string>(l1?.lender || 'JANAKA');
  const [l1Principal, setL1Principal] = useState<number>(l1?.principal || 3111.47);
  const [l1Rate, setL1Rate] = useState<number>(l1?.monthlyInterestRatePct || 6.0);
  const [l1Duration, setL1Duration] = useState<number>(l1?.interestDurationMonths || 5);
  const [l1Paid, setL1Paid] = useState<number>(l1?.paidSoFar || 0);

  const [l2Lender, setL2Lender] = useState<string>(l2?.lender || 'KALU');
  const [l2Principal, setL2Principal] = useState<number>(l2?.principal || 2000.0);
  const [l2Rate, setL2Rate] = useState<number>(l2?.monthlyInterestRatePct || 7.5);
  const [l2Duration, setL2Duration] = useState<number>(l2?.interestDurationMonths || 1);
  const [l2Paid, setL2Paid] = useState<number>(l2?.paidSoFar || 0);

  const [rentAmt, setRentAmt] = useState<number>(rentBill?.amount || 6500);
  const [dewaAmt, setDewaAmt] = useState<number>(dewaBill?.amount || 820);

  const cc1 = vault.creditCards[0];
  const cc2 = vault.creditCards[1];
  const [cc1Balance, setCc1Balance] = useState<number>(cc1?.statementBalance ?? 0);
  const [cc2Balance, setCc2Balance] = useState<number>(cc2?.statementBalance ?? 0);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    const sSalary = sanitizeCurrency(sampathSalary);
    const iSalary = sanitizeCurrency(iroshaSalary);
    const sdSalary = sanitizeCurrency(sadeshSalary);

    const cleanL1Principal = sanitizeCurrency(l1Principal);
    const cleanL1Rate = sanitizeCurrency(l1Rate);
    const cleanL1Duration = Math.max(1, Math.round(sanitizeCurrency(l1Duration)));
    const cleanL1Paid = sanitizeCurrency(l1Paid);

    const cleanL2Principal = sanitizeCurrency(l2Principal);
    const cleanL2Rate = sanitizeCurrency(l2Rate);
    const cleanL2Duration = Math.max(1, Math.round(sanitizeCurrency(l2Duration)));
    const cleanL2Paid = sanitizeCurrency(l2Paid);

    const cleanRent = sanitizeCurrency(rentAmt);
    const cleanDewa = sanitizeCurrency(dewaAmt);
    const cleanCc1 = sanitizeCurrency(cc1Balance);
    const cleanCc2 = sanitizeCurrency(cc2Balance);

    // Recompute L1 math
    const l1MonthlyInt = Math.round(cleanL1Principal * (cleanL1Rate / 100) * 100) / 100;
    const l1TotalInt = Math.round(l1MonthlyInt * cleanL1Duration * 100) / 100;
    const l1TotalRepay = Math.round((cleanL1Principal + l1TotalInt) * 100) / 100;
    const l1Left = Math.max(0, Math.round((l1TotalRepay - cleanL1Paid) * 100) / 100);

    // Recompute L2 math
    const l2MonthlyInt = Math.round(cleanL2Principal * (cleanL2Rate / 100) * 100) / 100;
    const l2TotalInt = Math.round(l2MonthlyInt * cleanL2Duration * 100) / 100;
    const l2TotalRepay = Math.round((cleanL2Principal + l2TotalInt) * 100) / 100;
    const l2Left = Math.max(0, Math.round((l2TotalRepay - cleanL2Paid) * 100) / 100);

    const updatedLoans = vault.loans.map((loan) => {
      if (loan.id === 'L1') {
        return {
          ...loan,
          lender: l1Lender.toUpperCase(),
          principal: cleanL1Principal,
          monthlyInterestRatePct: cleanL1Rate,
          interestDurationMonths: cleanL1Duration,
          monthlyInterestUsed: l1MonthlyInt,
          totalInterestTerm: l1TotalInt,
          totalToRepay: l1TotalRepay,
          paidSoFar: cleanL1Paid,
          leftToPay: l1Left,
          status: l1Left <= 0 ? ('Settled' as const) : ('Active' as const),
        };
      }
      if (loan.id === 'L2') {
        return {
          ...loan,
          lender: l2Lender.toUpperCase(),
          principal: cleanL2Principal,
          monthlyInterestRatePct: cleanL2Rate,
          interestDurationMonths: cleanL2Duration,
          monthlyInterestUsed: l2MonthlyInt,
          totalInterestTerm: l2TotalInt,
          totalToRepay: l2TotalRepay,
          paidSoFar: cleanL2Paid,
          leftToPay: l2Left,
          status: l2Left <= 0 ? ('Settled' as const) : ('Active' as const),
        };
      }
      return loan;
    });

    const updatedIncomes = vault.incomes.map((inc) => {
      if (inc.memberId === 'm1') {
        return { ...inc, actualAmount: sSalary, plannedAmount: sSalary };
      }
      if (inc.memberId === 'm2') {
        return { ...inc, actualAmount: iSalary, plannedAmount: iSalary };
      }
      if (inc.memberId === 'm3') {
        return { ...inc, actualAmount: sdSalary, plannedAmount: sdSalary };
      }
      return inc;
    });

    const updatedEssentials = vault.essentials.map((ess) => {
      if (ess.id === rentBill?.id) return { ...ess, amount: cleanRent };
      if (ess.id === dewaBill?.id) return { ...ess, amount: cleanDewa };
      return ess;
    });

    const updatedCards = vault.creditCards.map((card, idx) => {
      if (idx === 0) return { ...card, statementBalance: cleanCc1 };
      if (idx === 1) return { ...card, statementBalance: cleanCc2 };
      return card;
    });

    const updatedMembers = vault.members.map((m) => {
      if (m.id === 'm1') return { ...m, monthlyIncome: sSalary };
      if (m.id === 'm2') return { ...m, monthlyIncome: iSalary };
      if (m.id === 'm3') return { ...m, monthlyIncome: sdSalary };
      return m;
    });

    const updatedVault: FamilyVaultData = {
      ...vault,
      members: updatedMembers,
      loans: updatedLoans,
      incomes: updatedIncomes,
      essentials: updatedEssentials,
      creditCards: updatedCards,
      updatedAt: new Date().toISOString(),
    };

    onApplyCustomBaseline(updatedVault);
    onClose();
  };

  const handleExecuteReset = () => {
    const cleanVault: FamilyVaultData = {
      ...vault,
      loans: [],
      installments: [],
      incomes: [],
      essentials: [],
      payments: [],
      creditCards: [],
      otherSpending: [],
      moneyLent: [],
    };
    onApplyCustomBaseline(cleanVault);
    setShowResetConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Customize Family Ledger Numbers
              </h2>
              <p className="text-xs text-slate-500">
                Change your family's real salary, loan amounts, and rent here all at once
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApply} className="space-y-4">
          {/* Incomes & Rent */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
              1. Family Incomes & Essential Bills (AED)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Sampath Salary (Father)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={sampathSalary}
                  onChange={(e) => setSampathSalary(parseFloat(e.target.value) || 0)}
                  onBlur={() => setSampathSalary(sanitizeCurrency(sampathSalary))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Irosha Income (Mother)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={iroshaSalary}
                  onChange={(e) => setIroshaSalary(parseFloat(e.target.value) || 0)}
                  onBlur={() => setIroshaSalary(sanitizeCurrency(iroshaSalary))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Sadesh Salary (Big Bro)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={sadeshSalary}
                  onChange={(e) => setSadeshSalary(parseFloat(e.target.value) || 0)}
                  onBlur={() => setSadeshSalary(sanitizeCurrency(sadeshSalary))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Apartment Rent (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={rentAmt}
                  onChange={(e) => setRentAmt(parseFloat(e.target.value) || 0)}
                  onBlur={() => setRentAmt(sanitizeCurrency(rentAmt))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  DEWA Utilities (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={dewaAmt}
                  onChange={(e) => setDewaAmt(parseFloat(e.target.value) || 0)}
                  onBlur={() => setDewaAmt(sanitizeCurrency(dewaAmt))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* Loan 1 */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
              2. Loan 1 Details ({l1Lender})
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Lender Name
                </label>
                <input
                  type="text"
                  value={l1Lender}
                  onChange={(e) => setL1Lender(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg uppercase font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Principal (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={l1Principal}
                  onChange={(e) => setL1Principal(parseFloat(e.target.value) || 0)}
                  onBlur={() => setL1Principal(sanitizeCurrency(l1Principal))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Rate / Mo (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={l1Rate}
                  onChange={(e) => setL1Rate(parseFloat(e.target.value) || 0)}
                  onBlur={() => setL1Rate(sanitizeCurrency(l1Rate))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Term (mo)
                </label>
                <input
                  type="number"
                  min="1"
                  value={l1Duration}
                  onChange={(e) => setL1Duration(parseInt(e.target.value) || 1)}
                  onBlur={() => setL1Duration(Math.max(1, Math.round(sanitizeCurrency(l1Duration))))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Paid So Far (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={l1Paid}
                  onChange={(e) => setL1Paid(parseFloat(e.target.value) || 0)}
                  onBlur={() => setL1Paid(sanitizeCurrency(l1Paid))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-emerald-600 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Loan 2 */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white block uppercase tracking-wider">
              3. Loan 2 Details ({l2Lender})
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Lender Name
                </label>
                <input
                  type="text"
                  value={l2Lender}
                  onChange={(e) => setL2Lender(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg uppercase font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Principal (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={l2Principal}
                  onChange={(e) => setL2Principal(parseFloat(e.target.value) || 0)}
                  onBlur={() => setL2Principal(sanitizeCurrency(l2Principal))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Rate / Mo (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={l2Rate}
                  onChange={(e) => setL2Rate(parseFloat(e.target.value) || 0)}
                  onBlur={() => setL2Rate(sanitizeCurrency(l2Rate))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Term (mo)
                </label>
                <input
                  type="number"
                  min="1"
                  value={l2Duration}
                  onChange={(e) => setL2Duration(parseInt(e.target.value) || 1)}
                  onBlur={() => setL2Duration(Math.max(1, Math.round(sanitizeCurrency(l2Duration))))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Paid So Far (AED)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={l2Paid}
                  onChange={(e) => setL2Paid(parseFloat(e.target.value) || 0)}
                  onBlur={() => setL2Paid(sanitizeCurrency(l2Paid))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-emerald-600 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Credit Card Balances & Zero-Out Option */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                4. Credit Card Statement Balances (AED)
              </span>
              <button
                type="button"
                onClick={() => {
                  setCc1Balance(0);
                  setCc2Balance(0);
                }}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                title="Set all cards to 0 AED so Total Debt reflects only your personal loans (~5.3k)"
              >
                Zero Out All Credit Cards (Set to AED 0.00)
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  {cc1?.bank || 'Emirates NBD'} ({cc1?.cardName || 'Card 1'}) Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cc1Balance}
                  onChange={(e) => setCc1Balance(parseFloat(e.target.value) || 0)}
                  onBlur={() => setCc1Balance(sanitizeCurrency(cc1Balance))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  {cc2?.bank || 'ADCB'} ({cc2?.cardName || 'Card 2'}) Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cc2Balance}
                  onChange={(e) => setCc2Balance(parseFloat(e.target.value) || 0)}
                  onBlur={() => setCc2Balance(sanitizeCurrency(cc2Balance))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Note: If your family only owes personal loans to Janaka and Kalu (~5.3k) and not credit card debt, zero them out here so your Total Debt displays exactly AED 5,349.91!
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            >
              Reset to Clean Blank Slate
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
              >
                Apply Real Numbers to Ledger
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDeleteModal
        isOpen={showResetConfirm}
        title="Reset Entire Vault to Clean Slate?"
        message="Are you sure you want to reset all loans, bills, incomes, and records to zero? You will be able to enter all your family's exact figures from scratch."
        confirmLabel="Yes, Reset Everything"
        onConfirm={handleExecuteReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
