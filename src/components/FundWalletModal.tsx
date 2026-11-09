import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Landmark,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  Building2,
  ShieldCheck,
  Lock,
  MessageCircle,
  Send
} from 'lucide-react';
import { VirtualAccount, ManualFundingConfig } from '../types/index.ts';
import { getUser } from '../lib/firebaseService.ts';
import { hapticSuccess, hapticNavClick } from '../lib/haptics.ts';

interface FundWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  virtualAccounts: VirtualAccount[];
  userId?: string;
  onFundSuccess: () => void;
}

export const FundWalletModal: React.FC<FundWalletModalProps> = ({
  isOpen,
  onClose,
  virtualAccounts: initialVirtualAccounts,
  userId,
  onFundSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'bank_transfer' | 'gateway'>('bank_transfer');
  const [amount, setAmount] = useState('2000');
  const [gateway, setGateway] = useState<'Paystack' | 'Flutterwave'>('Paystack');
  const [loading, setLoading] = useState(false);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);
  
  // Real-time virtual accounts state synced with Firestore & API
  const [accounts, setAccounts] = useState<VirtualAccount[]>(initialVirtualAccounts || []);
  
  // Bank selection for generation
  type AllowedBankType = 'UNITYBILLS' | 'WEMA' | 'MONIEPOINT' | '9PSB' | 'SAFEHAVEN' | 'PROVIDUS' | 'PALMPAY';
  const [selectedBank, setSelectedBank] = useState<AllowedBankType>('UNITYBILLS');
  const [idType, setIdType] = useState<'nin' | 'bvn'>('nin');
  const [idNumber, setIdNumber] = useState('');
  const [isGeneratingAccount, setIsGeneratingAccount] = useState(false);
  const [showGenerateNewForm, setShowGenerateNewForm] = useState(false);

  // Manual funding state
  const [manualConfig, setManualConfig] = useState<ManualFundingConfig>({
    bankName: 'Moniepoint MFB',
    accountNumber: '8123456789',
    accountName: 'NAEEM DATA SUB OFFICIAL',
    supportWhatsapp: '+2348012345678',
    instructions: 'Transfer to the bank account above, then submit your payment reference for instant admin verification.',
  });
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualAmount, setManualAmount] = useState('5000');
  const [manualSenderName, setManualSenderName] = useState('');
  const [manualSenderBank, setManualSenderBank] = useState('');
  const [manualReference, setManualReference] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // PalmPay Verification Prompt Modal
  const [showPalmPayPromptModal, setShowPalmPayPromptModal] = useState(false);

  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchManualConfig = async () => {
    try {
      const res = await fetch('/api/wallet/manual-fund/config');
      const data = await res.json();
      if (data.config) {
        setManualConfig(data.config);
      }
    } catch (e) {}
  };

  // Fetch virtual accounts from Firestore and API on load / open
  const fetchUserVirtualAccounts = async () => {
    if (!isOpen) return;
    setIsFetchingAccounts(true);
    try {
      let fetchedAccs: VirtualAccount[] = [];

      // 1. Fetch from Firestore user document if userId is present
      if (userId) {
        const firestoreUser = await getUser(userId).catch(() => null);
        if (firestoreUser && firestoreUser.virtualAccounts && firestoreUser.virtualAccounts.length > 0) {
          fetchedAccs = firestoreUser.virtualAccounts;
        }
      }

      // 2. Fetch from backend API to ensure memory and Firestore consistency
      const res = await fetch('/api/wallet/virtual-account', {
        headers: userId ? { 'x-user-id': userId } : {},
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (data.virtualAccounts && data.virtualAccounts.length > 0) {
          const accMap = new Map<string, VirtualAccount>();
          [...fetchedAccs, ...data.virtualAccounts].forEach(a => accMap.set(a.accountNumber, a));
          fetchedAccs = Array.from(accMap.values());
        }
      }

      if (fetchedAccs.length > 0) {
        setAccounts(fetchedAccs);
      } else {
        setAccounts(initialVirtualAccounts || []);
      }
    } catch (err) {
      console.warn('Virtual account fetch notice:', err);
    } finally {
      setIsFetchingAccounts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserVirtualAccounts();
      fetchManualConfig();
    } else {
      setSuccessMessage(null);
      setErrorMessage(null);
      setShowGenerateNewForm(false);
      setShowPalmPayPromptModal(false);
      setShowManualForm(false);
    }
  }, [isOpen, userId]);

  // Submit manual funding request
  const handleManualFundingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingManual(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/wallet/manual-fund/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          amount: manualAmount,
          senderName: manualSenderName,
          senderBank: manualSenderBank,
          paymentReference: manualReference,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit manual funding request');

      setSuccessMessage('✓ Manual funding request submitted! Admin will verify and credit your wallet.');
      setShowManualForm(false);
      setManualSenderName('');
      setManualSenderBank('');
      setManualReference('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting manual funding request');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  if (!isOpen) return null;

  // Initiate BillStack / UnityBills dynamic virtual account generation
  const handleInitiateAccountGeneration = (bankToGenerate: AllowedBankType) => {
    setSelectedBank(bankToGenerate);
    setErrorMessage(null);
    setSuccessMessage(null);

    // If PalmPay selected, verify if 11-digit BVN or NIN is supplied
    if (bankToGenerate === 'PALMPAY') {
      if (!idNumber || idNumber.trim().length !== 11) {
        setShowPalmPayPromptModal(true);
        return;
      }
    }

    executeBillStackGeneration(bankToGenerate, idType, idNumber);
  };

  // Execute API call for virtual account reservation
  const executeBillStackGeneration = async (
    bank: AllowedBankType,
    overrideIdType?: 'nin' | 'bvn',
    overrideIdNumber?: string
  ) => {
    const finalIdType = overrideIdType || idType;
    const finalIdNum = (overrideIdNumber || idNumber).trim();

    if (bank === 'PALMPAY' && (!finalIdNum || finalIdNum.length !== 11)) {
      setErrorMessage('A valid 11-digit NIN or BVN is strictly required for PalmPay account generation.');
      setShowPalmPayPromptModal(true);
      return;
    }

    setIsGeneratingAccount(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/wallet/virtual-account/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          bank,
          idType: finalIdType,
          idNumber: finalIdNum ? finalIdNum : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.account) {
        throw new Error(data.error || data.message || 'Failed to generate virtual account');
      }

      const newAcc: VirtualAccount = data.account;
      
      // Update local state immediately
      setAccounts(prev => {
        const filtered = prev.filter(a => a.accountNumber !== newAcc.accountNumber);
        return [newAcc, ...filtered];
      });

      setSuccessMessage(`✓ Dedicated ${newAcc.bankName} Account Reserved: ${newAcc.accountNumber}`);
      setShowGenerateNewForm(false);
      setShowPalmPayPromptModal(false);
      onFundSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error generating virtual account');
    } finally {
      setIsGeneratingAccount(false);
    }
  };

  const handleCopy = (accNum: string) => {
    navigator.clipboard.writeText(accNum);
    setCopiedAccount(accNum);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  // Process gateway funding (Paystack / Flutterwave)
  const handleGatewayFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      setErrorMessage('Minimum funding amount is ₦100');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const initRes = await fetch('/api/wallet/fund/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({ amount: numAmount, gateway }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || 'Initiation failed');

      const verifyRes = await fetch('/api/wallet/fund/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          reference: initData.reference,
          amount: numAmount,
          gateway,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

      hapticSuccess();
      setSuccessMessage(`Payment confirmed! ₦${numAmount.toLocaleString()} credited via ${gateway}.`);
      setTimeout(() => {
        onFundSuccess();
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasGeneratedAccounts = accounts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Fund Your Wallet</h3>
            <p className="text-xs text-purple-200">Instant automated credit via BillStack virtual accounts</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-2 p-2 bg-slate-100 dark:bg-slate-800 m-4 rounded-2xl gap-2">
          <button
            type="button"
            onClick={() => {
              hapticNavClick();
              setActiveTab('bank_transfer');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'bank_transfer'
                ? 'bg-white dark:bg-slate-700 text-purple-800 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Bank Transfer (Free)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              hapticNavClick();
              setActiveTab('gateway');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'gateway'
                ? 'bg-white dark:bg-slate-700 text-purple-800 dark:text-purple-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Card / Online</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 pt-0 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-pulse">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'bank_transfer' ? (
            <div className="space-y-4">
              {isFetchingAccounts ? (
                <div className="p-6 text-center text-xs text-purple-600 font-bold flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                  <span>Loading your virtual account from Firestore...</span>
                </div>
              ) : hasGeneratedAccounts ? (
                /* ==================== CONDITION 1: USER ALREADY HAS GENERATED ACCOUNTS ==================== */
                <div className="space-y-4">
                  <div className="bg-purple-50 dark:bg-purple-950/40 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                    <p className="text-xs font-semibold text-purple-900 dark:text-purple-300 leading-relaxed">
                      💡 Transfer to your dedicated account below. Wallet credits automatically within seconds!
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 shrink-0 ml-2">
                      Active
                    </span>
                  </div>

                  {/* Render Existing Virtual Account Cards (SIMULATE DEPOSIT BUTTON REMOVED AS REQUESTED) */}
                  <div className="space-y-3">
                    {accounts.map((acc, idx) => (
                      <div
                        key={acc.accountNumber || idx}
                        className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-white dark:bg-slate-800/80 shadow-sm relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                              {acc.bankName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                              BillStack Dedicated
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(acc.accountNumber)}
                            className="flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition cursor-pointer"
                          >
                            {copiedAccount === acc.accountNumber ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Account Number Display */}
                        <div className="mt-3">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Dedicated Account Number</div>
                          <div className="font-mono text-2xl font-black text-slate-900 dark:text-white tracking-widest my-0.5 select-all">
                            {acc.accountNumber}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            Account Name: <span className="font-bold text-slate-900 dark:text-slate-100">{acc.accountName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Option to generate additional bank account */}
                  {!showGenerateNewForm ? (
                    <button
                      type="button"
                      onClick={() => setShowGenerateNewForm(true)}
                      className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Generate Account for Another Bank (e.g. UnityBills, Wema, Moniepoint, PalmPay)</span>
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                          Select Additional Partner Bank:
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowGenerateNewForm(false)}
                          className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'UNITYBILLS', label: 'UnityBills Direct', desc: 'Instant Routing' },
                          { id: 'WEMA', label: 'Wema Bank', desc: 'NUBAN Account' },
                          { id: 'MONIEPOINT', label: 'Moniepoint MFB', desc: 'Instant Deposit' },
                          { id: '9PSB', label: '9PSB Bank', desc: 'Instant NUBAN' },
                          { id: 'SAFEHAVEN', label: 'Safehaven MFB', desc: 'High Reliability' },
                          { id: 'PROVIDUS', label: 'Providus Bank', desc: 'Commercial' },
                          { id: 'PALMPAY', label: 'PalmPay Bank', desc: 'NIN / BVN' },
                        ].map(b => (
                          <button
                            key={b.id}
                            type="button"
                            disabled={isGeneratingAccount}
                            onClick={() => handleInitiateAccountGeneration(b.id as AllowedBankType)}
                            className="py-2.5 px-2.5 rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 cursor-pointer text-center"
                          >
                            <span className="font-bold text-slate-900 dark:text-white hover:text-white">{b.label}</span>
                            <span className="text-[9px] font-medium text-purple-600 dark:text-purple-300 hover:text-purple-100">{b.desc} • + Reserve</span>
                          </button>
                        ))}
                      </div>

                      {isGeneratingAccount && (
                        <p className="text-xs font-bold text-purple-600 text-center animate-pulse pt-1">
                          Creating dedicated account with provider gateway...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* ==================== CONDITION 2: NO VIRTUAL ACCOUNT GENERATED YET ==================== */
                <div className="p-5 rounded-3xl border border-purple-200 dark:border-purple-800 bg-gradient-to-b from-purple-50/80 to-white dark:from-purple-950/30 dark:to-slate-900 space-y-4 shadow-sm">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center mx-auto shadow-inner">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      Generate Dedicated Virtual Account
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Create an automated account powered by BillStack. Money transferred to this account will credit your wallet instantly!
                    </p>
                  </div>

                  {/* Bank Selection Grid */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      1. Select Partner Bank
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'UNITYBILLS', name: 'UnityBills Direct', desc: 'Instant account via UnityBills.ng' },
                        { id: 'WEMA', name: 'Wema Bank', desc: 'Dedicated NUBAN' },
                        { id: 'MONIEPOINT', name: 'Moniepoint MFB', desc: 'Instant deposit routing' },
                        { id: '9PSB', name: '9PSB Bank', desc: 'Instant account generation' },
                        { id: 'SAFEHAVEN', name: 'Safehaven MFB (SH)', desc: 'High reliability rail' },
                        { id: 'PROVIDUS', name: 'Providus Bank', desc: 'Commercial bank account' },
                        { id: 'PALMPAY', name: 'PalmPay Bank', desc: 'Requires NIN or BVN' },
                      ].map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBank(b.id as any);
                            if (b.id === 'PALMPAY' && (!idNumber || idNumber.length !== 11)) {
                              setShowPalmPayPromptModal(true);
                            }
                          }}
                          className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                            selectedBank === b.id
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 ring-2 ring-purple-600 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{b.name}</span>
                            <div className={`w-2.5 h-2.5 rounded-full ${selectedBank === b.id ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1">{b.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inline Identity Field Section for UnityBills / PalmPay */}
                  {(selectedBank === 'PALMPAY' || selectedBank === 'UNITYBILLS') && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span>{selectedBank} Identity Verification (Select NIN or BVN)</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">ID Type</label>
                          <select
                            value={idType}
                            onChange={e => setIdType(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            <option value="nin">NIN (National Identity Number)</option>
                            <option value="bvn">BVN (Bank Verification Number)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">11-Digit {idType.toUpperCase()}</label>
                          <input
                            type="text"
                            maxLength={11}
                            placeholder="e.g. 22113344556"
                            value={idNumber}
                            onChange={e => setIdNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    type="button"
                    disabled={isGeneratingAccount}
                    onClick={() => handleInitiateAccountGeneration(selectedBank)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50 text-xs cursor-pointer"
                  >
                    {isGeneratingAccount ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Generating Dedicated Account via BillStack API...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-purple-200" />
                        <span>Generate {selectedBank} Virtual Account Now</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ==================== MANUAL FUNDING CONTAINER ==================== */}
              <div className="p-4 rounded-3xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-b from-indigo-50/60 to-white dark:from-indigo-950/40 dark:to-slate-900 space-y-3.5 shadow-sm mt-4">
                <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Manual Bank Transfer (Admin Credit)
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Direct transfer to Admin Bank Account</span>
                    </div>
                  </div>

                  {/* Contact Admin WhatsApp Button */}
                  <a
                    href={`https://wa.me/${(manualConfig.supportWhatsapp || '+2348012345678').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello Admin, I want to submit a manual bank transfer funding request for NAEEM DATA SUB.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Contact Admin</span>
                  </a>
                </div>

                {/* Admin Bank Details Card with Copy Icon */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                      {manualConfig.bankName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(manualConfig.accountNumber);
                        setCopiedAccount(`manual_${manualConfig.accountNumber}`);
                        setTimeout(() => setCopiedAccount(null), 2000);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition cursor-pointer"
                      title="Copy Account Number"
                    >
                      {copiedAccount === `manual_${manualConfig.accountNumber}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Account No</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Admin Account Number</div>
                    <div className="font-mono text-xl font-black text-slate-900 dark:text-white tracking-widest my-0.5 select-all">
                      {manualConfig.accountNumber}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Account Name: <span className="font-bold text-slate-900 dark:text-slate-100">{manualConfig.accountName}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Proof / Funding Request Button & Form */}
                {!showManualForm ? (
                  <button
                    type="button"
                    onClick={() => setShowManualForm(true)}
                    className="w-full py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Payment Proof to Admin for Verification</span>
                  </button>
                ) : (
                  <form onSubmit={handleManualFundingSubmit} className="space-y-3 pt-2 border-t border-indigo-100 dark:border-indigo-800/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        Submit Manual Transfer Request:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowManualForm(false)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Amount Paid (₦)</label>
                        <input
                          type="number"
                          min="100"
                          required
                          value={manualAmount}
                          onChange={e => setManualAmount(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Sender Name</label>
                        <input
                          type="text"
                          required
                          value={manualSenderName}
                          onChange={e => setManualSenderName(e.target.value)}
                          placeholder="e.g. Ahmad Naim"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Sender Bank</label>
                        <input
                          type="text"
                          required
                          value={manualSenderBank}
                          onChange={e => setManualSenderBank(e.target.value)}
                          placeholder="e.g. Kuda / Access"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Transfer Reference / Note</label>
                        <input
                          type="text"
                          required
                          value={manualReference}
                          onChange={e => setManualReference(e.target.value)}
                          placeholder="e.g. Session ID or Reference"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingManual}
                      className="w-full py-2.5 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingManual ? 'Submitting Request...' : 'Confirm & Notify Admin for Manual Credit'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleGatewayFund} className="space-y-4">
              {/* Payment Gateway Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Gateway
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGateway('Paystack')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      gateway === 'Paystack'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-slate-900 dark:text-white text-sm">Paystack</span>
                      <span className="text-[11px] text-slate-500">Cards, USSD & QR</span>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setGateway('Flutterwave')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                      gateway === 'Flutterwave'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-slate-900 dark:text-white text-sm">Flutterwave</span>
                      <span className="text-[11px] text-slate-500">Cards & Bank Transfer</span>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Amount to Fund (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">₦</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    required
                  />
                </div>
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-2">
                {[1000, 2000, 5000, 10000, 20000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    ₦{val.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Proceed with {gateway}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ==================== PALMPAY PROMPT MODAL ==================== */}
      {showPalmPayPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedBank} Identity Verification
                </h3>
              </div>
              <button
                onClick={() => setShowPalmPayPromptModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {selectedBank} API requires an 11-digit <strong>NIN</strong> (National ID) or <strong>BVN</strong> (Bank Verification Number) to reserve a dedicated virtual account.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Select Verification Type (Send Either NIN or BVN)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIdType('nin')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      idType === 'nin'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 ring-1 ring-purple-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    NIN (National ID)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdType('bvn')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      idType === 'bvn'
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 ring-1 ring-purple-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    BVN (Bank Verification)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  2. Enter 11-Digit {idType.toUpperCase()}
                </label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder={`Enter 11-digit ${idType.toUpperCase()} (e.g. 22113344556)`}
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {idNumber.length}/11 digits entered
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPalmPayPromptModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={idNumber.trim().length !== 11 || isGeneratingAccount}
                onClick={() => executeBillStackGeneration(selectedBank, idType, idNumber)}
                className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {isGeneratingAccount ? 'Reserving...' : 'Submit & Reserve PalmPay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
