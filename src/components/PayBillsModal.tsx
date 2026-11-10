import React, { useState, useEffect } from 'react';
import { ArrowLeft, Zap, Tv, GraduationCap, CheckCircle2, AlertCircle, ShieldCheck, Search, Copy, Check } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../lib/firebase.ts';
import { updateWalletBalance } from '../lib/firebaseService.ts';
import { PinModal } from './PinModal.tsx';
import { ElectricityDisco, CablePackage, ExamPin, Transaction } from '../types/index.ts';
import { hapticNavClick } from '../lib/haptics.ts';

interface PayBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'electricity' | 'cable' | 'exam';
  walletBalance: number;
  userPhone: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userPin?: string;
  onPurchaseSuccess: (tx: Transaction, newBalance?: number) => void;
  onError?: (error: any, context?: any) => void;
}

type BillCategory = 'electricity' | 'dstv' | 'gotv' | 'startimes' | 'waec' | 'neco' | 'jamb';

export const PayBillsModal: React.FC<PayBillsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'electricity',
  walletBalance,
  userPhone,
  userId,
  userEmail,
  userName,
  userPin,
  onPurchaseSuccess,
  onError,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BillCategory>('electricity');

  // Electricity state
  const [discos, setDiscos] = useState<ElectricityDisco[]>([]);
  const [selectedDiscoId, setSelectedDiscoId] = useState<string>('ikedc');
  const [meterType, setMeterType] = useState<'prepaid' | 'postpaid'>('prepaid');
  const [meterNumber, setMeterNumber] = useState('45029384721');
  const [electricityAmount, setElectricityAmount] = useState('2000');
  const [verifiedCustomer, setVerifiedCustomer] = useState<{ name: string; address: string } | null>(null);
  const [verifyingMeter, setVerifyingMeter] = useState(false);

  // Cable state
  const [cablePackages, setCablePackages] = useState<CablePackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [smartcardNumber, setSmartcardNumber] = useState('7029384719');
  const [verifiedCableCustomer, setVerifiedCableCustomer] = useState<{ name: string; currentPackage: string } | null>(null);
  const [verifyingCard, setVerifyingCard] = useState(false);

  // Exam state
  const [examPins, setExamPins] = useState<ExamPin[]>([]);
  const [selectedExamPinId, setSelectedExamPinId] = useState<string>('exam_waec');
  const [quantity, setQuantity] = useState(1);
  const [examRecipientPhone, setExamRecipientPhone] = useState(userPhone || '08012345678');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'electricity' | 'cable' | 'exam' | null>(null);
  const [pinModalError, setPinModalError] = useState<string | null>(null);

  // Fetch initial discos, cable packages, and exam pins from Firestore & backend
  useEffect(() => {
    if (!isOpen) return;

    // Load Electricity Discos from Firestore with backend fallback
    const loadDiscos = async () => {
      try {
        const snap = await getDocs(collection(firestoreDb, 'electricityDiscos')).catch(() => null);
        if (snap && !snap.empty) {
          const list = snap.docs
            .map(d => ({ ...(d.data() as ElectricityDisco), id: d.id }))
            .filter(d => d.isActive !== false);
          setDiscos(list);
          if (list[0]) setSelectedDiscoId(list[0].id);
          return;
        }
      } catch (e) {
        console.warn('Firestore discos note:', e);
      }
      fetch('/api/services/electricity/discos')
        .then(res => res.ok ? res.json().catch(() => ({})) : {})
        .then((d: any) => {
          if (d && d.discos) {
            setDiscos(d.discos);
            if (d.discos[0]) setSelectedDiscoId(d.discos[0].id);
          }
        })
        .catch(() => {});
    };

    // Load Exam PINs from Firestore with backend fallback
    const loadExamPins = async () => {
      try {
        const snap = await getDocs(collection(firestoreDb, 'examPins')).catch(() => null);
        if (snap && !snap.empty) {
          const list = snap.docs
            .map(d => ({ ...(d.data() as ExamPin), id: d.id }))
            .filter(d => d.isActive !== false);
          setExamPins(list);
          if (list[0]) setSelectedExamPinId(list[0].id);
          return;
        }
      } catch (e) {
        console.warn('Firestore exam pins note:', e);
      }
      fetch('/api/services/exam/pins')
        .then(res => res.ok ? res.json().catch(() => ({})) : {})
        .then((d: any) => {
          if (d && d.pins) {
            setExamPins(d.pins);
            if (d.pins[0]) setSelectedExamPinId(d.pins[0].id);
          }
        })
        .catch(() => {});
    };

    loadDiscos();
    loadExamPins();
  }, [isOpen]);

  // Fetch cable packages when category changes (Firestore first)
  useEffect(() => {
    if (['dstv', 'gotv', 'startimes'].includes(selectedCategory)) {
      const loadCable = async () => {
        try {
          const snap = await getDocs(collection(firestoreDb, 'cablePackages')).catch(() => null);
          if (snap && !snap.empty) {
            const list = snap.docs
              .map(d => ({ ...(d.data() as CablePackage), id: d.id }))
              .filter(d => d.isActive !== false && d.provider?.toLowerCase() === selectedCategory.toLowerCase());
            if (list.length > 0) {
              setCablePackages(list);
              if (list[0]) setSelectedPackageId(list[0].id);
              return;
            }
          }
        } catch (e) {
          console.warn('Firestore cable note:', e);
        }
        fetch(`/api/services/cable/packages?provider=${selectedCategory}`)
          .then(res => res.ok ? res.json().catch(() => ({})) : {})
          .then((d: any) => {
            if (d && d.packages) {
              setCablePackages(d.packages);
              if (d.packages[0]) setSelectedPackageId(d.packages[0].id);
            }
          })
          .catch(() => {});
      };
      loadCable();
    }
  }, [selectedCategory]);

  if (!isOpen) return null;

  // Verify Meter Handler
  const handleVerifyMeter = async () => {
    if (!meterNumber || meterNumber.length < 8) {
      setErrorMessage('Please enter a valid meter number (at least 8 digits)');
      return;
    }
    setVerifyingMeter(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/services/electricity/verify-meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discoId: selectedDiscoId,
          meterNumber,
          meterType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Verification failed');
      setVerifiedCustomer({
        name: data.customerName,
        address: data.address,
      });
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setVerifyingMeter(false);
    }
  };

  // Submit Electricity Purchase
  const handleElectricitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const numAmount = parseFloat(electricityAmount);
    if (isNaN(numAmount) || numAmount < 500) {
      setErrorMessage('Minimum electricity payment is ₦500');
      return;
    }

    const disco = discos.find(d => d.id === selectedDiscoId);
    const totalCharge = numAmount + (disco?.serviceFee || 50);

    if (walletBalance < totalCharge) {
      setErrorMessage(`Insufficient wallet balance. Total required is ₦${totalCharge.toLocaleString()}.`);
      return;
    }

    setPendingAction('electricity');
    setShowPinModal(true);
  };

  const handleExecuteElectricityWithPin = async (pin: string) => {
    setLoading(true);
    setErrorMessage(null);
    setPinModalError(null);
    const numAmount = parseFloat(electricityAmount);
    const disco = discos.find(d => d.id === selectedDiscoId);
    const discoPlanId = disco?.plan_id || disco?.code || selectedDiscoId;
    const discoNetworkId = disco?.network_id || disco?.networkId || disco?.code || selectedDiscoId;

    try {
      const res = await fetch('/api/services/electricity/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          discoId: selectedDiscoId,
          network: disco?.shortName || selectedDiscoId,
          network_id: discoNetworkId,
          networkId: discoNetworkId,
          plan_id: discoPlanId,
          planId: discoPlanId,
          planCode: discoPlanId,
          meterNumber,
          meterType,
          amount: numAmount,
          customerName: verifiedCustomer?.name,
          address: verifiedCustomer?.address,
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

      // Valid PIN: dismiss PIN modal and close form modal immediately
      setShowPinModal(false);
      onClose();

      if (!res.ok || !data.success) {
        const failedTx: Transaction = data.transaction || {
          id: `tx_${Date.now()}`,
          reference: data.reference || `NDS-ELE-${Date.now()}`,
          userId: userId || 'user',
          userName: verifiedCustomer?.name || 'Customer',
          userEmail: '',
          userPhone: userPhone || '',
          userRole: 'customer',
          serviceType: 'electricity',
          network: disco?.shortName || selectedDiscoId,
          planName: `${disco?.name || 'Electricity'} - ${meterType.toUpperCase()}`,
          recipient: meterNumber,
          amount: numAmount,
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
          onError(failMsg, { serviceName: `${disco?.name || 'Electricity'} Bill`, reference: failedTx.reference });
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
      onClose();

      const failedTx: Transaction = {
        id: `tx_${Date.now()}`,
        reference: `NDS-ELE-${Date.now()}`,
        userId: userId || 'user',
        userName: verifiedCustomer?.name || 'Customer',
        userEmail: '',
        userPhone: userPhone || '',
        userRole: 'customer',
        serviceType: 'electricity',
        network: disco?.shortName || selectedDiscoId,
        planName: `${disco?.name || 'Electricity'} - ${meterType.toUpperCase()}`,
        recipient: meterNumber,
        amount: numAmount,
        providerCost: 0,
        profit: 0,
        status: 'failed',
        failureReason: `Network error: ${err.message || 'No communication with server'}. Your wallet was not charged.`,
        date: new Date().toISOString(),
      };

      if (onError) {
        onError(failedTx.failureReason, { serviceName: `${disco?.name || 'Electricity'} Bill`, reference: failedTx.reference });
      }
      onPurchaseSuccess(failedTx, walletBalance);
    } finally {
      setLoading(false);
    }
  };

  // Verify Cable Card
  const handleVerifyCard = async () => {
    if (!smartcardNumber || smartcardNumber.length < 8) {
      setErrorMessage('Please enter a valid Smartcard/IUC number');
      return;
    }
    setVerifyingCard(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/services/cable/verify-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedCategory,
          iucNumber: smartcardNumber,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Verification failed');
      setVerifiedCableCustomer({
        name: data.customerName,
        currentPackage: data.currentPackage,
      });
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setVerifyingCard(false);
    }
  };

  // Submit Cable Purchase
  const handleCableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pkg = cablePackages.find(p => p.id === selectedPackageId);
    if (!pkg) {
      setErrorMessage('Please select a bouquet package');
      return;
    }

    if (walletBalance < pkg.price) {
      setErrorMessage(`Insufficient wallet balance (₦${walletBalance.toLocaleString()}). Required: ₦${pkg.price.toLocaleString()}`);
      return;
    }

    setPendingAction('cable');
    setShowPinModal(true);
  };

  const handleExecuteCableWithPin = async (pin: string) => {
    setLoading(true);
    setErrorMessage(null);
    setPinModalError(null);
    const pkg = cablePackages.find(p => p.id === selectedPackageId);
    const cablePlanId = pkg?.plan_id || pkg?.code || selectedPackageId;
    const cableNetworkId = pkg?.network_id || pkg?.networkId || selectedCategory;

    try {
      const res = await fetch('/api/services/cable/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          packageId: selectedPackageId,
          network: selectedCategory,
          network_id: cableNetworkId,
          networkId: cableNetworkId,
          plan_id: cablePlanId,
          planId: cablePlanId,
          planCode: cablePlanId,
          iucNumber: smartcardNumber,
          provider: selectedCategory,
          customerName: verifiedCableCustomer?.name,
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

      // Valid PIN: dismiss PIN modal and close form modal immediately
      setShowPinModal(false);
      onClose();

      if (!res.ok || !data.success) {
        const failedTx: Transaction = data.transaction || {
          id: `tx_${Date.now()}`,
          reference: data.reference || `NDS-CAB-${Date.now()}`,
          userId: userId || 'user',
          userName: verifiedCableCustomer?.name || 'Customer',
          userEmail: '',
          userPhone: userPhone || '',
          userRole: 'customer',
          serviceType: 'cable',
          network: selectedCategory,
          planName: pkg?.name || `${selectedCategory.toUpperCase()} Subscription`,
          recipient: smartcardNumber,
          amount: pkg?.price || 0,
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
          onError(failMsg, { serviceName: pkg?.name || `${selectedCategory.toUpperCase()} Subscription`, reference: failedTx.reference });
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
      onClose();

      const failedTx: Transaction = {
        id: `tx_${Date.now()}`,
        reference: `NDS-CAB-${Date.now()}`,
        userId: userId || 'user',
        userName: verifiedCableCustomer?.name || 'Customer',
        userEmail: '',
        userPhone: userPhone || '',
        userRole: 'customer',
        serviceType: 'cable',
        network: selectedCategory,
        planName: pkg?.name || `${selectedCategory.toUpperCase()} Subscription`,
        recipient: smartcardNumber,
        amount: pkg?.price || 0,
        providerCost: 0,
        profit: 0,
        status: 'failed',
        failureReason: `Network error: ${err.message || 'No communication with server'}. Your wallet was not charged.`,
        date: new Date().toISOString(),
      };

      if (onError) {
        onError(failedTx.failureReason, { serviceName: pkg?.name || `${selectedCategory.toUpperCase()} Subscription`, reference: failedTx.reference });
      }
      onPurchaseSuccess(failedTx, walletBalance);
    } finally {
      setLoading(false);
    }
  };

  // Submit Exam PIN purchase
  const handleExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = examPins.find(p => p.id === selectedExamPinId);
    if (!pin) {
      setErrorMessage('Please select an examination PIN');
      return;
    }

    const totalCost = pin.price * quantity;
    if (walletBalance < totalCost) {
      setErrorMessage(`Insufficient wallet balance (₦${walletBalance.toLocaleString()}). Required: ₦${totalCost.toLocaleString()}`);
      return;
    }

    setPendingAction('exam');
    setShowPinModal(true);
  };

  const handleExecuteExamWithPin = async (pin: string) => {
    setLoading(true);
    setErrorMessage(null);
    setPinModalError(null);
    const epin = examPins.find(p => p.id === selectedExamPinId);
    const examPlanId = epin?.plan_id || epin?.code || epin?.exam;
    const examNetworkId = epin?.network_id || epin?.networkId || epin?.exam || selectedCategory;

    try {
      const res = await fetch('/api/services/exam/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          examPinId: selectedExamPinId,
          network: selectedCategory,
          network_id: examNetworkId,
          networkId: examNetworkId,
          plan_id: examPlanId,
          planId: examPlanId,
          planCode: examPlanId,
          quantity,
          recipientPhone: examRecipientPhone,
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

      // Valid PIN: dismiss PIN modal and close form modal immediately
      setShowPinModal(false);
      onClose();

      if (!res.ok || !data.success) {
        const failedTx: Transaction = data.transaction || {
          id: `tx_${Date.now()}`,
          reference: data.reference || `NDS-EXM-${Date.now()}`,
          userId: userId || 'user',
          userName: 'Customer',
          userEmail: '',
          userPhone: examRecipientPhone || userPhone || '',
          userRole: 'customer',
          serviceType: 'exam_pin',
          network: selectedCategory,
          planName: `${quantity}x ${epin?.name || selectedCategory.toUpperCase()} PIN`,
          recipient: examRecipientPhone,
          amount: (epin?.price || 0) * quantity,
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
          onError(failMsg, { serviceName: `${epin?.name || selectedCategory.toUpperCase()} PIN`, reference: failedTx.reference });
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
      onClose();

      const failedTx: Transaction = {
        id: `tx_${Date.now()}`,
        reference: `NDS-EXM-${Date.now()}`,
        userId: userId || 'user',
        userName: 'Customer',
        userEmail: '',
        userPhone: examRecipientPhone || userPhone || '',
        userRole: 'customer',
        serviceType: 'exam_pin',
        network: selectedCategory,
        planName: `${quantity}x ${epin?.name || selectedCategory.toUpperCase()} PIN`,
        recipient: examRecipientPhone,
        amount: (epin?.price || 0) * quantity,
        providerCost: 0,
        profit: 0,
        status: 'failed',
        failureReason: `Network error: ${err.message || 'No communication with server'}. Your wallet was not charged.`,
        date: new Date().toISOString(),
      };

      if (onError) {
        onError(failedTx.failureReason, { serviceName: `${epin?.name || selectedCategory.toUpperCase()} PIN`, reference: failedTx.reference });
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
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Pay Bills</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select a bill type</p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 6 Grid Bill Category Cards matching design mockup */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Electricity */}
            <button
              type="button"
              onClick={() => {
                hapticNavClick();
                setSelectedCategory('electricity');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center gap-1.5 ${
                selectedCategory === 'electricity'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-purple-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 fill-slate-900" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">Electricity</span>
            </button>

            {/* DStv */}
            <button
              type="button"
              onClick={() => {
                hapticNavClick();
                setSelectedCategory('dstv');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center gap-1.5 ${
                selectedCategory === 'dstv'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-purple-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                DStv
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">DStv</span>
            </button>

            {/* GOtv */}
            <button
              type="button"
              onClick={() => {
                hapticNavClick();
                setSelectedCategory('gotv');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center gap-1.5 ${
                selectedCategory === 'gotv'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-purple-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                GOtv
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">GOtv</span>
            </button>

            {/* StarTimes */}
            <button
              type="button"
              onClick={() => {
                hapticNavClick();
                setSelectedCategory('startimes');
                setErrorMessage(null);
              }}
              className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center gap-1.5 ${
                selectedCategory === 'startimes'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-purple-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                StarTimes
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">StarTimes</span>
            </button>

            {/* WAEC */}
            <button
              type="button"
              onClick={() => {
                hapticNavClick();
                setSelectedCategory('waec');
                setErrorMessage(null);
                setSelectedExamPinId('exam_waec');
              }}
              className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center gap-1.5 ${
                selectedCategory === 'waec'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-purple-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-sm">
                WAEC
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">WAEC</span>
            </button>

            {/* NECO */}
            <button
              type="button"
              onClick={() => {
                hapticNavClick();
                setSelectedCategory('neco');
                setErrorMessage(null);
                setSelectedExamPinId('exam_neco');
              }}
              className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center gap-1.5 ${
                selectedCategory === 'neco'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-600'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-purple-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xs shadow-sm">
                NECO
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">NECO</span>
            </button>
          </div>

          {/* DYNAMIC FORM SECTION */}
          {selectedCategory === 'electricity' && (
            <form onSubmit={handleElectricitySubmit} className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Electricity Payment
              </h3>

              {/* Select Company */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Company
                </label>
                <select
                  value={selectedDiscoId}
                  onChange={(e) => { setSelectedDiscoId(e.target.value); setVerifiedCustomer(null); }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {discos.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.plan_id ? `[Plan ID: ${d.plan_id}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Meter Type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMeterType('prepaid')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                    meterType === 'prepaid'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Prepaid (Token)
                </button>
                <button
                  type="button"
                  onClick={() => setMeterType('postpaid')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition ${
                    meterType === 'postpaid'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Postpaid (Bill)
                </button>
              </div>

              {/* Meter Number with Verify button */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Meter Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={meterNumber}
                    onChange={(e) => { setMeterNumber(e.target.value); setVerifiedCustomer(null); }}
                    placeholder="Enter Meter Number"
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVerifyMeter}
                    disabled={verifyingMeter}
                    className="px-3.5 py-3 rounded-2xl bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 text-purple-800 dark:text-purple-300 font-bold text-xs shrink-0 transition"
                  >
                    {verifyingMeter ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>

              {/* Customer Verification Card */}
              {verifiedCustomer && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Customer Details Verified</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white">{verifiedCustomer.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">{verifiedCustomer.address}</p>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Payment Amount (₦)
                </label>
                <input
                  type="number"
                  min="500"
                  step="100"
                  value={electricityAmount}
                  onChange={(e) => setElectricityAmount(e.target.value)}
                  placeholder="Enter payment amount"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-purple-600"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Get Token'
                )}
              </button>
            </form>
          )}

          {/* Cable TV Form */}
          {['dstv', 'gotv', 'startimes'].includes(selectedCategory) && (
            <form onSubmit={handleCableSubmit} className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 uppercase">
                {selectedCategory} Subscription
              </h3>

              {/* Smartcard / IUC input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Smartcard / IUC Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={smartcardNumber}
                    onChange={(e) => { setSmartcardNumber(e.target.value); setVerifiedCableCustomer(null); }}
                    placeholder="Enter IUC Number"
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVerifyCard}
                    disabled={verifyingCard}
                    className="px-3.5 py-3 rounded-2xl bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 text-purple-800 dark:text-purple-300 font-bold text-xs shrink-0 transition"
                  >
                    {verifyingCard ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>

              {verifiedCableCustomer && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Subscriber Verified</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white">{verifiedCableCustomer.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Current Plan: {verifiedCableCustomer.currentPackage}</p>
                </div>
              )}

              {/* Bouquet selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Package
                </label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {cablePackages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₦{p.price.toLocaleString()} {p.plan_id ? `[Plan ID: ${p.plan_id}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Renew Subscription'
                )}
              </button>
            </form>
          )}

          {/* Exam PINs Form */}
          {['waec', 'neco', 'jamb'].includes(selectedCategory) && (
            <form onSubmit={handleExamSubmit} className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 uppercase">
                {selectedCategory.toUpperCase()} Result Checker PIN
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                  Select Exam PIN
                </label>
                <select
                  value={selectedExamPinId}
                  onChange={(e) => setSelectedExamPinId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {examPins
                    .filter(p => p.exam.toLowerCase() === selectedCategory)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - ₦{p.price.toLocaleString()} {p.plan_id ? `[Plan ID: ${p.plan_id}]` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={Number.isNaN(quantity) ? '' : quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? 1 : parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Phone for SMS
                  </label>
                  <input
                    type="tel"
                    value={examRecipientPhone}
                    onChange={(e) => setExamRecipientPhone(e.target.value)}
                    placeholder="08012345678"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Purchase PIN Instantly'
                )}
              </button>
            </form>
          )}
        </div>

        {/* 4-Digit Transaction PIN Modal */}
        <PinModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          onConfirm={(pin) => {
            if (pendingAction === 'electricity') handleExecuteElectricityWithPin(pin);
            else if (pendingAction === 'cable') handleExecuteCableWithPin(pin);
            else if (pendingAction === 'exam') handleExecuteExamWithPin(pin);
          }}
          loading={loading}
          recipient={
            pendingAction === 'electricity'
              ? meterNumber
              : pendingAction === 'cable'
              ? smartcardNumber
              : examRecipientPhone
          }
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
