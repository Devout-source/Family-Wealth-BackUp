import { AuditIssue, FamilyVaultData } from '../types.ts';

// Comprehensive mathematical reconciliation audit scanner
export function runMathematicalAudit(vault: FamilyVaultData): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // 1. Audit Loans We Owe
  vault.loans.forEach((loan) => {
    // Interest formula check: principal * (rate / 100) * duration
    const expectedInterest = Math.round(loan.principal * (loan.monthlyInterestRatePct / 100) * loan.interestDurationMonths * 100) / 100;
    const interestDiff = Math.abs(expectedInterest - loan.totalInterestTerm);
    if (interestDiff > 0.1) {
      issues.push({
        id: `audit-loan-interest-${loan.id}`,
        sheet: 'Loans We Owe',
        recordId: loan.id,
        severity: 'error',
        title: `Interest Math Variance on Loan ${loan.id} (${loan.lender})`,
        description: `Formula Principal (AED ${loan.principal.toFixed(2)}) × Rate (${loan.monthlyInterestRatePct}%) × Duration (${loan.interestDurationMonths} mo) yields AED ${expectedInterest.toFixed(2)}, but stored total interest is AED ${loan.totalInterestTerm.toFixed(2)}.`,
        expectedValue: `AED ${expectedInterest.toFixed(2)}`,
        actualValue: `AED ${loan.totalInterestTerm.toFixed(2)}`,
        autoFixable: true,
        autoFixType: 'loan-recalc',
      });
    }

    // Total to repay check: principal + total interest
    const expectedTotal = Math.round((loan.principal + loan.totalInterestTerm) * 100) / 100;
    const totalDiff = Math.abs(expectedTotal - loan.totalToRepay);
    if (totalDiff > 0.1) {
      issues.push({
        id: `audit-loan-total-${loan.id}`,
        sheet: 'Loans We Owe',
        recordId: loan.id,
        severity: 'error',
        title: `Total to Repay Mismatch on Loan ${loan.id} (${loan.lender})`,
        description: `Principal (AED ${loan.principal.toFixed(2)}) + Interest (AED ${loan.totalInterestTerm.toFixed(2)}) = AED ${expectedTotal.toFixed(2)}, but record has AED ${loan.totalToRepay.toFixed(2)}.`,
        expectedValue: `AED ${expectedTotal.toFixed(2)}`,
        actualValue: `AED ${loan.totalToRepay.toFixed(2)}`,
        autoFixable: true,
        autoFixType: 'loan-recalc',
      });
    }

    // Left to pay check: totalToRepay - paidSoFar
    const expectedLeft = Math.max(0, Math.round((loan.totalToRepay - loan.paidSoFar) * 100) / 100);
    const leftDiff = Math.abs(expectedLeft - loan.leftToPay);
    if (leftDiff > 0.1) {
      issues.push({
        id: `audit-loan-left-${loan.id}`,
        sheet: 'Loans We Owe',
        recordId: loan.id,
        severity: 'error',
        title: `Outstanding Balance Mismatch on Loan ${loan.id} (${loan.lender})`,
        description: `Total to repay (AED ${loan.totalToRepay.toFixed(2)}) minus Paid So Far (AED ${loan.paidSoFar.toFixed(2)}) should equal AED ${expectedLeft.toFixed(2)}, but record indicates AED ${loan.leftToPay.toFixed(2)}.`,
        expectedValue: `AED ${expectedLeft.toFixed(2)}`,
        actualValue: `AED ${loan.leftToPay.toFixed(2)}`,
        autoFixable: true,
        autoFixType: 'left-to-pay-recalc',
      });
    }

    // Check Payments & Charges against Loan Paid So Far
    const actualPaymentsRecorded = vault.payments
      .filter((p) => p.category === 'Loan Repayment' && (p.targetId === loan.id || p.targetName.includes(loan.lender)))
      .reduce((sum, p) => sum + p.amount, 0);
    const paymentsDiff = Math.abs(actualPaymentsRecorded - loan.paidSoFar);
    if (paymentsDiff > 0.1) {
      issues.push({
        id: `audit-payments-sync-${loan.id}`,
        sheet: 'Payments & Charges vs Loans',
        recordId: loan.id,
        severity: 'warning',
        title: `Payments Ledger vs Loan Paid Balance Mismatch (${loan.lender})`,
        description: `'Payments & Charges' records reflect AED ${actualPaymentsRecorded.toFixed(2)} paid, while 'Loans We Owe' shows AED ${loan.paidSoFar.toFixed(2)} paid so far.`,
        expectedValue: `AED ${actualPaymentsRecorded.toFixed(2)}`,
        actualValue: `AED ${loan.paidSoFar.toFixed(2)}`,
        autoFixable: true,
        autoFixType: 'payments-sync',
      });
    }

    // Check Repayment Plan schedule totals against Loan total
    const installmentsForLoan = vault.installments.filter((inst) => inst.loanId === loan.id);
    const sumInstallments = installmentsForLoan.reduce((sum, inst) => sum + inst.plannedAmount, 0);
    if (installmentsForLoan.length > 0 && Math.abs(sumInstallments - loan.totalToRepay) > 1.0) {
      issues.push({
        id: `audit-installments-sum-${loan.id}`,
        sheet: 'Repayment Plan',
        recordId: loan.id,
        severity: 'warning',
        title: `Scheduled Installments Schedule Variance (${loan.lender})`,
        description: `Sum of all planned instalments on the Repayment Plan is AED ${sumInstallments.toFixed(2)}, but total loan repayment obligation is AED ${loan.totalToRepay.toFixed(2)} (Variance: AED ${(sumInstallments - loan.totalToRepay).toFixed(2)}).`,
        expectedValue: `AED ${loan.totalToRepay.toFixed(2)}`,
        actualValue: `AED ${sumInstallments.toFixed(2)}`,
        autoFixable: true,
        autoFixType: 'installment-sum',
      });
    }
  });

  // 2. Audit Credit Cards
  vault.creditCards.forEach((cc) => {
    if (cc.statementBalance > cc.creditLimit) {
      issues.push({
        id: `audit-cc-limit-${cc.id}`,
        sheet: 'Credit Card Tracker',
        recordId: cc.id,
        severity: 'warning',
        title: `Credit Limit Exceeded: ${cc.bank} ${cc.cardName}`,
        description: `Statement balance of AED ${cc.statementBalance.toFixed(2)} exceeds credit card limit of AED ${cc.creditLimit.toFixed(2)}.`,
        expectedValue: `<= AED ${cc.creditLimit.toFixed(2)}`,
        actualValue: `AED ${cc.statementBalance.toFixed(2)}`,
        autoFixable: false,
      });
    }

    if (cc.minPayment > cc.statementBalance && cc.statementBalance > 0) {
      issues.push({
        id: `audit-cc-min-${cc.id}`,
        sheet: 'Credit Card Tracker',
        recordId: cc.id,
        severity: 'info',
        title: `Minimum Payment Higher Than Balance: ${cc.cardName}`,
        description: `Minimum payment of AED ${cc.minPayment.toFixed(2)} exceeds total balance AED ${cc.statementBalance.toFixed(2)}.`,
        expectedValue: `AED ${cc.statementBalance.toFixed(2)}`,
        actualValue: `AED ${cc.minPayment.toFixed(2)}`,
        autoFixable: false,
      });
    }
  });

  // 3. Audit Money Lent
  vault.moneyLent.forEach((ml) => {
    const expectedRemaining = Math.max(0, Math.round((ml.totalToRecover - ml.repaidAmount) * 100) / 100);
    if (Math.abs(expectedRemaining - ml.balanceRemaining) > 0.1) {
      issues.push({
        id: `audit-lent-${ml.id}`,
        sheet: 'Money Lent',
        recordId: ml.id,
        severity: 'error',
        title: `Money Lent Balance Mismatch (${ml.borrower})`,
        description: `Total to recover (AED ${ml.totalToRecover.toFixed(2)}) minus Repaid (AED ${ml.repaidAmount.toFixed(2)}) should equal AED ${expectedRemaining.toFixed(2)}, but record has AED ${ml.balanceRemaining.toFixed(2)}.`,
        expectedValue: `AED ${expectedRemaining.toFixed(2)}`,
        actualValue: `AED ${ml.balanceRemaining.toFixed(2)}`,
        autoFixable: true,
      });
    }
  });

  // 4. Audit Essentials Arrears
  if (Array.isArray(vault.essentials)) {
    vault.essentials.forEach((e) => {
      if (e.hasArrears) {
        if ((e.arrearsPaidSoFar || 0) > (e.arrearsAmount || 0)) {
          issues.push({
            id: `audit-arrears-paid-overflow-${e.id}`,
            sheet: 'Essentials & Arrears',
            recordId: e.id,
            severity: 'warning',
            title: `Arrears Paid Exceeds Total Backlog: ${e.name}`,
            description: `Arrears paid so far (AED ${(e.arrearsPaidSoFar || 0).toFixed(2)}) cannot exceed total arrears backlog (AED ${(e.arrearsAmount || 0).toFixed(2)}).`,
            expectedValue: `<= AED ${(e.arrearsAmount || 0).toFixed(2)}`,
            actualValue: `AED ${(e.arrearsPaidSoFar || 0).toFixed(2)}`,
            autoFixable: true,
          });
        }
      }
    });
  }

  return issues;
}

// Auto-Reconcile and fix all detected arithmetic variances
export function autoReconcileVault(vault: FamilyVaultData): { updatedVault: FamilyVaultData; fixCount: number } {
  let fixCount = 0;
  const newVault: FamilyVaultData = JSON.parse(JSON.stringify(vault));

  // 1. Fix loan calculations
  newVault.loans = newVault.loans.map((loan) => {
    const principal = loan.principal;
    const rate = loan.monthlyInterestRatePct;
    const duration = Math.max(1, loan.interestDurationMonths || 1);

    const correctMonthlyInterest = Math.round((principal * (rate / 100)) * 100) / 100;
    const correctTotalInterest = Math.round((correctMonthlyInterest * duration) * 100) / 100;
    const correctTotalToRepay = Math.round((principal + correctTotalInterest) * 100) / 100;

    // Check payments in payments ledger for this loan
    const actualPayments = newVault.payments
      .filter((p) => p.category === 'Loan Repayment' && (p.targetId === loan.id || p.targetName.includes(loan.lender)))
      .reduce((s, p) => s + p.amount, 0);

    let correctPaidSoFar = loan.paidSoFar;
    if (actualPayments > 0 && Math.abs(actualPayments - loan.paidSoFar) > 0.1) {
      correctPaidSoFar = actualPayments;
      fixCount++;
    } else if (loan.paidSoFar > 0 && actualPayments === 0) {
      // Sync payment ledger with initial paid record
      newVault.payments.push({
        id: `pay-sync-${loan.id}`,
        date: loan.borrowedDate || '2026-09-06',
        monthYear: '2026-09',
        category: 'Loan Repayment',
        targetId: loan.id,
        targetName: `${loan.lender} (Paid Balance)`,
        amount: loan.paidSoFar,
        paidByMemberId: 'm1',
        paymentMethod: 'Bank Transfer',
        receiptNotes: 'Auto-reconciled loan payment ledger parity',
      });
      fixCount++;
    }

    const correctLeftToPay = Math.max(0, Math.round((correctTotalToRepay - correctPaidSoFar) * 100) / 100);

    if (
      Math.abs(loan.monthlyInterestUsed - correctMonthlyInterest) > 0.05 ||
      Math.abs(loan.totalInterestTerm - correctTotalInterest) > 0.05 ||
      Math.abs(loan.totalToRepay - correctTotalToRepay) > 0.05 ||
      Math.abs(loan.leftToPay - correctLeftToPay) > 0.05 ||
      Math.abs(loan.paidSoFar - correctPaidSoFar) > 0.05
    ) {
      fixCount++;
    }

    return {
      ...loan,
      monthlyInterestUsed: correctMonthlyInterest,
      totalInterestTerm: correctTotalInterest,
      totalToRepay: correctTotalToRepay,
      paidSoFar: correctPaidSoFar,
      leftToPay: correctLeftToPay,
      status: correctLeftToPay <= 0 ? 'Settled' : loan.status,
    };
  });

  // 2. Harmonize Repayment Plan installments if total differs
  newVault.loans.forEach((loan) => {
    const loanInstallments = newVault.installments.filter((inst) => inst.loanId === loan.id);
    if (loanInstallments.length > 0) {
      const sum = loanInstallments.reduce((acc, i) => acc + i.plannedAmount, 0);
      if (Math.abs(sum - loan.totalToRepay) > 0.5) {
        // Adjust remaining installments proportionally
        const unpaidInstallments = loanInstallments.filter((inst) => inst.status !== 'Paid');
        const paidSum = loanInstallments.filter((inst) => inst.status === 'Paid').reduce((acc, i) => acc + (i.paidAmount || i.plannedAmount), 0);
        const remainingToDistribute = Math.max(0, loan.totalToRepay - paidSum);

        if (unpaidInstallments.length > 0) {
          const perInstallment = Math.round((remainingToDistribute / unpaidInstallments.length) * 100) / 100;
          let distributed = 0;
          newVault.installments = newVault.installments.map((inst) => {
            if (inst.loanId === loan.id && inst.status !== 'Paid') {
              distributed++;
              const isLast = distributed === unpaidInstallments.length;
              const amount = isLast ? Math.round((remainingToDistribute - perInstallment * (unpaidInstallments.length - 1)) * 100) / 100 : perInstallment;
              return { ...inst, plannedAmount: Math.max(0, amount) };
            }
            return inst;
          });
          fixCount++;
        }
      }
    }
  });

  // 3. Harmonize Credit Cards
  newVault.creditCards = newVault.creditCards.map((cc) => {
    let modified = false;
    let limit = cc.creditLimit;
    let balance = cc.statementBalance;
    let minPay = cc.minPayment;

    if (balance > limit) {
      limit = Math.max(limit, Math.ceil(balance / 5000) * 5000);
      modified = true;
      fixCount++;
    }

    if (minPay > balance && balance > 0) {
      minPay = Math.round(balance * 0.05 * 100) / 100;
      modified = true;
      fixCount++;
    }

    return modified ? { ...cc, creditLimit: limit, minPayment: minPay } : cc;
  });

  // 4. Fix money lent balance
  newVault.moneyLent = newVault.moneyLent.map((ml) => {
    const correctRemaining = Math.max(0, Math.round((ml.totalToRecover - ml.repaidAmount) * 100) / 100);
    if (Math.abs(ml.balanceRemaining - correctRemaining) > 0.05) {
      fixCount++;
      return {
        ...ml,
        balanceRemaining: correctRemaining,
        status: correctRemaining <= 0 ? 'Repaid' : ml.status,
      };
    }
    return ml;
  });

  // 5. Harmonize Essentials & Arrears
  if (Array.isArray(newVault.essentials)) {
    newVault.essentials = newVault.essentials.map((e) => {
      let modified = false;
      let hasArr = e.hasArrears;
      let arrAmt = e.arrearsAmount || 0;
      let arrPaid = e.arrearsPaidSoFar || 0;

      if (hasArr) {
        if (arrAmt <= 0) {
          hasArr = false;
          arrAmt = 0;
          arrPaid = 0;
          modified = true;
          fixCount++;
        } else if (arrPaid > arrAmt) {
          arrPaid = arrAmt;
          modified = true;
          fixCount++;
        }
      }

      return modified
        ? {
            ...e,
            hasArrears: hasArr,
            arrearsAmount: arrAmt,
            arrearsPaidSoFar: arrPaid,
          }
        : e;
    });
  }

  return { updatedVault: newVault, fixCount };
}

// Export Audit Report to CSV string
export function exportAuditIssuesToCSV(issues: AuditIssue[]): string {
  const headers = ['Issue ID', 'Sheet / Module', 'Record ID', 'Severity', 'Rule / Title', 'Description', 'Expected Value', 'Stored / Actual Value', 'Auto-Fixable'];
  const rows = issues.map((issue) => [
    issue.id,
    `"${issue.sheet}"`,
    `"${issue.recordId}"`,
    issue.severity.toUpperCase(),
    `"${issue.title.replace(/"/g, '""')}"`,
    `"${issue.description.replace(/"/g, '""')}"`,
    `"${issue.expectedValue}"`,
    `"${issue.actualValue}"`,
    issue.autoFixable ? 'YES' : 'NO',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
