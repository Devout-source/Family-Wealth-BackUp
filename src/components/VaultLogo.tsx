import React from 'react';

interface VaultLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const VaultLogo: React.FC<VaultLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-9 h-9', text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-12 h-12', text: 'text-xl', sub: 'text-xs' },
    xl: { box: 'w-16 h-16', text: 'text-2xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Futuristic Geometric Vault Emblem */}
      <div className={`relative ${currentSize.box} shrink-0 group`}>
        {/* Ambient Glow */}
        <div className="absolute -inset-0.5 bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 rounded-xl blur-[3px] opacity-60 group-hover:opacity-90 transition-opacity" />
        {/* Outer Shield Box */}
        <div className="relative w-full h-full rounded-xl bg-slate-900 border border-emerald-400/30 flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-950/40">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full p-1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="vaultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="goldAccent" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Hexagonal Shield Perimeter */}
            <path
              d="M50 8 L86 28 V72 L50 92 L14 72 V28 Z"
              stroke="url(#vaultGrad)"
              strokeWidth="4"
              strokeLinejoin="round"
              fill="rgba(16, 185, 129, 0.08)"
            />
            {/* Inner Isometric Vault Facets */}
            <path
              d="M50 20 L78 36 V64 L50 80 L22 64 V36 Z"
              stroke="#34d399"
              strokeWidth="2"
              strokeDasharray="2 3"
              fill="none"
              opacity="0.6"
            />
            {/* Central Cipher Key / Diamond Node */}
            <path
              d="M50 32 L66 48 L50 64 L34 48 Z"
              fill="url(#vaultGrad)"
              filter="url(#glow)"
            />
            {/* Inner Gold Spark Center */}
            <circle cx="50" cy="48" r="4.5" fill="url(#goldAccent)" />
            {/* Precision Micro Crosshairs */}
            <line x1="50" y1="12" x2="50" y2="24" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="50" y1="72" x2="50" y2="84" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="20" y1="48" x2="30" y2="48" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="70" y1="48" x2="80" y2="48" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`${currentSize.text} font-black tracking-tight text-slate-900 dark:text-white uppercase`}>
              Family Vault
            </span>
            <span className="text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.2 rounded bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              AED PRO
            </span>
          </div>
          <span className={`${currentSize.sub} font-medium text-slate-500 dark:text-slate-400 tracking-wide`}>
            Encrypted Financial Core
          </span>
        </div>
      )}
    </div>
  );
};
