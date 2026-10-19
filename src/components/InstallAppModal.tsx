import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  QrCode, 
  Share2, 
  Check, 
  Copy, 
  Download, 
  ExternalLink, 
  Flame, 
  Apple
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  firebaseUser?: { email?: string | null; displayName?: string | null } | null;
  onSignInGoogle?: () => void;
  onSignOutFirebase?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ 
  isOpen, 
  onClose,
  firebaseUser,
  onSignInGoogle,
  onSignOutFirebase,
}) => {
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'share' | 'firebase' | 'vercel'>('share');
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);

      // Detect OS to preset default tab
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setActiveTab('ios');
      } else if (/android/.test(ua)) {
        setActiveTab('android');
      }

      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleTriggerAndroidInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Generate SVG QR code based on current URL (or placeholder if too long)
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    currentUrl || 'http://localhost:3000'
  )}&margin=8&color=0f172a&bgcolor=ffffff`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Download to Family Phones
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Install as a native home-screen app on iPhone, iPad, and Android
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 bg-slate-50/80 dark:bg-slate-900/80 gap-2">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'share'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Scan QR & Share Link
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'ios'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Apple className="w-4 h-4" />
            iPhone / iPad (iOS)
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'android'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            Android Phones
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'vercel'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ExternalLink className="w-4 h-4 text-emerald-500" />
            Vercel Ready
          </button>
          <button
            onClick={() => setActiveTab('firebase')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
              activeTab === 'firebase'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            Firebase Guide
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: Share & QR */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <strong>Instant Phone Installation:</strong> This app is a <strong>Progressive Web App (PWA)</strong>. 
                  Your family does <em>not</em> need the Apple App Store or Google Play Store! 
                  Simply open this link on any phone and tap <strong>"Add to Home Screen"</strong>.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* QR Code Card */}
                <div className="flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200 inline-block mb-3">
                    <img 
                      src={qrApiUrl} 
                      alt="Family Vault QR Code" 
                      className="w-40 h-40 object-contain mx-auto"
                      onError={(e) => {
                        // Fallback text if offline
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Scan with Phone Camera
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Opens instantly on iPhone, iPad, or Android
                  </p>
                </div>

                {/* Send Link Card */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Share Link via WhatsApp, SMS, or Email:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentUrl}
                      className="w-full text-xs font-mono px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 truncate select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shrink-0 shadow-sm"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                      Tip for Family Sharing:
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Send this link to your family group chat. Once they click it, tell them to tap <strong>Add to Home Screen</strong> so it stays on their phone permanently!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: iPhone / iOS */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                <Apple className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Instructions for Apple iPhone & iPad</strong>
                  <p className="text-[11px] mt-0.5">Follow these 4 simple steps in Safari. It takes under 15 seconds!</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white">Open in Safari</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Make sure the link opens in <strong>Apple Safari</strong> (if opened inside WhatsApp or Instagram, tap the compass icon in the bottom corner to open in Safari).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white">Tap the Share Button</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      At the bottom center of the Safari screen, tap the <strong>Share</strong> button (the square icon with an arrow pointing up).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white">Tap "Add to Home Screen"</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Scroll down the options list and tap <strong>Add to Home Screen [+]</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white">Tap "Add" in Top Right</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      The <strong>Family Vault</strong> app icon will now appear on their home screen like any normal App Store app! When tapped, it opens in full-screen standalone mode without any browser URL bar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Android */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Instructions for Android (Samsung, Pixel, Xiaomi, etc.)</strong>
                  <p className="text-[11px] mt-0.5">Google Chrome lets you install the app directly with 1 tap.</p>
                </div>
              </div>

              {deferredPrompt && (
                <div className="p-4 bg-emerald-500 text-white rounded-xl shadow-md flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm">One-Click Install Ready!</h3>
                    <p className="text-xs text-emerald-100">Tap below to add Family Vault directly to your phone.</p>
                  </div>
                  <button
                    onClick={handleTriggerAndroidInstall}
                    className="px-4 py-2 bg-white text-emerald-800 font-bold text-xs rounded-lg shadow hover:bg-emerald-50 transition"
                  >
                    Install Now
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white">Open in Google Chrome</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Open the vault link on your Android phone in Google Chrome.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white">Look for the Install Banner</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Chrome often displays a banner at the bottom saying <strong>"Add to Home screen"</strong> or <strong>"Install Family Vault"</strong>. Tap it!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white">Alternative: Chrome Menu</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      If the banner doesn't appear, tap the three dots <strong>⋮</strong> in the top-right corner of Chrome, then select <strong>Install App</strong> (or <strong>Add to Home screen</strong>).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Vercel Deployment & Serverless Config */}
          {activeTab === 'vercel' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg shrink-0 mt-0.5">
                  <ExternalLink className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                      100% Vercel & GitHub Deployment Ready
                    </span>
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-600 text-white rounded-full font-bold">
                      Configured
                    </span>
                  </div>
                  <p className="text-[11px] mt-1 text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    The project has been architected for seamless push-to-deploy on Vercel. Frontend builds to static assets (<code className="font-mono bg-emerald-200/50 dark:bg-emerald-900/60 px-1 rounded">dist</code>), and AI Advisor backend routes run as Vercel Serverless Functions in <code className="font-mono bg-emerald-200/50 dark:bg-emerald-900/60 px-1 rounded">api/index.ts</code>.
                  </p>
                </div>
              </div>

              {/* 3 Steps to Deploy */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Push to GitHub</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Copy or push these project files to your GitHub repository. The root contains <code className="font-mono text-slate-700 dark:text-slate-300">vercel.json</code>, <code className="font-mono text-slate-700 dark:text-slate-300">package.json</code>, and <code className="font-mono text-slate-700 dark:text-slate-300">api/</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Import Project into Vercel</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Select <strong>Vite</strong> as the framework. Vercel automatically sets Build Command to <code className="font-mono text-slate-700 dark:text-slate-300">npm run build</code> and Output Directory to <code className="font-mono text-slate-700 dark:text-slate-300">dist</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Add Environment Variables</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Under <strong>Settings → Environment Variables</strong> on Vercel, paste <code className="font-mono text-slate-700 dark:text-slate-300">GEMINI_API_KEY</code> and your <code className="font-mono text-slate-700 dark:text-slate-300">VITE_FIREBASE_*</code> values.
                    </p>
                  </div>
                </div>
              </div>

              {/* Environment Variables Copy Block */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5" />
                    Vercel Environment Variables:
                  </div>
                  <button
                    onClick={() => {
                      const envText = `GEMINI_API_KEY=your-gemini-api-key\nVITE_FIREBASE_API_KEY=AIzaSyDEVn3ZsSh0-ZrD4eymB5DFSpLRqwdagdI\nVITE_FIREBASE_AUTH_DOMAIN=family-wealth-8033e.firebaseapp.com\nVITE_FIREBASE_PROJECT_ID=family-wealth-8033e\nVITE_FIREBASE_STORAGE_BUCKET=family-wealth-8033e.firebasestorage.app\nVITE_FIREBASE_MESSAGING_SENDER_ID=996518752094\nVITE_FIREBASE_APP_ID=1:996518752094:web:dfd05a9a732f8a700469cf\nVITE_FIREBASE_MEASUREMENT_ID=G-SECNE1FBHL\nVITE_FIREBASE_DATABASE_ID=(default)`;
                      navigator.clipboard.writeText(envText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition"
                  >
                    {copied ? 'Copied to clipboard!' : 'Copy env template'}
                  </button>
                </div>
                <pre className="font-mono text-[10px] bg-black/40 p-2.5 rounded-lg text-emerald-300 overflow-x-auto select-all">
GEMINI_API_KEY=...
VITE_FIREBASE_API_KEY=AIzaSyDEVn3ZsSh0-ZrD4eymB5DFSpLRqwdagdI
VITE_FIREBASE_AUTH_DOMAIN=family-wealth-8033e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=family-wealth-8033e
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Firebase Active & Realtime Sync */}
          {activeTab === 'firebase' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg shrink-0 mt-0.5">
                  <Flame className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm">Firebase is Now Automatically Connected!</strong>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] mt-1 text-emerald-800 dark:text-emerald-300">
                    Your database has been automatically provisioned with Firestore and secure rules. You didn't have to configure any keys or servers!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" /> What's Working Automatically:
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside">
                    <li>Real-time sync across all household phones</li>
                    <li>Automatic persistent cloud database</li>
                    <li>AES-256 encrypted local backup</li>
                    <li>Sub-second update reflection</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-blue-500" /> Active Configuration:
                  </span>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 font-mono">
                    <p><span className="text-slate-400">Project:</span> family-wealth-8033e</p>
                    <p className="truncate"><span className="text-slate-400">Hosting:</span> dist folder</p>
                    <p><span className="text-slate-400">Rules:</span> ABAC Secured</p>
                  </div>
                </div>
              </div>

              {/* Authentication Status & Trigger */}
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    Firebase Authentication:
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {firebaseUser 
                      ? `Signed in as ${firebaseUser.email} (Cloud sync active)` 
                      : 'Sign in with your Google account to enable live multi-device syncing'}
                  </p>
                </div>
                {firebaseUser ? (
                  <button
                    onClick={onSignOutFirebase}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={onSignInGoogle}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Sign In with Google</span>
                  </button>
                )}
              </div>

              {/* Exact Terminal Commands to Deploy Directly */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Deploy Directly from Terminal (No QR Code Needed):
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('npm run build && firebase deploy --only hosting');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition"
                  >
                    {copied ? 'Copied command!' : 'Copy deploy command'}
                  </button>
                </div>
                <pre className="font-mono text-[11px] bg-black/40 p-2.5 rounded-lg text-emerald-300 overflow-x-auto select-all">
                  npm run build && firebase deploy --only hosting
                </pre>
                <p className="text-[10px] text-slate-400 leading-tight">
                  This compiles the application using <code className="text-slate-300">npm run build</code> into the <code className="text-slate-300">dist</code> folder and deploys it straight to your Firebase project.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {isStandalone ? '✓ Running in standalone app mode' : '✓ Works on all iOS & Android devices'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
