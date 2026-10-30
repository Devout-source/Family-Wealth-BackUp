import React from 'react';
import {
  LayoutDashboard,
  Landmark,
  CalendarCheck,
  TrendingUp,
  Receipt,
  CreditCard,
  ShoppingBag,
  HandCoins,
  Sparkles,
  FileCheck2,
  HardDriveDownload,
  Smartphone,
  X,
  MoreHorizontal,
  PiggyBank,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'loans'
  | 'repayment_plan'
  | 'savings_vault'
  | 'income'
  | 'essentials'
  | 'payments'
  | 'credit_cards'
  | 'other_spending'
  | 'money_lent'
  | 'ai_advisor'
  | 'audit_log'
  | 'vault_export';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  auditIssueCount: number;
  upcomingDueCount: number;
  availableMoney?: number;
  currentMonth?: string;
  onOpenInstallApp?: () => void;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  auditIssueCount,
  upcomingDueCount,
  availableMoney,
  currentMonth,
  onOpenInstallApp,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Main Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'loans',
      label: 'Loans We Owe',
      icon: <Landmark className="w-4 h-4" />,
    },
    {
      id: 'repayment_plan',
      label: 'Repayment Plan',
      icon: <CalendarCheck className="w-4 h-4" />,
    },
    {
      id: 'savings_vault',
      label: 'Savings Vault',
      icon: <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      id: 'income',
      label: 'Income Log',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'essentials',
      label: 'Essentials & Arrears',
      icon: <Receipt className="w-4 h-4" />,
      badge: upcomingDueCount > 0 ? upcomingDueCount : undefined,
      badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded',
    },
    {
      id: 'payments',
      label: 'Payments & Charges',
      icon: <Receipt className="w-4 h-4" />,
    },
    {
      id: 'credit_cards',
      label: 'Credit Card Tracker',
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: 'other_spending',
      label: 'Other Spending',
      icon: <ShoppingBag className="w-4 h-4" />,
    },
    {
      id: 'money_lent',
      label: 'Money Lent Out',
      icon: <HandCoins className="w-4 h-4" />,
    },
    {
      id: 'ai_advisor',
      label: 'AI Financial Advisor',
      icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
    },
    {
      id: 'audit_log',
      label: 'Math Audit Log',
      icon: <FileCheck2 className="w-4 h-4" />,
      badge: auditIssueCount > 0 ? auditIssueCount : undefined,
      badgeColor: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded',
    },
    {
      id: 'vault_export',
      label: 'Backup & PDF / CSV',
      icon: <HardDriveDownload className="w-4 h-4" />,
    },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    onTabChange(tab);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full p-3.5 select-none overflow-y-auto">
      <div className="space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
          Financial Modules
        </div>
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${item.badgeColor || 'text-slate-500'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Available Money & Mobile Info */}
      <div className="space-y-2 mt-auto pt-3 border-t border-slate-200 dark:border-slate-800">
        {availableMoney !== undefined && (
          <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              <span>Money Available</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 font-bold uppercase">
                {currentMonth || 'Month'}
              </span>
            </div>
            <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
              AED {availableMoney.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
              Net free cash after all bills
            </span>
          </div>
        )}

        {/* Install on Phone Banner */}
        {onOpenInstallApp && (
          <button
            onClick={() => {
              if (onCloseMobileDrawer) onCloseMobileDrawer();
              onOpenInstallApp();
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-200 transition text-left cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                  Install on Phone
                </div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">
                  Direct install & PWA setup
                </div>
              </div>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </button>
        )}

        {/* Cloud Sync Status */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 text-[10px] space-y-0.5">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
            <span>Vault Sync</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">Firebase Live</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 leading-tight">
            Encrypted & synced in real time across family devices.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / Laptop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 no-print select-none transition-colors">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex no-print">
          {/* Backdrop */}
          <div
            onClick={onCloseMobileDrawer}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-out Panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-slate-800 transition-colors">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                Family Vault Modules
              </span>
              <button
                onClick={onCloseMobileDrawer}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav content */}
            <div className="flex-1 overflow-y-auto">
              {navContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Sleek Mobile Bottom Navigation Bar
interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenMore: () => void;
  upcomingDueCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenMore,
  upcomingDueCount = 0,
}) => {
  const quickTabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'loans',
      label: 'Loans',
      icon: <Landmark className="w-5 h-5" />,
    },
    {
      id: 'repayment_plan',
      label: 'Plan',
      icon: <CalendarCheck className="w-5 h-5" />,
    },
    {
      id: 'essentials',
      label: 'Bills',
      icon: <Receipt className="w-5 h-5" />,
      badge: upcomingDueCount > 0 ? upcomingDueCount : undefined,
    },
  ];

  return (
    <nav className="md:hidden sticky bottom-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-1.5 px-2 no-print safe-area-pb transition-colors shadow-lg w-full max-w-full overflow-hidden">
      {quickTabs.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors relative cursor-pointer ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-amber-500 text-white font-bold rounded-full text-[8px] flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="mt-0.5">{item.label}</span>
          </button>
        );
      })}

      {/* "More Modules" button */}
      <button
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
      >
        <MoreHorizontal className="w-5 h-5" />
        <span className="mt-0.5">Modules</span>
      </button>
    </nav>
  );
};
