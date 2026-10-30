import { FamilyVaultData } from '../types.ts';

function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportLoansCSV(loans: FamilyVaultData['loans']) {
  const headers = [
    'Loan ID',
    'Lender / Entity',
    'Purpose',
    'Borrowed Date',
    'Principal (AED)',
    'Interest Start Date',
    'Final Repayment Date',
    'Interest Duration (Months)',
    'Monthly Interest Rate (%)',
    'Monthly Interest Used (AED)',
    'Total Interest (AED)',
    'Total To Repay (AED)',
    'Paid So Far (AED)',
    'Left To Pay (AED)',
    'Planned Payment This Month (AED)',
    'Due Date',
    'Status',
    'Notes',
  ];
  const rows = loans.map((l) => [
    l.id,
    `"${l.lender}"`,
    `"${l.purpose}"`,
    l.borrowedDate,
    l.principal.toFixed(2),
    l.interestStartDate,
    l.finalRepaymentDate,
    l.interestDurationMonths,
    l.monthlyInterestRatePct.toFixed(2),
    l.monthlyInterestUsed.toFixed(2),
    l.totalInterestTerm.toFixed(2),
    l.totalToRepay.toFixed(2),
    l.paidSoFar.toFixed(2),
    l.leftToPay.toFixed(2),
    l.plannedPaymentThisMonth.toFixed(2),
    l.dueDateThisPayment,
    l.status,
    `"${(l.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, `loans_we_owe_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportInstallmentsCSV(installments: FamilyVaultData['installments']) {
  const headers = ['Installment ID', 'Loan ID', 'Lender', 'Month (YYYY-MM)', 'Installment #', 'Planned Amount (AED)', 'Due Date', 'Status', 'Paid Date'];
  const rows = installments.map((i) => [
    i.id,
    i.loanId,
    `"${i.lender}"`,
    i.monthYear,
    i.installmentNumber,
    i.plannedAmount.toFixed(2),
    i.dueDate,
    i.status,
    i.paidDate || '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, `repayment_plan_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportIncomesCSV(incomes: FamilyVaultData['incomes'], members: FamilyVaultData['members']) {
  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const headers = ['Income ID', 'Month', 'Member', 'Source', 'Category', 'Planned (AED)', 'Actual (AED)', 'Date Received', 'Recurring', 'Notes'];
  const rows = incomes.map((inc) => [
    inc.id,
    inc.monthYear,
    `"${memberMap.get(inc.memberId) || inc.memberId}"`,
    `"${inc.source}"`,
    inc.category,
    inc.plannedAmount.toFixed(2),
    inc.actualAmount.toFixed(2),
    inc.dateReceived,
    inc.isRecurring ? 'YES' : 'NO',
    `"${(inc.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, `income_log_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportEssentialsCSV(essentials: FamilyVaultData['essentials']) {
  const headers = ['Bill ID', 'Month', 'Bill / Expense Name', 'Category', 'Amount (AED)', 'Due Date', 'Recurring', 'Status', 'Paid Date'];
  const rows = essentials.map((e) => [
    e.id,
    e.monthYear,
    `"${e.name}"`,
    e.category,
    e.amount.toFixed(2),
    e.dueDate,
    e.isRecurring ? 'YES' : 'NO',
    e.status,
    e.paidDate || '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, `essentials_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportPaymentsCSV(payments: FamilyVaultData['payments']) {
  const headers = ['Payment ID', 'Date', 'Month', 'Category', 'Target Reference', 'Amount (AED)', 'Payment Method', 'Notes'];
  const rows = payments.map((p) => [
    p.id,
    p.date,
    p.monthYear,
    p.category,
    `"${p.targetName}"`,
    p.amount.toFixed(2),
    p.paymentMethod,
    `"${(p.receiptNotes || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, `payments_charges_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function triggerPrintReport() {
  window.print();
}
