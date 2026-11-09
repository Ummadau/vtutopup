import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, ArrowLeft, X, CheckCircle2, Fingerprint, Sparkles } from 'lucide-react';
import { authenticateWithBiometrics, registerBiometricAuth, getStoredBiometricCredential } from '../lib/webauthn.ts';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  loading?: boolean;
  title?: string;
  amount?: number;
  recipient?: string;
  externalError?: string | null;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userPin?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'Enter Transaction PIN',
  amount,
  recipient,
  externalError,
  userId,
  userEmail,
  userName,
  userPin = '1234',
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [bioLoading, setBioLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(externalError || null);
    }
  }, [isOpen, externalError]);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (loading) return;
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4) {
        onConfirm(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) {
      setError('Please enter your complete 4-digit PIN');
      return;
    }
    onConfirm(pin);
  };

  const handleBiometricAuth = async () => {
    const activeUserId = userId || 'usr_ahmad_01';
    setBioLoading(true);
    setError(null);

    const stored = getStoredBiometricCredential(activeUserId);
    if (!stored) {
      const reg = await registerBiometricAuth({
        id: activeUserId,
        email: userEmail || 'user@naeemdatasub.ng',
        name: userName || 'Ahmad Naim',
      });
      setBioLoading(false);
      if (reg.success) {
        onConfirm(userPin);
      } else {
        setError(reg.message || 'Biometric registration failed. Please enter PIN.');
      }
      return;
    }

    const res = await authenticateWithBiometrics(activeUserId);
    setBioLoading(false);

    if (res.success) {
      onConfirm(userPin);
    } else {
      setError(res.message || 'Biometric authorization failed. Please enter 4-digit PIN.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Authorize Payment
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction Brief */}
        {(amount !== undefined || recipient) && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-1 text-center">
            {amount !== undefined && (
              <span className="text-2xl font-black text-purple-700 dark:text-purple-400 block">
                ₦{amount.toLocaleString()}
              </span>
            )}
            {recipient && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono block">
                Recipient: {recipient}
              </span>
            )}
          </div>
        )}

        <div className="text-center space-y-1">
          <h3 className="text-base font-black text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter your 4-digit transaction PIN to complete payment
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-center text-rose-700 dark:text-rose-300 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Optional Biometric Touch ID / Face ID */}
        {getStoredBiometricCredential(userId || 'usr_ahmad_01') && (
          <button
            type="button"
            onClick={handleBiometricAuth}
            disabled={loading || bioLoading}
            className="w-full py-2.5 px-3 rounded-2xl bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200 font-bold text-xs flex items-center justify-center gap-2 border border-purple-200 dark:border-purple-800 transition active:scale-98 disabled:opacity-60"
          >
            {bioLoading ? (
              <div className="w-4 h-4 border-2 border-purple-700 dark:border-purple-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Fingerprint className="w-4 h-4 text-purple-700 dark:text-purple-300" />
            )}
            <span>Authorize with Touch ID / Face ID</span>
          </button>
        )}

        {/* 4 PIN Dots */}
        <div className="flex justify-center items-center gap-3 py-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-10 h-12 rounded-2xl border-2 flex items-center justify-center text-xl font-bold font-mono transition-all ${
                pin.length > index
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-white'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
              }`}
            >
              {pin.length > index ? '•' : ''}
            </div>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/50 text-slate-900 dark:text-white font-black text-lg transition active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 font-bold text-xs"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/50 text-slate-900 dark:text-white font-black text-lg transition active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            ⌫
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || pin.length !== 4}
            onClick={() => handleSubmit()}
            className="flex-1 py-3 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-900/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Confirm PIN</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

