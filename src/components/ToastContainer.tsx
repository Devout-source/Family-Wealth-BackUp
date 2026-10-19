import React from 'react';
import { CheckCircle2, AlertTriangle, X, RefreshCw } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none no-print">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl shadow-xl flex items-start gap-2.5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 border text-xs ${
              isError
                ? 'bg-rose-50 dark:bg-rose-950/95 border-rose-500/80 text-rose-900 dark:text-rose-200 shadow-rose-950/30'
                : isSuccess
                ? 'bg-slate-900 text-white border-emerald-500/40 dark:bg-slate-900 dark:border-emerald-500/40'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
            )}

            <div className="flex-1 min-w-0">
              <p className="leading-snug break-words font-medium">{toast.message}</p>
              {toast.onAction && toast.actionLabel && (
                <button
                  onClick={() => {
                    toast.onAction?.();
                    onDismiss(toast.id);
                  }}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{toast.actionLabel}</span>
                </button>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
