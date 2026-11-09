import React, { useState, useEffect } from 'react';
import { ArrowLeft, Phone, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { NetworkBadge } from './NetworkBadge.tsx';
import { PinModal } from './PinModal.tsx';
import { NetworkType, Transaction, UserRole } from '../types/index.ts';
import { updateWalletBalance } from '../lib/firebaseService.ts';

interface BuyAirtimeModalProps {
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

export const BuyAirtimeModal: React.FC<BuyAirtimeModalProps> = ({
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
  const [phone, setPhone] = useState(userPhone || '08012345678');
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pinModalError, setPinModalError] = useState<string | null>(null);

  const [airtimeDiscounts, setAirtimeDiscounts] = useState<Record<string, { customer: number; reseller: number; plan_id?: string }>>({
    mtn: { customer: 2.0, reseller: 3.5, plan_id: '1' },
    airtel: { customer: 2.0, reseller: 3.5, plan_id: '4' },
    glo: { customer: 2.0, reseller: 3.5, plan_id: '2' },
    '9mobile': { customer: 2.0, reseller: 3.5, plan_id: '3' },
  });

  // Fetch real-time airtime discounts from backend / admin config
  useEffect(() => {
    fetch('/api/services/airtime/discounts')
      .then(res => res.json())
      .then(data => {
        if (data.discounts && Array.isArray(data.discounts)) {
          const map: Record<string, { customer: number; reseller: number; plan_id?: string }> = {};
          data.discounts.forEach((d: any) => {
            map[d.network] = {
              customer: d.customerDiscountPercent,
              reseller: d.resellerDiscountPercent,
              plan_id: d.plan_id || '',
            };
          });
          setAirtimeDiscounts(prev => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});
  }, []);

  // Auto-detect network when phone number changes
  useEffect(() => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 4) {
      fetch(`/api/services/detect-network?phone=${clean}`)
        .then(res => res.json())
        .then(data => {
          if (data.network) {
            setSelectedNetwork(data.network);
          }
        })
        .catch(() => {});
    }
  }, [phone]);

  if (!isOpen) return null;

  const activeAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;
  // Airtime discount dynamically resolved from database / admin config
  const currentNetworkDiscount = airtimeDiscounts[selectedNetwork];
  const discountRate = userRole === 'reseller'
    ? (currentNetworkDiscount?.reseller ?? 3.5)
    : (currentNetworkDiscount?.customer ?? 2.0);
  const discountAmount = Math.round((activeAmount * discountRate) / 100);
  const finalPrice = Math.max(0, activeAmount - discountAmount);

  const handleSelectChip = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmount('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
  };

  const handleProceedClick = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 11-digit Nigerian phone number');
      return;
    }
    if (activeAmount < 50) {
      setErrorMessage('Minimum airtime top-up is ₦50');
      return;
    }
    if (walletBalance < finalPrice) {
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
      const activePlanId = currentNetworkDiscount?.plan_id;
      const res = await fetch('/api/services/airtime/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          network: selectedNetwork,
          recipientPhone: phone,
          amount: activeAmount,
          plan_id: activePlanId,
          planCode: activePlanId,
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
          reference: data.reference || `NDS-AIR-${Date.now()}`,
          userId: userId || 'user',
          userName: 'User',
          userEmail: '',
          userPhone: phone,
          userRole,
          serviceType: 'airtime',
          network: selectedNetwork,
          planName: `${selectedNetwork.toUpperCase()} Airtime ₦${activeAmount.toLocaleString()}`,
          recipient: phone,
          amount: finalPrice,
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
          onError(failMsg, { serviceName: `${selectedNetwork.toUpperCase()} Airtime`, reference: failedTx.reference });
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
        reference: `NDS-AIR-${Date.now()}`,
        userId: userId || 'user',
        userName: 'User',
        userEmail: '',
        userPhone: phone,
        userRole,
        serviceType: 'airtime',
        network: selectedNetwork,
        planName: `${selectedNetwork.toUpperCase()} Airtime ₦${activeAmount.toLocaleString()}`,
        recipient: phone,
        amount: finalPrice,
        providerCost: 0,
        profit: 0,
        status: 'failed',
        failureReason: `Network error: ${err.message || 'No communication with server'}. Your wallet was not charged.`,
        date: new Date().toISOString(),
      };

      if (onError) {
        onError(failedTx.failureReason, { serviceName: `${selectedNetwork.toUpperCase()} Airtime`, reference: failedTx.reference });
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
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Buy Airtime</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Top up airtime instantly</p>
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

          {/* Phone Number */}
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

          {/* Select Amount Chips matching design */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Select Amount
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map((amt) => {
                const isSelected = selectedAmount === amt && !customAmount;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleSelectChip(amt)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-black transition ${
                      isSelected
                        ? 'bg-purple-800 text-white shadow-md shadow-purple-900/30 ring-2 ring-purple-600'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    ₦{amt.toLocaleString()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Custom Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₦</span>
              <input
                type="number"
                min="50"
                step="50"
                value={customAmount}
                onChange={handleCustomChange}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          {/* Discount & You will pay display matching design mockup */}
          <div className="text-center pt-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">You will pay:</span>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                ₦{finalPrice.toLocaleString()}
              </span>
              {discountAmount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                  Save ₦{discountAmount} ({discountRate}%)
                </span>
              )}
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
            <span>Top Up Now</span>
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="absolute inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 border border-purple-200 dark:border-purple-800 animate-scale-up">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 mx-auto flex items-center justify-center mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">Confirm Airtime Top Up</h4>
                <p className="text-xs text-slate-500">Fast delivery directly to your phone</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Network:</span>
                  <span className="font-bold uppercase text-slate-800 dark:text-slate-200">{selectedNetwork}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Airtime Value:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">₦{activeAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient:</span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-400">{phone}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Discounted Total:</span>
                  <span className="font-black text-purple-700 dark:text-purple-400">₦{finalPrice.toLocaleString()}</span>
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
                  Confirm Topup
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
          amount={finalPrice}
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
