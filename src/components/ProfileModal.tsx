import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Camera,
  Lock,
  Users,
  Clock,
  MessageSquare,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Copy,
  Check,
  Award,
  Fingerprint
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { firestoreDb, auth, apiFetch } from '../lib/firebase.ts';
import { User } from '../types/index.ts';
import { registerBiometricAuth, getStoredBiometricCredential } from '../lib/webauthn.ts';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onOpenTransactions: () => void;
  onOpenSupport: () => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onOpenTransactions,
  onOpenSupport,
  onLogout,
}) => {
  const [showReferralDetails, setShowReferralDetails] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Referred users state from Firestore
  const [referredUsersList, setReferredUsersList] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  // Transaction PIN state
  const [showPinChange, setShowPinChange] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Biometric state
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricMsg, setBiometricMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRegisterBiometrics = async () => {
    setBiometricLoading(true);
    setBiometricMsg(null);
    const res = await registerBiometricAuth({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    setBiometricLoading(false);
    if (res.success) {
      user.biometricCredentialId = res.credentialId;
      setBiometricMsg({ type: 'success', text: res.message || 'Biometrics Touch ID / Face ID registered successfully!' });
    } else {
      setBiometricMsg({ type: 'error', text: res.message || 'Biometric registration failed.' });
    }
  };

  useEffect(() => {
    if (isOpen && showReferralDetails) {
      fetchReferredUsers();
    }
  }, [isOpen, showReferralDetails, user.referralCode]);

  const fetchReferredUsers = async () => {
    setLoadingReferrals(true);
    try {
      const res = await apiFetch('/api/user/referrals', {
        headers: { 'x-user-id': user.id },
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success && data.referredUsers) {
          setReferredUsersList(data.referredUsers);
          return;
        }
      }

      setReferredUsersList([]);
    } catch (err) {
      console.warn('Referred users fetch note:', err);
    } finally {
      setLoadingReferrals(false);
    }
  };

  if (!isOpen) return null;

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (!newPinInput || !/^\d{4}$/.test(newPinInput)) {
      setPinMessage({ type: 'error', text: 'New PIN must be 4 digits (e.g. 1234)' });
      return;
    }

    setPinLoading(true);
    try {
      const res = await apiFetch('/api/auth/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          currentPin: currentPinInput,
          newPin: newPinInput,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPinMessage({ type: 'error', text: data.error || 'Failed to update PIN' });
      } else {
        setPinMessage({ type: 'success', text: '4-Digit Transaction PIN updated successfully!' });
        user.transactionPin = newPinInput;
        setCurrentPinInput('');
        setNewPinInput('');
        setTimeout(() => setPinMessage(null), 3000);
      }
    } catch (err: any) {
      setPinMessage({ type: 'error', text: err.message || 'Error connecting to server' });
    } finally {
      setPinLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (!newPasswordInput || newPasswordInput.length < 6) {
      setPassMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setPassMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setPassLoading(true);
    try {
      let updated = false;
      if (auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, newPasswordInput);
          updated = true;
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/requires-recent-login') {
            throw new Error('For security, please log out and log back in before changing your password.');
          }
          throw new Error(fbErr.message || 'Failed to update password.');
        }
      }

      if (!updated) {
        throw new Error('Password updates require an active email or Google sign-in session.');
      }

      setPassMessage({ type: 'success', text: 'Account password updated successfully!' });
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
      setTimeout(() => setPassMessage(null), 3500);
    } catch (err: any) {
      setPassMessage({ type: 'error', text: err.message || 'Unable to update password.' });
    } finally {
      setPassLoading(false);
    }
  };

  const referralLink = `${window.location.origin}/?ref=${user.referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 p-4 text-white flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <span className="text-sm font-black tracking-wider uppercase">NPAY</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Profile Content matching the mockup */}
        <div className="p-5 overflow-y-auto space-y-5">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">My Profile</h2>

          {/* Avatar with Camera badge */}
          <div className="flex flex-col items-center justify-center pt-1 pb-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-500 p-1 shadow-lg shadow-purple-600/30">
                <div className="w-full h-full rounded-full bg-purple-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-purple-900 font-black text-2xl">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    user.name.slice(0, 2).toUpperCase()
                  )}
                </div>
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-purple-700 text-white flex items-center justify-center shadow-md hover:bg-purple-800 transition"
                title="Change Avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 mt-2.5">
              <span className="text-base font-black text-slate-900 dark:text-white">{user.name}</span>
              {user.isVerified && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                  Verified
                </span>
              )}
            </div>

            <span className="text-xs text-purple-700 dark:text-purple-400 font-bold uppercase tracking-wider mt-0.5">
              {user.role} Tier
            </span>
          </div>

          {/* Profile Information List matching design mockup */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Full Name</span>
              <span className="font-bold text-slate-900 dark:text-white">{user.name}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Phone Number</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{user.phone}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Email Address</span>
              <span className="font-bold text-slate-900 dark:text-white">{user.email}</span>
            </div>
          </div>

          {/* Action List items with chevrons matching mockup */}
          <div className="space-y-2">
            {/* Change Password */}
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold transition text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <span>Change Password</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {showPasswordChange && (
              <form onSubmit={handleUpdatePassword} className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2 text-xs">
                {passMessage && (
                  <div className={`p-2 rounded-xl text-[11px] font-bold ${passMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {passMessage.text}
                  </div>
                )}
                <input
                  type="password"
                  minLength={6}
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="New Password (min 6 characters)"
                  className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                />
                <input
                  type="password"
                  minLength={6}
                  required
                  value={confirmNewPasswordInput}
                  onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={passLoading}
                  className="w-full py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {passLoading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            )}

            {/* Change Transaction PIN */}
            <button
              onClick={() => setShowPinChange(!showPinChange)}
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold transition text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>Change Transaction PIN (4 Digits)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {showPinChange && (
              <form onSubmit={handleUpdatePin} className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2 text-xs">
                <p className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">Default PIN for all accounts is <span className="font-mono font-bold">1234</span></p>
                {pinMessage && (
                  <div className={`p-2 rounded-xl text-[11px] font-bold ${pinMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {pinMessage.text}
                  </div>
                )}
                <input
                  type="password"
                  maxLength={4}
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  placeholder="Current 4-Digit PIN (default 1234)"
                  className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                />
                <input
                  type="password"
                  maxLength={4}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="New 4-Digit PIN"
                  className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  required
                />
                <button
                  type="submit"
                  disabled={pinLoading}
                  className="w-full py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {pinLoading ? 'Updating PIN...' : 'Save New Transaction PIN'}
                </button>
              </form>
            )}

            {/* Biometric Touch ID / Face ID Authentication */}
            <button
              onClick={() => setShowBiometricSetup(!showBiometricSetup)}
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold transition text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block">Biometric Auth (Touch ID / Face ID)</span>
                  <span className="text-[10px] text-slate-400 font-normal block">
                    {getStoredBiometricCredential(user.id) || user.biometricCredentialId
                      ? 'Enabled & Configured'
                      : 'Not configured'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {showBiometricSetup && (
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2.5 text-xs">
                <p className="text-[11px] text-purple-900 dark:text-purple-300 font-medium">
                  Register your device fingerprint sensor or Face ID to authorize payments and log in conveniently.
                </p>

                {biometricMsg && (
                  <div className={`p-2.5 rounded-xl text-[11px] font-bold ${biometricMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {biometricMsg.text}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRegisterBiometrics}
                  disabled={biometricLoading}
                  className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {biometricLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>{getStoredBiometricCredential(user.id) ? 'Re-Register Touch ID / Face ID' : 'Activate Touch ID / Face ID'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Referral Program */}
            <button
              onClick={() => setShowReferralDetails(!showReferralDetails)}
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold transition text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span>Referral Program</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {showReferralDetails && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3 text-xs animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-900 dark:text-emerald-300 font-bold">Total Referral Earnings:</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">₦{user.referralEarnings.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{user.referralCode}</span>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>

                {/* Firestore Referred Users & Commission Log Section */}
                <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      Referred Users & Commission Log
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                      {referredUsersList.length} Referred
                    </span>
                  </div>

                  {loadingReferrals ? (
                    <div className="text-center py-3 text-slate-500 text-xs font-medium">
                      Loading referred users from Firestore...
                    </div>
                  ) : referredUsersList.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                      {referredUsersList.map((refUser) => (
                        <div
                          key={refUser.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0">
                              {refUser.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white block truncate">{refUser.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                Joined: {new Date(refUser.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 block">
                              +₦{(refUser.commissionEarned || 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                              {refUser.totalTransactionsCount || 0} purchases
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center rounded-xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-emerald-200 dark:border-emerald-800 text-[11px] text-slate-500">
                      No referred users registered with code <span className="font-bold font-mono">{user.referralCode}</span> yet.
                      Share your referral link above to earn 5% bonus commission on wallet top-ups!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transaction History */}
            <button
              onClick={() => { onClose(); onOpenTransactions(); }}
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold transition text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span>Transaction History</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Support Tickets */}
            <button
              onClick={() => { onClose(); onOpenSupport(); }}
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold transition text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span>Support Tickets</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Logout */}
            <button
              onClick={() => { onClose(); onLogout(); }}
              className="w-full p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs font-bold transition mt-4"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
