import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';

interface NetworkStatusBannerProps {
  firestoreSyncStatus?: 'connected' | 'connecting' | 'offline';
  isLoggedIn?: boolean;
  onRetrySync?: () => void;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  firestoreSyncStatus = 'connected',
  isLoggedIn = false,
  onRetrySync,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline Warning Banner (Internet down)
  if (!isOnline) {
    return (
      <div className="sticky top-0 z-50 w-full bg-amber-500 text-slate-950 px-3 sm:px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md transition-all no-print">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
          <span>
            <strong>Offline Mode:</strong> Internet connection lost. Real-time syncing paused. Edits are saved locally in your encrypted vault.
          </span>
        </div>
        {onRetrySync && (
          <button
            onClick={onRetrySync}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-950 text-white rounded text-[11px] font-bold hover:bg-slate-800 transition cursor-pointer shrink-0 ml-2"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  // Cloud Sync Interrupted Warning (Online but Firestore disconnected)
  if (firestoreSyncStatus === 'offline' && isOnline && isLoggedIn) {
    return (
      <div className="sticky top-0 z-50 w-full bg-amber-600 text-white px-3 sm:px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md transition-all no-print">
        <div className="flex items-center gap-2">
          <CloudOff className="w-4 h-4 animate-pulse shrink-0" />
          <span>
            <strong>Sync Paused:</strong> Signed in, but Firestore real-time listener is offline. Working with local encrypted vault.
          </span>
        </div>
        {onRetrySync && (
          <button
            onClick={onRetrySync}
            className="flex items-center gap-1 px-2.5 py-1 bg-white text-slate-900 rounded text-[11px] font-bold hover:bg-slate-100 transition cursor-pointer shrink-0 ml-2"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect</span>
          </button>
        )}
      </div>
    );
  }

  // Connection Restored Banner
  if (showRestored) {
    return (
      <div className="sticky top-0 z-50 w-full bg-emerald-600 text-white px-3 sm:px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-sm transition-all no-print animate-in fade-in duration-300">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>Connection restored. Cloud synchronization is active.</span>
        </div>
        <button
          onClick={() => setShowRestored(false)}
          className="text-white/80 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
};
