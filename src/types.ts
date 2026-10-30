export type MemberRole = 'admin' | 'editor' | 'viewer';

export interface FamilyMember {
  id: string;
  name: string;
  role: MemberRole;
  relationship: string;
  pin: string;
  avatarColor: string;
  avatarInitials: string;
}

export interface LoanRecord {
  id: string;
  lender: string;
  purpose: string;
  borrowedDate: string; // DD-MMM-YYYY or YYYY-MM-DD
  principal: number;
  interestStartDate: string;
  finalRepaymentDate: string;
  interestDurationMonths: number;
  monthlyInterestRatePct: number;
  fixedMonthlyInterest?: number;
  monthlyInterestUsed: number;
  totalInterestTerm: number;
  totalToRepay: number;
  paidSoFar: number;
  leftToPay: number;
  plannedPaymentThisMonth: number;
  dueDateThisPayment: string;
  paidThisMonth: number;
  overdueAmount: number;
  status: 'Active' | 'Settled' | 'Overdue';
  notes: string;
  planSummary: string;
  // New Priority & Autofill Duration fields
  autofillDuration?: boolean;
  calculatedMonthsToZero?: number;
  priorityRank?: number; // 1 to 5, where 1 is top priority
}

export interface RepaymentInstallment {
  id: string;
  loanId: string;
  lender: string;
  monthYear: string; // YYYY-MM
  installmentNumber: number;
  plannedAmount: number;
  dueDate: string;
  status: 'Pending' | 'Paid' | 'Overdue';
  paidDate?: string;
  paidAmount?: number;
}

export interface IncomeEntry {
  id: string;
  monthYear: string; // YYYY-MM
  memberId: string;
  source: string;
  category: 'Salary' | 'Freelance' | 'Investment' | 'Rental' | 'Contribution' | 'Other';
  plannedAmount: number;
  actualAmount: number;
  dateReceived: string;
  isRecurring: boolean;
  notes: string;
}

export interface EssentialBill {
  id: string;
  monthYear: string; // YYYY-MM
  name: string;
  category: 'Housing' | 'Utilities' | 'Groceries' | 'Education' | 'Transportation' | 'Healthcare' | 'Telecom';
  amount: number;
  dueDate: string;
  isRecurring: boolean;
  status: 'Pending' | 'Paid';
  paidDate?: string;
  paidByMemberId?: string;
  // Arrears Backlog & Tracking:
  hasArrears?: boolean;
  arrearsAmount?: number; // Total past arrears / backlog in AED
  arrearsPaidSoFar?: number; // Amount paid towards past arrears so far in AED
  arrearsNotes?: string; // Notes on arrears plan or installment agreement
}

export interface RecurringBillTemplate {
  id: string;
  name: string;
  category: 'Housing' | 'Utilities' | 'Groceries' | 'Education' | 'Transportation' | 'Healthcare' | 'Telecom';
  amount: number;
  dueDateDay: number; // 1 to 31
  hasArrears?: boolean;
  arrearsAmount?: number;
  notes?: string;
}

export interface SavingsTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  monthYear: string; // YYYY-MM
  type: 'deposit' | 'withdrawal';
  amount: number;
  notes: string;
  memberId?: string;
}

export interface PaymentCharge {
  id: string;
  date: string;
  monthYear: string;
  category: 'Loan Repayment' | 'Essential' | 'Credit Card' | 'Other Spending' | 'Savings Deposit';
  targetId: string;
  targetName: string;
  amount: number;
  paidByMemberId: string;
  paymentMethod: 'Bank Transfer' | 'Debit Card' | 'Cash' | 'Cheque';
  receiptNotes: string;
}

export interface CreditCard {
  id: string;
  bank: string;
  cardName: string;
  creditLimit: number;
  statementBalance: number;
  minPayment: number;
  dueDate: string;
  apr: number;
  status: 'Current' | 'Overdue';
}

export interface OtherSpending {
  id: string;
  monthYear: string;
  category: 'Dining' | 'Shopping' | 'Vehicle & Salik' | 'Entertainment' | 'Gifts & Charity' | 'Misc';
  description: string;
  amount: number;
  date: string;
  memberId: string;
}

export interface MoneyLent {
  id: string;
  borrower: string;
  borrowerContact?: string;
  hasInterest: boolean;
  dateLent: string;
  principal: number;
  monthlyRatePct?: number;
  monthlyInterestAccrued?: number;
  totalToRecover: number;
  expectedReturnDate: string;
  repaidAmount: number;
  balanceRemaining: number;
  status: 'Active' | 'Repaid' | 'Overdue';
  notes: string;
}

export interface MonthlySavingsGoal {
  monthYear: string;
  targetAmount: number;
  goalTitle: string;
  category: string;
}

export interface AuditIssue {
  id: string;
  sheet: string;
  recordId: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  expectedValue: string | number;
  actualValue: string | number;
  autoFixable: boolean;
  autoFixType?: 'loan-recalc' | 'left-to-pay-recalc' | 'installment-sum' | 'payments-sync';
}

export interface FamilyVaultData {
  version: number;
  currency: 'AED';
  updatedAt: string;
  members: FamilyMember[];
  loans: LoanRecord[];
  installments: RepaymentInstallment[];
  incomes: IncomeEntry[];
  essentials: EssentialBill[];
  payments: PaymentCharge[];
  creditCards: CreditCard[];
  otherSpending: OtherSpending[];
  moneyLent: MoneyLent[];
  savingsGoals: MonthlySavingsGoal[];
  // Extended Features
  savingsTransactions?: SavingsTransaction[];
  recurringTemplates?: RecurringBillTemplate[];
  incomeRollovers?: Record<string, number>; // monthYear -> rollover AED amount
  dismissedReminders?: string[]; // monthYears where monthly review banner was dismissed
}
