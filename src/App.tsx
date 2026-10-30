import { useState, useEffect, useMemo, useRef } from 'react';
import { ExternalLink, Flame, X } from 'lucide-react';
import {
  FamilyVaultData,
  FamilyMember,
  LoanRecord,
  RepaymentInstallment,
  IncomeEntry,
  EssentialBill,
  PaymentCharge,
  OtherSpending,
  MoneyLent,
  CreditCard,
} from './types.ts';
import { createBlankVault } from './data/initialRecords.ts';
import { loadEncryptedVault, saveEncryptedVault, getInitialVaultFast, VAULT_PLAIN_STORAGE_KEY, VAULT_STORAGE_KEY } from './utils/cryptoVault.ts';
import { runMathematicalAudit, autoReconcileVault } from './utils/mathAudit.ts';
import { VaultLockScreen } from './components/VaultLockScreen.tsx';
import { Navbar } from './components/Navbar.tsx';
import { NetworkStatusBanner } from './components/NetworkStatusBanner.tsx';
import { VaultLogo } from './components/VaultLogo.tsx';
import { Sidebar, ActiveTab, MobileBottomNav } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { LoansView } from './components/LoansView.tsx';
import { RepaymentPlanView } from './components/RepaymentPlanView.tsx';
import { IncomeLogView } from './components/IncomeLogView.tsx';
import { EssentialsView } from './components/EssentialsView.tsx';
import { PaymentsChargesView } from './components/PaymentsChargesView.tsx';
import { CreditCardsAndOtherView } from './components/CreditCardsAndOtherView.tsx';
import { AiAdvisorView } from './components/AiAdvisorView.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { VaultExportView } from './components/VaultExportView.tsx';
import { SmartDocumentScannerModal } from './components/SmartDocumentScannerModal.tsx';
import { QuickNumbersManagerModal } from './components/QuickNumbersManagerModal.tsx';
import { PrintableStatement } from './components/PrintableStatement.tsx';
import { InstallAppModal } from './components/InstallAppModal.tsx';
import { 
  testFirestoreConnection, 
  listenToFamilyVault, 
  onAuthUserChange,
  signInWithGoogleAccount,
  signOutFromFirebase,
  saveVaultToFirestore
} from './services/firebase.ts';
import type { User } from 'firebase/auth';

export default function App() {
  const [vault, setVault] = useState<FamilyVaultData>(() => {
    const cached = getInitialVaultFast();
    return cached || createBlankVault();
  });
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [activeMember, setActiveMember] = useState<FamilyMember>(() => {
    const cached = getInitialVaultFast();
    return (cached && cached.members && cached.members[0]) || createBlankVault().members[0];
  });
  const [currentMonth, setCurrentMonth] = useState<string>('2026-10');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('family_vault_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {
      // Ignore localStorage access issues
    }
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQuickNumbersModalOpen, setIsQuickNumbersModalOpen] = useState(false);
  const [isInstallAppModalOpen, setIsInstallAppModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firestoreSyncStatus, setFirestoreSyncStatus] = useState<'connected' | 'connecting' | 'offline'>('offline');
  const [isVaultLoading, setIsVaultLoading] = useState<boolean>(false);
  const isCloudSyncInitialized = useRef<boolean>(false);
  const unsubVaultRef = useRef<(() => void) | null>(null);
  const [authGuideModal, setAuthGuideModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    consoleUrl: string;
  } | null>(null);

  // Sync dark mode class on <html> and persist
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('family_vault_theme', 'dark');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('family_vault_theme', 'light');
      } catch {}
    }
  }, [isDarkMode]);

  // Global Network Connectivity Monitor with sticky toast indicators
  useEffect(() => {
    const handleOnline = () => {
      showToast('Internet connection restored. Real-time sync resumed.');
      setFirestoreSyncStatus('connected');
    };
    const handleOffline = () => {
      showToast('Internet connection dropped. Real-time syncing paused. Edits saved locally.');
      setFirestoreSyncStatus('offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load vault from encrypted storage on mount and migrate member names / PINs if needed
  useEffect(() => {
    async function initVault() {
      try {
        let stored = await loadEncryptedVault();
        if (stored && Array.isArray(stored.loans) && Array.isArray(stored.members)) {
          let needsSave = false;
          // Ensure members array is populated
          if (!stored.members || !Array.isArray(stored.members) || stored.members.length === 0) {
            stored.members = createBlankVault().members;
            needsSave = true;
          }
          // Remove legacy birth year PINs (1975, 1981, 2004, 2008, 2012)
          stored.members = stored.members.map((m) => {
            if (['1975', '1981', '2004', '2008', '2012'].includes(m.pin)) {
              needsSave = true;
              const nonBirthPins: Record<string, string> = {
                m1: '7294',
                m2: '6381',
                m3: '5917',
                m4: '4826',
                m5: '3159',
              };
              return { ...m, pin: nonBirthPins[m.id] || '1234' };
            }
            return m;
          });

          // Auto-heal mathematical discrepancies safely without wiping custom numbers
          const issues = runMathematicalAudit(stored);
          if (issues.length > 0) {
            const { updatedVault, fixCount } = autoReconcileVault(stored);
            if (fixCount > 0) {
              stored = updatedVault;
              needsSave = true;
            }
          }

          if (needsSave) {
            await saveEncryptedVault(stored);
          }
          setVault(stored);

          // Default to Devout ("me") or Sampath
          const devout = stored.members.find((m) => m.name === 'Devout');
          if (devout) setActiveMember(devout);
        } else {
          // Initialize clean zero-balance ledger
          const blank = createBlankVault();
          await saveEncryptedVault(blank);
          setVault(blank);
        }
      } catch (err) {
        console.error('Failed to initialize vault on load:', err);
      }
    }
    initVault();
  }, []);

  // Firebase Real-Time Synchronization across Household Devices (onSnapshot)
  useEffect(() => {
    const unsubAuth = onAuthUserChange((u) => {
      setFirebaseUser(u);
      if (u) {
        setFirestoreSyncStatus('connecting');
        setIsVaultLoading(true);
        testFirestoreConnection().catch(() => {});

        // Clean up any existing listener before starting new one
        if (unsubVaultRef.current) {
          unsubVaultRef.current();
          unsubVaultRef.current = null;
        }

        unsubVaultRef.current = listenToFamilyVault(
          (remoteVault) => {
            isCloudSyncInitialized.current = true;
            if (remoteVault && Array.isArray(remoteVault.loans) && Array.isArray(remoteVault.members)) {
              setVault(remoteVault);
              setIsVaultLoading(false);
              // Immediately write to local storage cache for instant parity
              try {
                localStorage.setItem(VAULT_PLAIN_STORAGE_KEY, JSON.stringify(remoteVault));
                localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(remoteVault));
              } catch {}
              setFirestoreSyncStatus('connected');
            }
          },
          (err) => {
            console.warn('[Firestore Live Sync Notice]:', err);
            isCloudSyncInitialized.current = true;
            setIsVaultLoading(false);
            setFirestoreSyncStatus('connecting');
            showToast('Cloud connection notice: Sync connecting. Edits securely stored locally.');
          },
          () => {
            // Fresh or empty cloud database for authenticated user:
            // Initialize with a clean blank zero-balance ledger immediately (never mock or dummy loans)
            isCloudSyncInitialized.current = true;
            const blankVault = createBlankVault();
            setVault(blankVault);
            setIsVaultLoading(false);
            try {
              localStorage.setItem(VAULT_PLAIN_STORAGE_KEY, JSON.stringify(blankVault));
              localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(blankVault));
            } catch {}
            saveVaultToFirestore(blankVault);
            showToast('Initialized new encrypted family ledger in Firestore.');
          }
        );
      } else {
        isCloudSyncInitialized.current = false;
        setFirestoreSyncStatus('offline');
        setIsVaultLoading(false);
        if (unsubVaultRef.current) {
          unsubVaultRef.current();
          unsubVaultRef.current = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubVaultRef.current) {
        unsubVaultRef.current();
        unsubVaultRef.current = null;
      }
    };
  }, []);

  // Ensure changes made on mobile (e.g. updating salary or name) sync active member state instantly
  useEffect(() => {
    if (activeMember && vault?.members) {
      const match = vault.members.find((m) => m.id === activeMember.id);
      if (match && JSON.stringify(match) !== JSON.stringify(activeMember)) {
        setActiveMember(match);
      }
    }
  }, [vault.members]);

  const handleSignInGoogle = async () => {
    try {
      const user = await signInWithGoogleAccount();
      if (user) {
        showToast('Signed in with Google! Firebase real-time sync active.');
      }
    } catch (err: any) {
      if (err?.code === 'auth/configuration-not-found' || err?.code === 'auth/operation-not-allowed') {
        setAuthGuideModal({
          isOpen: true,
          title: 'Google Sign-In Needs Activation in Firebase Console',
          message: 'Firebase project (family-wealth-8033e) is connected, but Google Sign-In must be enabled in your Firebase Console under Sign-in method.',
          consoleUrl: err?.consoleUrl || 'https://console.firebase.google.com/project/family-wealth-8033e/authentication/providers',
        });
        return;
      }
      if (err?.code === 'auth/unauthorized-domain') {
        setAuthGuideModal({
          isOpen: true,
          title: 'Add Authorized Domain to Firebase Console',
          message: err?.message || 'Please add this domain under Firebase Authentication Settings > Authorized domains.',
          consoleUrl: err?.consoleUrl || 'https://console.firebase.google.com/project/family-wealth-8033e/authentication/settings',
        });
        return;
      }
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        showToast(err?.message || 'Failed to sign in with Google');
      }
    }
  };

  const handleSignOutFirebase = async () => {
    try {
      isCloudSyncInitialized.current = false;
      if (unsubVaultRef.current) {
        unsubVaultRef.current();
        unsubVaultRef.current = null;
      }
      await signOutFromFirebase();
      setFirebaseUser(null);
      setFirestoreSyncStatus('offline');
      showToast('Signed out of Firebase. Vault running in local mode.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to sign out');
    }
  };

  // Save vault whenever it changes with write-verification and error alerting
  const updateVault = async (newVault: FamilyVaultData) => {
    newVault.updatedAt = new Date().toISOString();
    setVault(newVault);
    try {
      const result = await saveEncryptedVault(newVault);
      if (!result.cloudSynced && result.error && firebaseUser) {
        showToast(`Cloud Sync Alert: ${result.error}. Saved locally.`);
      }
    } catch (err: any) {
      showToast(`Database write error: ${err?.message || 'Failed to save'}. Saved locally.`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Run mathematical audit continuously
  const auditIssues = useMemo(() => {
    return runMathematicalAudit(vault);
  }, [vault]);

  // Upcoming bills count
  const upcomingBillsCount = useMemo(() => {
    const pendingEssentials = vault.essentials.filter(
      (e) => e.monthYear === currentMonth && e.status === 'Pending'
    ).length;
    const pendingLoans = vault.loans.filter((l) => l.leftToPay > 0 && l.plannedPaymentThisMonth > 0).length;
    return pendingEssentials + pendingLoans;
  }, [vault, currentMonth]);

  // Money Available in Current Month (Inflow - All Planned Obligations)
  const availableMoneyThisMonth = useMemo(() => {
    const totalIncome = vault.incomes
      .filter((i) => i.monthYear === currentMonth)
      .reduce((acc, i) => acc + (i.actualAmount || i.plannedAmount), 0);
    const plannedLoans = vault.loans.reduce((acc, l) => acc + l.plannedPaymentThisMonth, 0);
    const essentials = vault.essentials
      .filter((e) => e.monthYear === currentMonth)
      .reduce((acc, e) => {
        const arrRemaining = e.hasArrears ? Math.max(0, (e.arrearsAmount || 0) - (e.arrearsPaidSoFar || 0)) : 0;
        return acc + e.amount + arrRemaining;
      }, 0);
    const ccMin = vault.creditCards.reduce((acc, c) => acc + c.minPayment, 0);
    return Math.max(0, totalIncome - (plannedLoans + essentials + ccMin));
  }, [vault, currentMonth]);

  // Check if active user can edit (Admin or Editor)
  const canEdit = activeMember.role === 'admin' || activeMember.role === 'editor';

  // 1. Handlers for Loans
  const handleAddLoan = (newLoan: LoanRecord) => {
    const newInstallments: RepaymentInstallment[] = [];
    const [startYear, startMonth] = newLoan.borrowedDate.split('-');
    let currentY = parseInt(startYear) || 2026;
    let currentM = parseInt(startMonth) || 10;
    const duration = newLoan.interestDurationMonths && newLoan.interestDurationMonths > 0 ? newLoan.interestDurationMonths : 0;

    if (duration > 0) {
      const installmentAmount = Math.round((newLoan.totalToRepay / duration) * 100) / 100;
      for (let i = 1; i <= duration; i++) {
        const monthStr = `${currentY}-${String(currentM).padStart(2, '0')}`;
        newInstallments.push({
          id: `inst-${newLoan.id}-${i}-${Date.now()}`,
          loanId: newLoan.id,
          lender: newLoan.lender,
          monthYear: monthStr,
          installmentNumber: i,
          plannedAmount: installmentAmount,
          dueDate: `${monthStr}-06`,
          status: 'Pending',
        });
        currentM += 1;
        if (currentM > 12) {
          currentM = 1;
          currentY += 1;
        }
      }
    } else {
      // Open-ended / null duration: generate dynamic monthly interest target instalment
      const monthlyInt = Math.round(newLoan.principal * (newLoan.monthlyInterestRatePct / 100) * 100) / 100;
      const monthStr = `${currentY}-${String(currentM).padStart(2, '0')}`;
      newInstallments.push({
        id: `inst-${newLoan.id}-dynamic-${Date.now()}`,
        loanId: newLoan.id,
        lender: newLoan.lender,
        monthYear: monthStr,
        installmentNumber: 1,
        plannedAmount: monthlyInt > 0 ? monthlyInt : newLoan.totalToRepay,
        dueDate: `${monthStr}-06`,
        status: 'Pending',
      });
    }

    const updated: FamilyVaultData = {
      ...vault,
      loans: [...vault.loans, newLoan],
      installments: [...vault.installments, ...newInstallments],
    };
    updateVault(updated);
    showToast(`Loan ${newLoan.id} (${newLoan.lender}) added.`);
  };

  const handleUpdateLoan = (updatedLoan: LoanRecord) => {
    const updatedLoans = vault.loans.map((l) => (l.id === updatedLoan.id ? updatedLoan : l));
    const updated: FamilyVaultData = { ...vault, loans: updatedLoans };
    updateVault(updated);
    showToast(`Updated loan ${updatedLoan.id} (${updatedLoan.lender}).`);
  };

  const handleDeleteLoan = (loanId: string) => {
    const updatedLoans = vault.loans.filter((l) => l.id !== loanId);
    const updatedInstallments = vault.installments.filter((i) => i.loanId !== loanId);
    const updated: FamilyVaultData = {
      ...vault,
      loans: updatedLoans,
      installments: updatedInstallments,
    };
    updateVault(updated);
    showToast(`Deleted loan ${loanId}.`);
  };

  const handleRecordLoanPayment = (
    loanId: string,
    amount: number,
    paymentMethod: string,
    notes: string
  ) => {
    const loan = vault.loans.find((l) => l.id === loanId);
    if (!loan) return;

    const updatedLoans = vault.loans.map((l) => {
      if (l.id === loanId) {
        const newPaidSoFar = Math.round((l.paidSoFar + amount) * 100) / 100;
        const newLeftToPay = Math.max(0, Math.round((l.totalToRepay - newPaidSoFar) * 100) / 100);
        return {
          ...l,
          paidSoFar: newPaidSoFar,
          leftToPay: newLeftToPay,
          paidThisMonth: Math.round((l.paidThisMonth + amount) * 100) / 100,
          status: newLeftToPay <= 0 ? ('Settled' as const) : l.status,
        };
      }
      return l;
    });

    const newPayment: PaymentCharge = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      monthYear: currentMonth,
      category: 'Loan Repayment',
      targetId: loanId,
      targetName: `${loan.lender} (${loan.id}) Repayment`,
      amount,
      paidByMemberId: activeMember.id,
      paymentMethod: (paymentMethod as PaymentCharge['paymentMethod']) || 'Bank Transfer',
      receiptNotes: notes || 'Loan settlement payment',
    };

    const updated: FamilyVaultData = {
      ...vault,
      loans: updatedLoans,
      payments: [newPayment, ...vault.payments],
    };
    updateVault(updated);
    showToast(`Recorded payment of AED ${amount.toFixed(2)} for ${loan.lender}.`);
  };

  const handleMarkInstallmentPaid = (installmentId: string, paidAmount: number, paymentMethod: string) => {
    const inst = vault.installments.find((i) => i.id === installmentId);
    if (!inst) return;
    const today = new Date().toISOString().slice(0, 10);

    const updatedInstallments = vault.installments.map((i) => {
      if (i.id === installmentId) {
        return {
          ...i,
          status: 'Paid' as const,
          paidDate: today,
          paidAmount,
        };
      }
      return i;
    });

    const updatedLoans = vault.loans.map((l) => {
      if (l.id === inst.loanId) {
        const newPaid = Math.round((l.paidSoFar + paidAmount) * 100) / 100;
        const newLeft = Math.max(0, Math.round((l.totalToRepay - newPaid) * 100) / 100);
        return {
          ...l,
          paidSoFar: newPaid,
          leftToPay: newLeft,
          status: newLeft <= 0 ? ('Settled' as const) : l.status,
        };
      }
      return l;
    });

    const newPayment: PaymentCharge = {
      id: `pay-inst-${Date.now()}`,
      date: today,
      monthYear: inst.monthYear,
      category: 'Loan Repayment',
      targetId: inst.loanId,
      targetName: `${inst.lender} (Instalment #${inst.installmentNumber})`,
      amount: paidAmount,
      paidByMemberId: activeMember.id,
      paymentMethod: (paymentMethod as PaymentCharge['paymentMethod']) || 'Bank Transfer',
      receiptNotes: `Instalment #${inst.installmentNumber} cleared`,
    };

    const updated: FamilyVaultData = {
      ...vault,
      installments: updatedInstallments,
      loans: updatedLoans,
      payments: [newPayment, ...vault.payments],
    };
    updateVault(updated);
    showToast(`Instalment #${inst.installmentNumber} for ${inst.lender} marked paid.`);
  };

  // 2. Handlers for Incomes
  const handleAddIncome = (income: IncomeEntry) => {
    const updated: FamilyVaultData = {
      ...vault,
      incomes: [income, ...vault.incomes],
    };
    updateVault(updated);
    showToast(`Added income: AED ${income.actualAmount.toFixed(2)}.`);
  };

  const handleUpdateIncome = (income: IncomeEntry) => {
    const updatedIncomes = vault.incomes.map((i) => (i.id === income.id ? income : i));
    const updated: FamilyVaultData = { ...vault, incomes: updatedIncomes };
    updateVault(updated);
    showToast(`Updated income for ${income.source}.`);
  };

  const handleDeleteIncome = (incomeId: string) => {
    const updatedIncomes = vault.incomes.filter((i) => i.id !== incomeId);
    const updated: FamilyVaultData = { ...vault, incomes: updatedIncomes };
    updateVault(updated);
    showToast('Deleted income entry.');
  };

  // 3. Handlers for Essentials
  const handleAddEssential = (bill: EssentialBill) => {
    const updated: FamilyVaultData = {
      ...vault,
      essentials: [bill, ...vault.essentials],
    };
    updateVault(updated);
    showToast(`Added bill: ${bill.name} (AED ${bill.amount.toFixed(2)}).`);
  };

  const handleUpdateEssential = (bill: EssentialBill) => {
    const updatedEssentials = vault.essentials.map((e) => (e.id === bill.id ? bill : e));
    const updated: FamilyVaultData = { ...vault, essentials: updatedEssentials };
    updateVault(updated);
    showToast(`Updated bill ${bill.name}.`);
  };

  const handleDeleteEssential = (billId: string) => {
    const updatedEssentials = vault.essentials.filter((e) => e.id !== billId);
    const updated: FamilyVaultData = { ...vault, essentials: updatedEssentials };
    updateVault(updated);
    showToast('Deleted essential bill.');
  };

  const handleMarkEssentialPaid = (billId: string, paidDate: string) => {
    const bill = vault.essentials.find((e) => e.id === billId);
    if (!bill) return;

    const updatedEssentials = vault.essentials.map((e) => {
      if (e.id === billId) {
        return {
          ...e,
          status: 'Paid' as const,
          paidDate,
          paidByMemberId: activeMember.id,
        };
      }
      return e;
    });

    const newPayment: PaymentCharge = {
      id: `pay-ess-${Date.now()}`,
      date: paidDate,
      monthYear: bill.monthYear,
      category: 'Essential',
      targetId: bill.id,
      targetName: bill.name,
      amount: bill.amount,
      paidByMemberId: activeMember.id,
      paymentMethod: 'Bank Transfer',
      receiptNotes: 'Essential bill cleared',
    };

    const updated: FamilyVaultData = {
      ...vault,
      essentials: updatedEssentials,
      payments: [newPayment, ...vault.payments],
    };
    updateVault(updated);
    showToast(`Settled ${bill.name} (AED ${bill.amount.toFixed(2)}).`);
  };

  const handleRecordArrearsPayment = (
    billId: string,
    amount: number,
    paymentMethod: string,
    notes: string
  ) => {
    const bill = vault.essentials.find((e) => e.id === billId);
    if (!bill) return;

    const updatedEssentials = vault.essentials.map((e) => {
      if (e.id === billId) {
        const newPaidSoFar = Math.round(((e.arrearsPaidSoFar || 0) + amount) * 100) / 100;
        return {
          ...e,
          arrearsPaidSoFar: newPaidSoFar,
        };
      }
      return e;
    });

    const newPayment: PaymentCharge = {
      id: `pay-arr-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      monthYear: currentMonth,
      category: 'Essential',
      targetId: bill.id,
      targetName: `${bill.name} (Arrears Payment)`,
      amount,
      paidByMemberId: activeMember.id,
      paymentMethod: (paymentMethod as PaymentCharge['paymentMethod']) || 'Bank Transfer',
      receiptNotes: notes || 'Arrears backlog settlement installment',
    };

    const updated: FamilyVaultData = {
      ...vault,
      essentials: updatedEssentials,
      payments: [newPayment, ...vault.payments],
    };
    updateVault(updated);
    showToast(`Recorded arrears payment of AED ${amount.toFixed(2)} for ${bill.name}.`);
  };

  // 4. Handlers for Payments & Other
  const handleAddPayment = (payment: PaymentCharge) => {
    const updated: FamilyVaultData = {
      ...vault,
      payments: [payment, ...vault.payments],
    };
    updateVault(updated);
    showToast(`Recorded charge of AED ${payment.amount.toFixed(2)}.`);
  };

  const handleUpdatePayment = (payment: PaymentCharge) => {
    const updated = vault.payments.map((p) => (p.id === payment.id ? payment : p));
    updateVault({ ...vault, payments: updated });
    showToast(`Updated payment of AED ${payment.amount.toFixed(2)}.`);
  };

  const handleDeletePayment = (paymentId: string) => {
    const updated = vault.payments.filter((p) => p.id !== paymentId);
    updateVault({ ...vault, payments: updated });
    showToast('Deleted payment record.');
  };

  const handleUpdateCreditCardBalance = (cardId: string, newBalance: number) => {
    const updatedCards = vault.creditCards.map((c) => {
      if (c.id === cardId) {
        return { ...c, statementBalance: newBalance, minPayment: Math.round(newBalance * 0.05 * 100) / 100 };
      }
      return c;
    });
    const updated: FamilyVaultData = { ...vault, creditCards: updatedCards };
    updateVault(updated);
    showToast(`Updated credit card statement balance to AED ${newBalance.toFixed(2)}.`);
  };

  const handleUpdateCreditCard = (card: CreditCard) => {
    const updatedCards = vault.creditCards.map((c) => (c.id === card.id ? card : c));
    const updated: FamilyVaultData = { ...vault, creditCards: updatedCards };
    updateVault(updated);
    showToast(`Updated card ${card.cardName}.`);
  };

  const handleDeleteCreditCard = (cardId: string) => {
    const updatedCards = vault.creditCards.filter((c) => c.id !== cardId);
    const updated: FamilyVaultData = { ...vault, creditCards: updatedCards };
    updateVault(updated);
    showToast('Deleted credit card.');
  };

  const handleAddCreditCard = (card: CreditCard) => {
    const updated: FamilyVaultData = { ...vault, creditCards: [...vault.creditCards, card] };
    updateVault(updated);
    showToast(`Added ${card.cardName}.`);
  };

  const handleAddOtherSpending = (item: OtherSpending) => {
    const updated: FamilyVaultData = {
      ...vault,
      otherSpending: [item, ...vault.otherSpending],
    };
    updateVault(updated);
    showToast(`Recorded ${item.description} (AED ${item.amount.toFixed(2)}).`);
  };

  const handleUpdateOtherSpending = (item: OtherSpending) => {
    const updated = vault.otherSpending.map((s) => (s.id === item.id ? item : s));
    updateVault({ ...vault, otherSpending: updated });
    showToast(`Updated expense ${item.description}.`);
  };

  const handleDeleteOtherSpending = (spendId: string) => {
    const updated = vault.otherSpending.filter((s) => s.id !== spendId);
    updateVault({ ...vault, otherSpending: updated });
    showToast('Deleted expense.');
  };

  const handleAddMoneyLent = (item: MoneyLent) => {
    const updated: FamilyVaultData = {
      ...vault,
      moneyLent: [item, ...vault.moneyLent],
    };
    updateVault(updated);
    showToast(`Recorded loan to ${item.borrower} (AED ${item.principal.toFixed(2)}).`);
  };

  const handleUpdateMoneyLent = (item: MoneyLent) => {
    const updated = vault.moneyLent.map((m) => (m.id === item.id ? item : m));
    updateVault({ ...vault, moneyLent: updated });
    showToast(`Updated loan terms for ${item.borrower}.`);
  };

  const handleDeleteMoneyLent = (lentId: string) => {
    const updated = vault.moneyLent.filter((m) => m.id !== lentId);
    updateVault({ ...vault, moneyLent: updated });
    showToast('Deleted record.');
  };

  const handleRecordLentRepayment = (lentId: string, amount: number) => {
    const updatedLent = vault.moneyLent.map((ml) => {
      if (ml.id === lentId) {
        const newRepaid = Math.round((ml.repaidAmount + amount) * 100) / 100;
        const newRemaining = Math.max(0, Math.round((ml.totalToRecover - newRepaid) * 100) / 100);
        return {
          ...ml,
          repaidAmount: newRepaid,
          balanceRemaining: newRemaining,
          status: newRemaining <= 0 ? ('Repaid' as const) : ml.status,
        };
      }
      return ml;
    });
    const updated: FamilyVaultData = { ...vault, moneyLent: updatedLent };
    updateVault(updated);
    showToast(`Recorded AED ${amount.toFixed(2)} received from borrower.`);
  };

  // 5. Member PIN Updater
  const handleUpdateMemberPin = (memberId: string, newPin: string) => {
    const updatedMembers = vault.members.map((m) =>
      m.id === memberId ? { ...m, pin: newPin } : m
    );
    const updated: FamilyVaultData = { ...vault, members: updatedMembers };
    updateVault(updated);
    if (activeMember && activeMember.id === memberId) {
      setActiveMember({ ...activeMember, pin: newPin });
    }
    showToast('Confidential PIN successfully saved to vault.');
  };

  // 6. Auto Reconcile Handler
  const handleAutoReconcile = () => {
    const { updatedVault, fixCount } = autoReconcileVault(vault);
    updateVault(updatedVault);
    showToast(`Reconciliation complete: ${fixCount} formulas aligned with 0 errors.`);
  };

  // 7. Smart Document Scanner Application Handler
  const handleApplyExtractedData = (type: string, data: any) => {
    const today = data.detectedDate || new Date().toISOString().slice(0, 10);
    const amount = Number(data.totalAmountAED || 0);
    const name = data.detectedVendorOrLender || 'Scanned Expense';

    if (type === 'loan' && data.loanDetails?.isLoan) {
      const p = data.loanDetails.principalAED || amount;
      const rate = data.loanDetails.monthlyInterestRatePct || 5.0;
      const duration = data.loanDetails.durationMonths || 1;
      const interest = Math.round(p * (rate / 100) * duration * 100) / 100;
      const total = p + interest;

      const newLoan: LoanRecord = {
        id: `L${vault.loans.length + 1}`,
        lender: name.toUpperCase(),
        purpose: 'PERSONAL',
        borrowedDate: today,
        principal: p,
        interestStartDate: today,
        finalRepaymentDate: data.loanDetails.dueDate || today,
        interestDurationMonths: duration,
        monthlyInterestRatePct: rate,
        monthlyInterestUsed: Math.round((interest / duration) * 100) / 100,
        totalInterestTerm: interest,
        totalToRepay: total,
        paidSoFar: 0,
        leftToPay: total,
        plannedPaymentThisMonth: total / duration,
        dueDateThisPayment: data.loanDetails.dueDate || today,
        paidThisMonth: 0,
        overdueAmount: 0,
        status: 'Active',
        notes: `Extracted via smart document scan: ${data.notesAndContext || ''}`,
        planSummary: `${duration} instalment(s) | AED ${total.toFixed(2)}`,
      };
      handleAddLoan(newLoan);
      setActiveTab('loans');
    } else if (type === 'essential_bill') {
      const newBill: EssentialBill = {
        id: `ess-${Date.now()}`,
        monthYear: currentMonth,
        name,
        category: (data.category as EssentialBill['category']) || 'Utilities',
        amount,
        dueDate: data.billDetails?.dueDate || today,
        isRecurring: data.billDetails?.isRecurring ?? true,
        status: 'Pending',
      };
      handleAddEssential(newBill);
      setActiveTab('essentials');
    } else if (type === 'income') {
      const newIncome: IncomeEntry = {
        id: `inc-${Date.now()}`,
        monthYear: currentMonth,
        memberId: activeMember.id,
        source: name,
        category: 'Salary',
        plannedAmount: amount,
        actualAmount: amount,
        dateReceived: today,
        isRecurring: true,
        notes: `Scanned payslip / receipt`,
      };
      handleAddIncome(newIncome);
      setActiveTab('income');
    } else if (type === 'payment_charge') {
      const newPayment: PaymentCharge = {
        id: `pay-${Date.now()}`,
        date: today,
        monthYear: currentMonth,
        category: 'Other Spending',
        targetId: 'scanned',
        targetName: name,
        amount,
        paidByMemberId: activeMember.id,
        paymentMethod: 'Debit Card',
        receiptNotes: data.notesAndContext || 'Scanned payment receipt',
      };
      handleAddPayment(newPayment);
      setActiveTab('payments');
    } else {
      const newOther: OtherSpending = {
        id: `oth-${Date.now()}`,
        monthYear: currentMonth,
        category: 'Shopping',
        description: name,
        amount,
        date: today,
        memberId: activeMember.id,
      };
      handleAddOtherSpending(newOther);
      setActiveTab('other_spending');
    }
  };

  // While verifying and synchronizing authoritative cloud vault, display clean loading state
  if (isVaultLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-pulse border border-emerald-500/30">
          <VaultLogo size="sm" showText={false} />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Synchronizing Family Vault</h2>
          <p className="text-xs text-slate-500">Connecting to encrypted real-time Firestore ledger...</p>
        </div>
      </div>
    );
  }

  // If Vault is locked, display the Lock Screen
  if (isLocked) {
    return (
      <VaultLockScreen
        members={vault.members}
        onUnlock={(member) => {
          setActiveMember(member);
          setIsLocked(false);
        }}
        onUpdateMemberPin={handleUpdateMemberPin}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-300">
      {/* Sticky Network Offline Warning Banner */}
      <NetworkStatusBanner
        firestoreSyncStatus={firestoreSyncStatus}
        isLoggedIn={!!firebaseUser}
        onRetrySync={() => testFirestoreConnection().catch(() => {})}
      />

      {/* Top Navbar */}
      <Navbar
        currentMonth={currentMonth}
        onMonthChange={(m) => setCurrentMonth(m)}
        activeMember={activeMember}
        onLockVault={() => setIsLocked(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenQuickNumbers={() => setIsQuickNumbersModalOpen(true)}
        onOpenInstallApp={() => setIsInstallAppModalOpen(true)}
        firestoreSyncStatus={firestoreSyncStatus}
        firebaseUser={firebaseUser}
        onSignInGoogle={handleSignInGoogle}
        onSignOutFirebase={handleSignOutFirebase}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        auditIssueCount={auditIssues.length}
        onOpenAudit={() => setActiveTab('audit_log')}
        availableMoney={availableMoneyThisMonth}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative w-full max-w-full">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          auditIssueCount={auditIssues.length}
          upcomingDueCount={upcomingBillsCount}
          availableMoney={availableMoneyThisMonth}
          currentMonth={currentMonth}
          onOpenInstallApp={() => setIsInstallAppModalOpen(true)}
          isMobileDrawerOpen={isMobileMenuOpen}
          onCloseMobileDrawer={() => setIsMobileMenuOpen(false)}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-7 xl:p-8 w-full max-w-full lg:max-w-7xl 2xl:max-w-screen-2xl mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              vault={vault}
              currentMonth={currentMonth}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenScanner={() => setIsScannerOpen(true)}
            />
          )}

          {activeTab === 'loans' && (
            <LoansView
              loans={vault.loans}
              onAddLoan={handleAddLoan}
              onUpdateLoan={handleUpdateLoan}
              onDeleteLoan={handleDeleteLoan}
              onRecordPayment={handleRecordLoanPayment}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'repayment_plan' && (
            <RepaymentPlanView
              installments={vault.installments}
              loans={vault.loans}
              incomes={vault.incomes}
              essentials={vault.essentials}
              currentMonth={currentMonth}
              onMarkPaid={handleMarkInstallmentPaid}
              onRecordLoanPayment={handleRecordLoanPayment}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'income' && (
            <IncomeLogView
              incomes={vault.incomes}
              members={vault.members}
              currentMonth={currentMonth}
              onAddIncome={handleAddIncome}
              onUpdateIncome={handleUpdateIncome}
              onDeleteIncome={handleDeleteIncome}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'essentials' && (
            <EssentialsView
              essentials={vault.essentials}
              currentMonth={currentMonth}
              members={vault.members}
              onAddEssential={handleAddEssential}
              onUpdateEssential={handleUpdateEssential}
              onDeleteEssential={handleDeleteEssential}
              onMarkPaid={handleMarkEssentialPaid}
              onRecordArrearsPayment={handleRecordArrearsPayment}
              canEdit={canEdit}
              availableMoney={availableMoneyThisMonth}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsChargesView
              payments={vault.payments}
              members={vault.members}
              currentMonth={currentMonth}
              onAddPayment={handleAddPayment}
              onUpdatePayment={handleUpdatePayment}
              onDeletePayment={handleDeletePayment}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'credit_cards' && (
            <CreditCardsAndOtherView
              creditCards={vault.creditCards}
              otherSpending={vault.otherSpending}
              moneyLent={vault.moneyLent}
              members={vault.members}
              currentMonth={currentMonth}
              onUpdateCreditCardBalance={handleUpdateCreditCardBalance}
              onUpdateCreditCard={handleUpdateCreditCard}
              onDeleteCreditCard={handleDeleteCreditCard}
              onAddCreditCard={handleAddCreditCard}
              onAddOtherSpending={handleAddOtherSpending}
              onUpdateOtherSpending={handleUpdateOtherSpending}
              onDeleteOtherSpending={handleDeleteOtherSpending}
              onAddMoneyLent={handleAddMoneyLent}
              onUpdateMoneyLent={handleUpdateMoneyLent}
              onDeleteMoneyLent={handleDeleteMoneyLent}
              onRecordLentRepayment={handleRecordLentRepayment}
              viewMode="credit_cards"
              canEdit={canEdit}
            />
          )}

          {activeTab === 'other_spending' && (
            <CreditCardsAndOtherView
              creditCards={vault.creditCards}
              otherSpending={vault.otherSpending}
              moneyLent={vault.moneyLent}
              members={vault.members}
              currentMonth={currentMonth}
              onUpdateCreditCardBalance={handleUpdateCreditCardBalance}
              onUpdateCreditCard={handleUpdateCreditCard}
              onDeleteCreditCard={handleDeleteCreditCard}
              onAddCreditCard={handleAddCreditCard}
              onAddOtherSpending={handleAddOtherSpending}
              onUpdateOtherSpending={handleUpdateOtherSpending}
              onDeleteOtherSpending={handleDeleteOtherSpending}
              onAddMoneyLent={handleAddMoneyLent}
              onUpdateMoneyLent={handleUpdateMoneyLent}
              onDeleteMoneyLent={handleDeleteMoneyLent}
              onRecordLentRepayment={handleRecordLentRepayment}
              viewMode="other_spending"
              canEdit={canEdit}
            />
          )}

          {activeTab === 'money_lent' && (
            <CreditCardsAndOtherView
              creditCards={vault.creditCards}
              otherSpending={vault.otherSpending}
              moneyLent={vault.moneyLent}
              members={vault.members}
              currentMonth={currentMonth}
              onUpdateCreditCardBalance={handleUpdateCreditCardBalance}
              onUpdateCreditCard={handleUpdateCreditCard}
              onDeleteCreditCard={handleDeleteCreditCard}
              onAddCreditCard={handleAddCreditCard}
              onAddOtherSpending={handleAddOtherSpending}
              onUpdateOtherSpending={handleUpdateOtherSpending}
              onDeleteOtherSpending={handleDeleteOtherSpending}
              onAddMoneyLent={handleAddMoneyLent}
              onUpdateMoneyLent={handleUpdateMoneyLent}
              onDeleteMoneyLent={handleDeleteMoneyLent}
              onRecordLentRepayment={handleRecordLentRepayment}
              viewMode="money_lent"
              canEdit={canEdit}
            />
          )}

          {activeTab === 'ai_advisor' && (
            <AiAdvisorView
              vault={vault}
              currentMonth={currentMonth}
            />
          )}

          {activeTab === 'audit_log' && (
            <AuditLogView
              issues={auditIssues}
              onAutoReconcile={handleAutoReconcile}
              onRefreshScan={() => {
                showToast('Re-scanned all equations and invariants.');
              }}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'vault_export' && (
            <VaultExportView
              vault={vault}
              onRestoreVault={(restored) => {
                updateVault(restored);
                showToast('Vault restored and synchronized successfully!');
              }}
              canEdit={canEdit}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        onOpenMore={() => setIsMobileMenuOpen(true)}
        upcomingDueCount={upcomingBillsCount}
      />

      {/* Smart OCR Photo Scanner Modal */}
      <SmartDocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        currentMonth={currentMonth}
        onApplyExtractedData={handleApplyExtractedData}
      />

      {/* Quick Numbers Customizer Modal */}
      <QuickNumbersManagerModal
        isOpen={isQuickNumbersModalOpen}
        onClose={() => setIsQuickNumbersModalOpen(false)}
        vault={vault}
        currentMonth={currentMonth}
        onApplyCustomBaseline={(newVault) => {
          updateVault(newVault);
          showToast('Updated family numbers applied across all sheets.');
        }}
      />

      {/* Printable Statement for PDF Export via window.print() */}
      <PrintableStatement vault={vault} currentMonth={currentMonth} />

      {/* Download & Install on Phone Modal */}
      <InstallAppModal
        isOpen={isInstallAppModalOpen}
        onClose={() => setIsInstallAppModalOpen(false)}
        firebaseUser={firebaseUser}
        onSignInGoogle={handleSignInGoogle}
        onSignOutFirebase={handleSignOutFirebase}
      />

      {/* Firebase Auth Setup Guide Modal */}
      {authGuideModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {authGuideModal.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Project: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">family-wealth-8033e</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuthGuideModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {authGuideModal.message}
            </p>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>⚡ How to activate in 30 seconds:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                <li>Click <strong>Open Firebase Console</strong> below.</li>
                <li>Under <strong>Sign-in providers</strong>, click <strong>Google</strong>.</li>
                <li>Toggle <strong>Enable</strong>, select your project support email, and click <strong>Save</strong>.</li>
                <li>(Optional) In <strong>Settings → Authorized domains</strong>, verify your current domain is listed.</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setAuthGuideModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Use Local Vault (No Sign-In Required)
              </button>
              <a
                href={authGuideModal.consoleUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-xs cursor-pointer"
              >
                <span>Open Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-xl shadow-xl border border-slate-700/60 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
