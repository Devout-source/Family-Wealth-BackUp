import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  KeyRound,
  Copy,
  Check,
  Upload,
  Download,
  FileJson,
} from 'lucide-react';
import { FamilyVaultData } from '../types.ts';
import {
  exportLoansCSV,
  exportInstallmentsCSV,
  exportIncomesCSV,
  exportEssentialsCSV,
  exportPaymentsCSV,
  triggerPrintReport,
} from '../utils/exportTools.ts';
import { encryptData, decryptData } from '../utils/cryptoVault.ts';

interface VaultExportViewProps {
  vault: FamilyVaultData;
  onRestoreVault: (restoredData: FamilyVaultData) => void;
  canEdit: boolean;
}

export const VaultExportView: React.FC<VaultExportViewProps> = ({
  vault,
  onRestoreVault,
  canEdit,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [syncCode, setSyncCode] = useState<string | null>(null);
  const [copiedSync, setCopiedSync] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Generate encrypted sync token for mobile / other desktop
  const handleGenerateSyncCode = async () => {
    try {
      const encrypted = await encryptData(JSON.stringify(vault), passphrase || 'family-aed-vault-secret-key-2026');
      const base64Token = btoa(encrypted);
      setSyncCode(base64Token);
    } catch (err: any) {
      setImportError('Could not generate sync package: ' + err.message);
    }
  };

  const handleCopySyncCode = () => {
    if (!syncCode) return;
    navigator.clipboard.writeText(syncCode);
    setCopiedSync(true);
    setTimeout(() => setCopiedSync(false), 2000);
  };

  const handleImportSyncCode = async () => {
    setImportError(null);
    setImportSuccess(false);
    try {
      if (!importCode.trim()) return;
      const rawEncrypted = atob(importCode.trim());
      const decrypted = await decryptData(rawEncrypted, passphrase || 'family-aed-vault-secret-key-2026');
      const parsed = JSON.parse(decrypted);
      if (!parsed.version || !parsed.members) {
        throw new Error('Invalid vault package format');
      }
      onRestoreVault(parsed);
      setImportSuccess(true);
      setImportCode('');
    } catch {
      setImportError('Failed to decrypt and restore: incorrect passphrase or corrupted sync payload.');
    }
  };

  // Download encrypted .json.enc file
  const handleDownloadEncryptedFile = async () => {
    try {
      const encrypted = await encryptData(JSON.stringify(vault), passphrase || 'family-aed-vault-secret-key-2026');
      const blob = new Blob([encrypted], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `family_wealth_vault_${new Date().toISOString().slice(0, 10)}.enc.json`;
      link.click();
    } catch (err: any) {
      setImportError('Failed to export encrypted file: ' + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        let data: FamilyVaultData;
        if (text.trim().startsWith('{') && text.includes('"version"') && text.includes('"members"')) {
          data = JSON.parse(text);
        } else {
          const decrypted = await decryptData(text, passphrase || 'family-aed-vault-secret-key-2026');
          data = JSON.parse(decrypted);
        }
        onRestoreVault(data);
        setImportSuccess(true);
        setImportError(null);
      } catch (err: any) {
        setImportError('Could not restore vault file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const [jsonBackupSuccess, setJsonBackupSuccess] = useState<string | null>(null);

  const handleDownloadHumanReadableJSON = () => {
    try {
      const cleanJSON = JSON.stringify(vault, null, 2);
      const blob = new Blob([cleanJSON], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `family_wealth_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setJsonBackupSuccess('Exported clean human-readable JSON file successfully!');
      setTimeout(() => setJsonBackupSuccess(null), 3500);
    } catch (err: any) {
      setImportError('Failed to generate readable JSON export: ' + err.message);
    }
  };

  const handleJSONFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || !parsed.version || !Array.isArray(parsed.members)) {
          throw new Error('Invalid vault file structure. Missing required version or members schema.');
        }
        onRestoreVault(parsed);
        setJsonBackupSuccess('Successfully restored entire financial ledger from JSON file!');
        setImportError(null);
        setTimeout(() => setJsonBackupSuccess(null), 4000);
      } catch (err: any) {
        setImportError('Could not restore JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Data Export & End-to-End Encrypted Sync</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pure AED financial exports in PDF, CSV, and human-readable JSON, alongside AES-GCM encrypted cross-device synchronization.
        </p>
      </div>

      {/* Human-Readable One-Click JSON Backup & Restore Card */}
      <div className="p-6 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Human-Readable One-Click JSON Backup & Restore</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                  JSON v1
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Export and inspect the entire financial ledger in indented, human-readable format, or upload a JSON backup to migrate records.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadHumanReadableJSON}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Readable JSON</span>
            </button>
            {canEdit && (
              <label className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON Backup</span>
                <input type="file" accept=".json" className="hidden" onChange={handleJSONFileUpload} />
              </label>
            )}
          </div>
        </div>

        {jsonBackupSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{jsonBackupSuccess}</span>
          </div>
        )}
      </div>

      {/* Export Section (Only PDF and CSV as required) */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Formatted Document & CSV Exports
          </h2>
          <p className="text-xs text-slate-500">
            Export accurate, uncorrupted financial records exclusively formatted as PDF and CSV.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={triggerPrintReport}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left space-y-1.5 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-900 dark:text-white">Print / PDF Financial Statement</span>
              <Printer className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[11px] text-slate-500">
              Clean, executive-formatted printable PDF report with zero UI clutter.
            </p>
          </button>

          <button
            onClick={() => exportLoansCSV(vault.loans)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left space-y-1.5 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-900 dark:text-white">Export Loans We Owe</span>
              <span className="text-[10px] font-mono font-bold text-emerald-600">CSV</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Exact principal, monthly rates, interest terms, and payments to date in AED.
            </p>
          </button>

          <button
            onClick={() => exportInstallmentsCSV(vault.installments)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left space-y-1.5 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-900 dark:text-white">Export Repayment Plan</span>
              <span className="text-[10px] font-mono font-bold text-emerald-600">CSV</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Multi-month installment milestones and payment status.
            </p>
          </button>

          <button
            onClick={() => exportIncomesCSV(vault.incomes, vault.members)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left space-y-1.5 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-900 dark:text-white">Export Income Log</span>
              <span className="text-[10px] font-mono font-bold text-emerald-600">CSV</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Salary breakdowns and member attribution.
            </p>
          </button>

          <button
            onClick={() => exportEssentialsCSV(vault.essentials)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left space-y-1.5 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-900 dark:text-white">Export Essentials & Bills</span>
              <span className="text-[10px] font-mono font-bold text-emerald-600">CSV</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Household rent, utilities, and recurring dues.
            </p>
          </button>

          <button
            onClick={() => exportPaymentsCSV(vault.payments)}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left space-y-1.5 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-900 dark:text-white">Export Payments & Charges</span>
              <span className="text-[10px] font-mono font-bold text-emerald-600">CSV</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Complete historical transaction journal with payment methods.
            </p>
          </button>
        </div>
      </div>

      {/* End-to-End Encryption & Cross-Platform Sync */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-5 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            Cross-Platform Sync & Device Backup (AES-GCM 256)
          </h2>
          <p className="text-xs text-slate-500">
            Securely sync data across mobile and desktop devices without exposing unencrypted financial data.
          </p>
        </div>

        {/* Master Passphrase Input */}
        <div>
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Family Encryption Passphrase (Optional, defaults to master family key)
          </label>
          <input
            type="password"
            placeholder="Enter custom family master passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="w-full max-w-md px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Generate Sync Code / Export Encrypted File */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">1. Export Encrypted Sync Package</h3>
            <p className="text-[11px] text-slate-500">
              Generates an encrypted string or file you can paste into your mobile phone or family members' devices.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGenerateSyncCode}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Generate Sync Code
              </button>
              <button
                onClick={handleDownloadEncryptedFile}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Download .enc File
              </button>
            </div>

            {syncCode && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">Encrypted Payload Token:</span>
                  <button
                    onClick={handleCopySyncCode}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copiedSync ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSync ? 'Copied!' : 'Copy Token'}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={3}
                  value={syncCode}
                  className="w-full p-2 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 select-all"
                />
              </div>
            )}
          </div>

          {/* Import / Sync Into This Device */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">2. Restore or Sync From Other Device</h3>
            <p className="text-[11px] text-slate-500">
              Paste the sync token generated from another device or upload an encrypted backup file.
            </p>
            <textarea
              rows={2}
              placeholder="Paste encrypted sync token here..."
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              className="w-full p-2 text-[11px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
            />
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleImportSyncCode}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Decrypt & Sync Data
                </button>
                <label className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Upload .enc File
                  <input type="file" accept=".json,.enc" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Viewer role active: Admin or Editor permission required to restore vault data.
              </p>
            )}

            {importSuccess && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                Data successfully synced and updated across all family modules!
              </div>
            )}
            {importError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                {importError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
