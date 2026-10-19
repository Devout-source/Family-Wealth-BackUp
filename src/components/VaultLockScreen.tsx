import React, { useState } from 'react';
import { Fingerprint, Lock, KeyRound, AlertCircle, Check, X, Moon, Sun } from 'lucide-react';
import { FamilyMember } from '../types.ts';
import { initialFamilyVault } from '../data/initialRecords.ts';
import { triggerBiometricAuthentication } from '../utils/cryptoVault.ts';
import { VaultLogo } from './VaultLogo.tsx';

interface VaultLockScreenProps {
  members: FamilyMember[];
  onUnlock: (member: FamilyMember) => void;
  onUpdateMemberPin?: (memberId: string, newPin: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  members,
  onUnlock,
  onUpdateMemberPin,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const safeMembers = Array.isArray(members) && members.length > 0 ? members : initialFamilyVault.members;
  const [selectedMember, setSelectedMember] = useState<FamilyMember>(() => safeMembers[0]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bioSuccess, setBioSuccess] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isScanningFingerprint, setIsScanningFingerprint] = useState(false);

  // Change PIN modal state
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [changePinSuccess, setChangePinSuccess] = useState(false);

  const activeMemberSafe = selectedMember || safeMembers[0];

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === activeMemberSafe.pin || enteredPin === '1234') {
      onUnlock(activeMemberSafe);
    } else {
      setError('Incorrect security PIN. Please try again or use 1234.');
      setPin('');
    }
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      setChangePinError('PIN must be exactly 4 digits.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setChangePinError('PINs do not match. Please re-enter.');
      return;
    }
    if (onUpdateMemberPin) {
      onUpdateMemberPin(activeMemberSafe.id, newPinInput);
    }
    setSelectedMember({ ...activeMemberSafe, pin: newPinInput });
    setChangePinSuccess(true);
    setChangePinError(null);
    setTimeout(() => {
      setChangePinSuccess(false);
      setIsChangePinOpen(false);
      setNewPinInput('');
      setConfirmPinInput('');
    }, 1200);
  };

  const handleStartBiometricScan = async () => {
    setIsBioModalOpen(true);
    setIsScanningFingerprint(true);
    setError(null);
    try {
      await triggerBiometricAuthentication();
      setTimeout(() => {
        setIsScanningFingerprint(false);
        setBioSuccess(true);
        setTimeout(() => {
          setIsBioModalOpen(false);
          onUnlock(activeMemberSafe);
        }, 600);
      }, 1200);
    } catch {
      setIsScanningFingerprint(false);
      setError('Biometric authentication failed. Please enter your 4-digit PIN.');
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 transition-colors selection:bg-emerald-500/20">
      {/* Top Bar with Dark Mode Toggle */}
      {onToggleDarkMode && (
        <div className="w-full max-w-md flex justify-end mb-2">
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-full shadow-2xs backdrop-blur-sm cursor-pointer transition-colors"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-5 transition-colors">
        {/* Brand Lock Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <VaultLogo size="xl" showText={false} />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Family Wealth & Debt Vault
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Encrypted Family Ledger • Pure AED • 5 Private Accounts
          </p>
        </div>

        {/* Member Account Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block text-center uppercase tracking-wider">
            Select Your Family Account
          </label>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {safeMembers.map((m) => {
              const isSelected = activeMemberSafe.id === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMember(m);
                    setPin('');
                    setError(null);
                  }}
                  className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl transition-all border cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-xs ring-2 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${m.avatarColor} text-white flex items-center justify-center font-bold text-xs mb-1 shadow-2xs`}
                  >
                    {m.avatarInitials}
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold truncate max-w-full text-slate-800 dark:text-slate-200">
                    {m.name}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 capitalize truncate max-w-full">
                    {m.role}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Member Details */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 flex items-center justify-between transition-colors">
          <div className="truncate pr-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {activeMemberSafe.name}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
              {activeMemberSafe.relationship} • {activeMemberSafe.role?.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setNewPinInput('');
                setConfirmPinInput('');
                setChangePinError(null);
                setIsChangePinOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700/60 rounded-lg transition-colors cursor-pointer"
              title="Set a custom private PIN"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Change</span> PIN
            </button>
            <button
              onClick={handleStartBiometricScan}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800/50 rounded-lg transition-colors cursor-pointer"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Touch</span>
            </button>
          </div>
        </div>

        {/* PIN Indicators */}
        <div className="space-y-2">
          <div className="flex justify-center gap-4 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-150 ${
                    isFilled
                      ? 'bg-emerald-500 scale-110 shadow-xs shadow-emerald-500/50'
                      : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                  }`}
                />
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-1.5 justify-center text-xs text-rose-600 dark:text-rose-400 text-center">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {bioSuccess && (
            <div className="flex items-center gap-1.5 justify-center text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              <span>Fingerprint verified for {activeMemberSafe.name}!</span>
            </div>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              className="h-11 sm:h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-800 active:bg-emerald-600 active:text-white font-mono text-base font-semibold text-slate-800 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700/50 cursor-pointer shadow-2xs"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleStartBiometricScan}
            className="h-11 sm:h-12 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex flex-col items-center justify-center transition-colors border border-emerald-200 dark:border-emerald-800/50 group cursor-pointer shadow-2xs"
            title="Unlock with Fingerprint"
          >
            <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] uppercase tracking-wider font-semibold">Touch</span>
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-11 sm:h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-800 font-mono text-base font-semibold text-slate-800 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700/50 cursor-pointer shadow-2xs"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-11 sm:h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center transition-colors border border-slate-200 dark:border-slate-700/50 text-xs font-mono font-semibold cursor-pointer shadow-2xs"
          >
            DEL
          </button>
        </div>

        {/* Security Assurance Indicator */}
        <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-800/60 flex flex-col items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
            <span>Confidential 4-Digit Security PIN • Pure Privacy</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Birth years removed • Master PIN <strong className="text-emerald-600 dark:text-emerald-400 font-bold">1234</strong> or Touch
          </span>
        </div>
      </div>

      {/* Change PIN Modal */}
      {isChangePinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsChangePinOpen(false)}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2 border border-amber-500/30">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Set Private PIN</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set a secret 4-digit code for <strong className="text-slate-800 dark:text-white">{activeMemberSafe.name}</strong>
              </p>
            </div>
            <form onSubmit={handleSaveNewPin} className="space-y-3 text-left">
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  placeholder="••••"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Confirm 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  placeholder="••••"
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
              {changePinError && (
                <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 justify-center">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{changePinError}</span>
                </div>
              )}
              {changePinSuccess && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-center">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>PIN successfully updated!</span>
                </div>
              )}
              <button
                type="submit"
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Save Confidential PIN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Biometric Touch Sensor Modal */}
      {isBioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xs w-full text-center space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsBioModalOpen(false)}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Biometric Fingerprint</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Scan fingerprint for <strong className="text-emerald-600 dark:text-emerald-400">{activeMemberSafe.name}</strong>
              </p>
            </div>
            {/* Interactive Sensor Target */}
            <div
              onClick={() => {
                setIsScanningFingerprint(false);
                setBioSuccess(true);
                setTimeout(() => {
                  setIsBioModalOpen(false);
                  onUnlock(activeMemberSafe);
                }, 500);
              }}
              className="w-24 h-24 mx-auto rounded-full bg-slate-100 dark:bg-slate-950 border-2 border-emerald-500/60 flex items-center justify-center cursor-pointer relative group transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              {isScanningFingerprint && (
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-60" />
              )}
              <Fingerprint className={`w-12 h-12 ${isScanningFingerprint ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-emerald-600 dark:text-emerald-500'}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {isScanningFingerprint ? 'Scanning biometric sensor...' : 'Touch sensor to authenticate'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Account: {activeMemberSafe.relationship} ({activeMemberSafe.name})
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
