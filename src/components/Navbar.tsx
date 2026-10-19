import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Lock,
  Camera,
  AlertTriangle,
  ShieldCheck,
  Sliders,
  Smartphone,
  Flame,
  Menu,
  X,
} from 'lucide-react';
import { FamilyMember } from '../types.ts';
import { VaultLogo } from './VaultLogo.tsx';

interface NavbarProps {
  currentMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  activeMember: FamilyMember;
  onLockVault: () => void;
  onOpenScanner: () => void;
  onOpenQuickNumbers?: () => void;
  onOpenInstallApp?: () => void;
  firestoreSyncStatus?: 'connected' | 'connecting' | 'offline';
  firebaseUser?: { email?: string | null; displayName?: string | null } | null;
  onSignInGoogle?: () => void;
  onSignOutFirebase?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  auditIssueCount: number;
  onOpenAudit: () => void;
  availableMoney?: number;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMonth,
  onMonthChange,
  activeMember,
  onLockVault,
  onOpenScanner,
  onOpenQuickNumbers,
  onOpenInstallApp,
  firestoreSyncStatus = 'offline',
  firebaseUser,
  onSignInGoogle,
  onSignOutFirebase,
  isDarkMode,
  onToggleDarkMode,
  auditIssueCount,
  onOpenAudit,
  availableMoney,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  // Format month name (e.g. 2026-10 -> October 2026)
  const [yearStr, monthStr] = (currentMonth || '2026-10').split('-');
  const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
  const formattedMonth = isNaN(dateObj.getTime())
    ? currentMonth
    : dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const handlePrevMonth = () => {
    let year = parseInt(yearStr);
    let month = parseInt(monthStr) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    onMonthChange(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let year = parseInt(yearStr);
    let month = parseInt(monthStr) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    onMonthChange(`${year}-${String(month).padStart(2, '0')}`);
  };

  const memberSafe = activeMember || {
    id: 'm1',
    name: 'Member',
    avatarColor: 'bg-emerald-600',
    avatarInitials: 'MB',
    role: 'admin',
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-1.5 sm:gap-4 lg:gap-8 px-2 sm:px-4 md:px-6 py-2 sm:py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors no-print w-full max-w-full overflow-x-hidden">
      {/* Zone 1: Mobile Hamburger & Vault Logo */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
            className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        <div className="flex items-center shrink-0">
          <VaultLogo size="sm" showText={false} className="sm:hidden" />
          <VaultLogo size="sm" className="hidden sm:flex" />
        </div>
      </div>

      {/* Zone 2: Month / Clock Navigator & Audit Telemetry */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Month Selector Carousel */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
          <button
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <span className="px-1 sm:px-2 text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap font-mono">
            {formattedMonth}
          </span>
          <button
            onClick={handleNextMonth}
            aria-label="Next month"
            className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Audit Status Button */}
        <button
          onClick={onOpenAudit}
          className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border cursor-pointer ${
            auditIssueCount > 0
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
          }`}
          title="Mathematical Audit & Reconciliation Inspector"
        >
          {auditIssueCount > 0 ? (
            <>
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold">{auditIssueCount}</span>
              <span className="hidden sm:inline">Variance{auditIssueCount > 1 ? 's' : ''}</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Math OK</span>
            </>
          )}
        </button>

        {/* Money Available in Current Month */}
        {availableMoney !== undefined && (
          <div
            className="hidden md:flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
            title="Net available surplus in current month after calculating all debts and essentials"
          >
            <span className="hidden lg:inline text-[10px] text-slate-500 font-sans uppercase font-medium">Available:</span>
            <span>AED {availableMoney.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        )}
      </div>

      {/* Zone 3: Actions & Active Profile */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Quick Numbers Customizer (Desktop) */}
        {onOpenQuickNumbers && (
          <button
            onClick={onOpenQuickNumbers}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="Edit Baseline Numbers for Salary, Loans and Rent"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden xl:inline">Edit Numbers</span>
          </button>
        )}

        {/* Smart OCR Photo Scanner Trigger */}
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          title="Scan photo of bill, receipt or loan agreement"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Scan</span>
        </button>

        {/* Download & Install on Phone */}
        {onOpenInstallApp && (
          <button
            onClick={onOpenInstallApp}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            title="Download & Install on Family Members' Phones"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Install</span>
          </button>
        )}

        {/* Firebase Live Cloud Sync Indicator */}
        {firebaseUser ? (
          <div
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg"
            title={`Firebase Synced: ${firebaseUser.email || 'Connected'}`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                firestoreSyncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
            <span className="hidden xl:inline text-[11px] font-semibold truncate max-w-[100px]">
              {firebaseUser.email?.split('@')[0] || 'Synced'}
            </span>
            {onSignOutFirebase && (
              <button
                onClick={onSignOutFirebase}
                className="hidden sm:inline text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-0.5 underline cursor-pointer"
                title="Disconnect Firebase Session"
              >
                Exit
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onSignInGoogle || onOpenInstallApp}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            title="Sign in with Google to enable real-time Firebase cloud sync across all phones"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
            <span className="hidden sm:inline text-[11px] font-semibold">Firebase</span>
          </button>
        )}

        {/* Dark / Light Toggle */}
        <button
          onClick={onToggleDarkMode}
          aria-label="Toggle dark mode"
          className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Active Member Avatar & Lock */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
          <div
            className={`w-6 h-6 rounded-full ${memberSafe.avatarColor || 'bg-emerald-600'} text-white flex items-center justify-center text-[10px] font-bold shadow-2xs shrink-0`}
            title={`${memberSafe.name} (${memberSafe.role})`}
          >
            {memberSafe.avatarInitials || 'MB'}
          </div>
          <button
            onClick={onLockVault}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Lock Vault & Switch User"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
