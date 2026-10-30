import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, Check, X, Moon, Sun, HelpCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { FamilyMember } from '../types.ts';
import { initialFamilyVault } from '../data/initialRecords.ts';
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
  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => safeMembers[0]?.id || 'm1');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Normal Change PIN Modal State (when user knows current PIN)
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [changePinSuccess, setChangePinSuccess] = useState(false);

  // Recovery / Master Reset Modal State (when user forgot PIN)
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'authorize' | 'set_new'>('authorize');
  const [authMethod, setAuthMethod] = useState<'member' | 'master'>('member');
  const [authorizerMemberId, setAuthorizerMemberId] = useState<string>('');
  const [authorizerPinInput, setAuthorizerPinInput] = useState('');
  const [masterPinInput, setMasterPinInput] = useState('');
  const [authorizedByText, setAuthorizedByText] = useState('');
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryConfirmPin, setRecoveryConfirmPin] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // Always resolve active member dynamically from latest safeMembers prop to guarantee immediate PIN sync
  const activeMemberSafe = safeMembers.find((m) => m.id === selectedMemberId) || safeMembers[0];

  // Other members who can authorize recovery for the active member
  const otherMembers = safeMembers.filter((m) => m.id !== activeMemberSafe.id);

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
    // Normal account PIN or Master PIN fallback
    if (enteredPin === activeMemberSafe.pin || enteredPin === '1234') {
      onUnlock(activeMemberSafe);
    } else {
      setError('Incorrect security PIN. Please try again.');
      setPin('');
    }
  };

  // Normal Change PIN handler
  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPinInput !== activeMemberSafe.pin && currentPinInput !== '1234') {
      setChangePinError('Current PIN is incorrect. Use "Forgot PIN?" if forgotten.');
      return;
    }
    if (newPinInput.length !== 4 || !/^\d{4}$/.test(newPinInput)) {
      setChangePinError('New PIN must be exactly 4 digits.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setChangePinError('New PINs do not match. Please re-enter.');
      return;
    }
    if (onUpdateMemberPin) {
      onUpdateMemberPin(activeMemberSafe.id, newPinInput);
    }
    setChangePinSuccess(true);
    setChangePinError(null);
    setTimeout(() => {
      setChangePinSuccess(false);
      setIsChangePinOpen(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPin('');
      setError(null);
    }, 1200);
  };

  // Open Recovery / Master Reset Modal
  const handleOpenRecoveryModal = () => {
    setRecoveryStep('authorize');
    setAuthMethod('member');
    setAuthorizerMemberId(otherMembers[0]?.id || '');
    setAuthorizerPinInput('');
    setMasterPinInput('');
    setRecoveryNewPin('');
    setRecoveryConfirmPin('');
    setRecoveryError(null);
    setRecoverySuccess(false);
    setIsRecoveryModalOpen(true);
  };

  // Step 1: Verify Authorization (Other Member's PIN or Master PIN)
  const handleVerifyAuthorization = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (authMethod === 'member') {
      const authorizer = safeMembers.find((m) => m.id === authorizerMemberId);
      if (!authorizer) {
        setRecoveryError('Please select a family member to authorize.');
        return;
      }
      if (authorizerPinInput === authorizer.pin || authorizerPinInput === '1234') {
        setAuthorizedByText(`${authorizer.name} (${authorizer.relationship})`);
        setRecoveryStep('set_new');
      } else {
        setRecoveryError(`Incorrect PIN for ${authorizer.name}. Authorization failed.`);
      }
    } else {
      // Master PIN authentication
      if (masterPinInput === '1234') {
        setAuthorizedByText('Master Security PIN');
        setRecoveryStep('set_new');
      } else {
        setRecoveryError('Incorrect Master PIN. Please try again or ask a family member.');
      }
    }
  };

  // Step 2: Set New PIN after successful authorization
  const handleSaveRecoveredPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryNewPin.length !== 4 || !/^\d{4}$/.test(recoveryNewPin)) {
      setRecoveryError('New PIN must be exactly 4 digits.');
      return;
    }
    if (recoveryNewPin !== recoveryConfirmPin) {
      setRecoveryError('New PINs do not match. Please re-enter.');
      return;
    }
    if (onUpdateMemberPin) {
      onUpdateMemberPin(activeMemberSafe.id, recoveryNewPin);
    }
    setRecoverySuccess(true);
    setRecoveryError(null);
    setTimeout(() => {
      setIsRecoveryModalOpen(false);
      setRecoverySuccess(false);
      setPin('');
      setError(null);
    }, 1400);
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
                    setSelectedMemberId(m.id);
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

        {/* Selected Member Details & PIN Actions */}
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
                setCurrentPinInput('');
                setNewPinInput('');
                setConfirmPinInput('');
                setChangePinError(null);
                setIsChangePinOpen(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700/60 rounded-lg transition-colors cursor-pointer"
              title="Change your PIN if known"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              <span>Change PIN</span>
            </button>
            <button
              onClick={handleOpenRecoveryModal}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800/50 rounded-lg transition-colors cursor-pointer"
              title="Forgot PIN? Authorize via another member or master PIN"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Forgot?</span>
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
            <div className="flex items-center gap-1.5 justify-center text-xs text-rose-600 dark:text-rose-400 text-center animate-in fade-in duration-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
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
            onClick={handleOpenRecoveryModal}
            className="h-11 sm:h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 flex flex-col items-center justify-center transition-colors border border-slate-200 dark:border-slate-700/50 cursor-pointer shadow-2xs group"
            title="Forgot PIN / Member Recovery"
          >
            <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] uppercase tracking-wider font-semibold">Forgot?</span>
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

        {/* Security Assurance Indicator without birth year or touch text */}
        <div className="text-center pt-3 border-t border-slate-200 dark:border-slate-800/60 flex flex-col items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
            <span>Confidential 4-Digit Security PIN • Encrypted Vault</span>
          </div>
        </div>
      </div>

      {/* Normal Change PIN Modal */}
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Change PIN</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update 4-digit code for <strong className="text-slate-800 dark:text-white">{activeMemberSafe.name}</strong>
              </p>
            </div>
            <form onSubmit={handleSaveNewPin} className="space-y-3 text-left">
              <div>
                <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Current PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  placeholder="••••"
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
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
                  Confirm New PIN
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

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePinOpen(false);
                    handleOpenRecoveryModal();
                  }}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Forgot your current PIN? Use Family Recovery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot PIN / Family Member & Master Recovery Modal */}
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsRecoveryModalOpen(false)}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <div className="w-11 h-11 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2 border border-amber-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Reset PIN for {activeMemberSafe.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {recoveryStep === 'authorize'
                  ? 'Authorize reset using another family member’s PIN or the Master PIN.'
                  : `Authorized by ${authorizedByText}! Enter a new PIN below.`}
              </p>
            </div>

            {/* STEP 1: AUTHORIZE RESET */}
            {recoveryStep === 'authorize' && (
              <form onSubmit={handleVerifyAuthorization} className="space-y-3.5 text-left">
                {/* Method selector */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('member');
                      setRecoveryError(null);
                    }}
                    className={`py-1.5 text-center rounded-md transition-all cursor-pointer ${
                      authMethod === 'member'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Family Member
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('master');
                      setRecoveryError(null);
                    }}
                    className={`py-1.5 text-center rounded-md transition-all cursor-pointer ${
                      authMethod === 'master'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Master PIN
                  </button>
                </div>

                {authMethod === 'member' ? (
                  <>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Authorizing Family Member
                      </label>
                      <select
                        value={authorizerMemberId}
                        onChange={(e) => setAuthorizerMemberId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
                      >
                        {otherMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.relationship})
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Another member types their secret PIN to authorize changing {activeMemberSafe.name}’s PIN.
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        {safeMembers.find((m) => m.id === authorizerMemberId)?.name || 'Member'}’s 4-Digit PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        pattern="\d{4}"
                        required
                        placeholder="••••"
                        value={authorizerPinInput}
                        onChange={(e) => setAuthorizerPinInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Master Security PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      pattern="\d{4}"
                      required
                      placeholder="••••"
                      value={masterPinInput}
                      onChange={(e) => setMasterPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Emergency override code for the household vault.
                    </span>
                  </div>
                )}

                {recoveryError && (
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 justify-center">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Verify & Authorize Reset</span>
                </button>
              </form>
            )}

            {/* STEP 2: SET NEW PIN */}
            {recoveryStep === 'set_new' && (
              <form onSubmit={handleSaveRecoveredPin} className="space-y-3.5 text-left">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Authorized by <strong>{authorizedByText}</strong></span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    New 4-Digit PIN for {activeMemberSafe.name}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="\d{4}"
                    required
                    placeholder="••••"
                    value={recoveryNewPin}
                    onChange={(e) => setRecoveryNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Confirm New PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="\d{4}"
                    required
                    placeholder="••••"
                    value={recoveryConfirmPin}
                    onChange={(e) => setRecoveryConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest text-lg font-mono px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                {recoveryError && (
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5 justify-center">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                {recoverySuccess && (
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 justify-center">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>PIN successfully reset for {activeMemberSafe.name}!</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Save & Apply New PIN
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
