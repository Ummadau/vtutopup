import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Phone, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { NetworkBadge } from './NetworkBadge.tsx';
import { PinModal } from './PinModal.tsx';
import { DataPlan, NetworkType, Transaction, UserRole } from '../types/index.ts';
import { updateWalletBalance } from '../lib/firebaseService.ts';

interface BuyDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  userPhone: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userPin?: string;
  walletBalance: number;
  onPurchaseSuccess: (tx: Transaction, newBalance?: number) => void;
  onError?: (error: any, context?: any) => void;
}

export const BuyDataModal: React.FC<BuyDataModalProps> = ({
  isOpen,
  onClose,
  userRole,
  userPhone,
  userId,
  userEmail,
  userName,
  userPin,
  walletBalance,
  onPurchaseSuccess,
  onError,
}) => {
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>('mtn');
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('mtn_dir_5gb');
  const [planCategory, setPlanCategory] = useState<'All' | 'Direct' | 'SME' | 'Corporate'>('All');
  const [phone, setPhone] = useState(userPhone || '08012345678');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pinModalError, setPinModalError] = useState<string | null>(null);

  // Fetch plans
  useEffect(() => {
    if (!isOpen) return;
    const fetchPlans = async () => {
      try {
        const res = await fetch(`/api/services/data/plans?network=${selectedNetwork}`);
        const data = await res.json();
        if (data.plans) {
          setPlans(data.plans);
          if (data.plans.length > 0) {
            const defaultMatch = data.plans.find((p: any) => p.id === 'mtn_dir_5gb') || data.plans[0];
            setSelectedPlanId(defaultMatch.id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchPlans();
  }, [isOpen, selectedNetwork]);

  if (!isOpen) return null;

  const currentPlan = plans.find(p => p.id === selectedPlanId);
  const priceToPay = currentPlan
    ? (userRole === 'reseller' ? currentPlan.resellerPrice : currentPlan.customerPrice)
    : 0;

  const filteredPlans = plans.filter(p => {
    if (planCategory === 'All') return true;
    return p.planType === planCategory;
  });

  const handleProceedClick = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 11-digit Nigerian phone number');
      return;
    }
    if (!currentPlan) {
      setErrorMessage('Please select a data plan');
      return;
    }
    if (walletBalance < priceToPay) {
      setErrorMessage(`Insufficient wallet balance (₦${walletBalance.toLocaleString()}). Please fund your wallet.`);
      return;
    }

    setShowConfirm(true);
  };

  const handleExecutePurchaseWithPin = async (pin: string) => {
    setLoading(true);
    setErrorMessage(null);
    setPinModalError(null);

    try {
      const activePlanCode = currentPlan?.plan_id || currentPlan?.planCode || selectedPlanId;
      const res = await fetch('/api/services/data/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          plan_id: activePlanCode,
          planCode: activePlanCode,
          recipientPhone: phone,
          network: selectedNetwork,
          pin,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const failMsg = data.message || data.error || 'Provider connection failed: No communication with VTU gateway.';
      const isPinError = !res.ok && (failMsg.toLowerCase().includes('pin') || failMsg.toLowerCase().includes('incorrect'));

      if (isPinError) {
        setPinModalError('Incorrect 4-digit transaction PIN. Please try again.');
        return;
      }

      // Valid PIN entered: dismiss PIN and Confirmation dialogs and close modal immediately
      setShowPinModal(false);
      setShowConfirm(false);
      onClose();

      if (!res.ok || !data.success) {
        const failedTx: Transaction = data.transaction || {
          id: `tx_${Date.now()}`,
          reference: data.reference || `NDS-DAT-${Date.now()}`,
          userId: userId || 'user',
          userName: 'User',
          userEmail: '',
          userPhone: phone,
          userRole,
          serviceType: 'data',
          network: selectedNetwork,
          planName: currentPlan?.name || `${selectedNetwork.toUpperCase()} Data Plan`,
          recipient: phone,
          amount: priceToPay,
          providerCost: 0,
          profit: 0,
          status: 'failed',
          failureReason: failMsg,
          date: new Date().toISOString(),
        };

        if (userId && data.balance !== undefined) {
          updateWalletBalance(userId, data.balance).catch(() => {});
        }

        if (onError) {
          onError(failMsg, { serviceName: currentPlan?.name || `${selectedNetwork.toUpperCase()} Data Plan`, reference: failedTx.reference });
        }
        onPurchaseSuccess(failedTx, data.balance ?? walletBalance);
        return;
      }

      // Synchronous update to user wallet balance in Firestore immediately upon successful response
      if (userId && data.balance !== undefined) {
        updateWalletBalance(userId, data.balance).catch(() => {});
      }

      onPurchaseSuccess(data.transaction, data.balance);
    } catch (err: any) {
      setShowPinModal(false);
      setShowConfirm(false);
      onClose();

      const failedTx: Transaction = {
        id: `tx_${Date.now()}`,
        reference: `NDS-DAT-${Date.now()}`,
        userId: userId || 'user',
        userName: 'User',
        userEmail: '',
        userPhone: phone,
        userRole,
        serviceType: 'data',
        network: selectedNetwork,
        planName: currentPlan?.name || `${selectedNetwork.toUpperCase()} Data Plan`,
        recipient: phone,
        amount: priceToPay,
        providerCost: 0,
        profit: 0,
        status: 'failed',
        failureReason: `Network error: ${err.message || 'No communication with server'}. Your wallet was not charged.`,
        date: new Date().toISOString(),
      };

      if (onError) {
        onError(failedTx.failureReason, { serviceName: currentPlan?.name || `${selectedNetwork.toUpperCase()} Data Plan`, reference: failedTx.reference });
      }
      onPurchaseSuccess(failedTx, walletBalance);
    } finally {
      setLoading(false);
    }
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
            <span className="text-sm font-black tracking-wider uppercase">NAEEM DATA SUB</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Buy Data</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select a network and data plan</p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Network Selector Cards matching design */}
          <div className="grid grid-cols-4 gap-2.5">
            {(['mtn', 'airtel', 'glo', '9mobile'] as NetworkType[]).map((net) => (
              <NetworkBadge
                key={net}
                network={net}
                selected={selectedNetwork === net}
                onClick={() => setSelectedNetwork(net)}
              />
            ))}
          </div>

          {/* Plan Category Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            {(['All', 'Direct', 'SME', 'Corporate'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setPlanCategory(cat)}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  planCategory === cat
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Data Plans List matching design mockup */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Select Data Plan
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {filteredPlans.map((plan) => {
                const planPrice = userRole === 'reseller' ? plan.resellerPrice : plan.customerPrice;
                const isSelected = selectedPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-purple-600" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">
                          {plan.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {plan.validity} • {plan.planType}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        ₦{planPrice.toLocaleString()}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recipient Phone input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Phone Number
              </label>
              <button
                type="button"
                onClick={() => setPhone(userPhone)}
                className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline"
              >
                Use My Number
              </button>
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-purple-600"
                required
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleProceedClick}
            className="w-full py-3.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition text-sm"
          >
            <span>Proceed to Pay ₦{priceToPay.toLocaleString()}</span>
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && currentPlan && (
          <div className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 border border-purple-200 dark:border-purple-800 animate-scale-up">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 mx-auto flex items-center justify-center mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">Confirm Purchase</h4>
                <p className="text-xs text-slate-500">Please review your data purchase details</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Network:</span>
                  <span className="font-bold uppercase text-slate-800 dark:text-slate-200">{selectedNetwork}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data Plan:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currentPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient:</span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-400">{phone}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Total Amount:</span>
                  <span className="font-black text-purple-700 dark:text-purple-400">₦{priceToPay.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPinModal(true)}
                  className="flex-1 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center"
                >
                  Confirm & Pay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4-Digit Transaction PIN Modal */}
        <PinModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false);
            setShowConfirm(false);
          }}
          onConfirm={handleExecutePurchaseWithPin}
          loading={loading}
          amount={priceToPay}
          recipient={phone}
          externalError={pinModalError}
          userId={userId}
          userEmail={userEmail}
          userName={userName}
          userPin={userPin}
        />
      </div>
    </div>
  );
};
