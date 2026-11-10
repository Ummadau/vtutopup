import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Menu,
  Wallet,
  Wifi,
  PhoneCall,
  Zap,
  Tv,
  GraduationCap,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Award,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  ChevronRight,
  ArrowUpRight,
  Globe,
  Copy,
  Check,
  Landmark,
  Building2
} from 'lucide-react';
import { Logo } from './components/Logo.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { ReceiptModal } from './components/ReceiptModal.tsx';
import { FundWalletModal } from './components/FundWalletModal.tsx';
import { BuyDataModal } from './components/BuyDataModal.tsx';
import { BuyAirtimeModal } from './components/BuyAirtimeModal.tsx';
import { PayBillsModal } from './components/PayBillsModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { SupportModal } from './components/SupportModal.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { listenToForegroundPushMessages } from './lib/fcmService.ts';
import { ResellerDashboard } from './components/ResellerDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ToastPopup, ToastMessage } from './components/ToastPopup.tsx';
import { TransactionStatusBadge } from './components/TransactionStatusBadge.tsx';
import { hapticSuccess, hapticNavClick, hapticError } from './lib/haptics.ts';
import { safeFetchJson } from './lib/safeFetch.ts';
import { translations, Language } from './lib/i18n.ts';
import { User, Transaction, NotificationItem, VirtualAccount, UserRole } from './types/index.ts';
import {
  syncTransactionToFirestore,
  syncUserToFirestore,
  subscribeToUser,
  subscribeToTransactions,
  subscribeToAllTransactions,
  initializeFirestoreSeeds,
  updateWalletBalance
} from './lib/firebaseService.ts';

export default function App() {
  // UI State
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Theme state
  const [darkMode, setDarkMode] = useState(false);
  const [deviceFrameMode, setDeviceFrameMode] = useState(false); // Mobile frame toggle for desktop
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'wallet' | 'support' | 'more'>('home');

  const t = translations[currentLang];

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(item => item.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  // Helper to load stored session or default to landing page
  const getInitialUserAndSession = (): { user: User; view: 'landing' | 'app' } => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('naeem_user_session') : null;
      const remembered = typeof window !== 'undefined' ? localStorage.getItem('naeem_remembered_user') : null;
      
      let sessionData = null;
      if (stored) {
        try { sessionData = JSON.parse(stored); } catch {}
      }
      if (!sessionData && remembered) {
        try { sessionData = JSON.parse(remembered); } catch {}
      }

      if (sessionData && sessionData.id) {
        return { user: sessionData, view: 'app' };
      }
    } catch (e) {
      console.warn('Session parse note:', e);
    }
    return {
      user: {
        id: '',
        name: 'Guest User',
        email: '',
        phone: '',
        role: 'customer',
        status: 'active',
        isVerified: false,
        avatar: '',
        referralCode: '',
        walletBalance: 0,
        totalSavings: 0,
        referralEarnings: 0,
        totalTransactionsCount: 0,
        createdAt: new Date().toISOString(),
      },
      view: 'landing',
    };
  };

  const initialSession = getInitialUserAndSession();
  const [currentView, setCurrentView] = useState<'landing' | 'app'>(initialSession.view);
  const [user, setUser] = useState<User>(initialSession.user);

  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>([]);
  const [activeBankIdx, setActiveBankIdx] = useState(0);
  const [copiedCardAcc, setCopiedCardAcc] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(1);

  // Modals state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isFundWalletOpen, setIsFundWalletOpen] = useState(false);
  const [isBuyDataOpen, setIsBuyDataOpen] = useState(false);
  const [isBuyAirtimeOpen, setIsBuyAirtimeOpen] = useState(false);
  const [isPayBillsOpen, setIsPayBillsOpen] = useState(false);
  const [payBillsTab, setPayBillsTab] = useState<'electricity' | 'cable' | 'exam'>('electricity');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [disputeTx, setDisputeTx] = useState<Transaction | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  // Transaction history filter
  const [txFilter, setTxFilter] = useState<'all' | 'successful' | 'pending' | 'failed'>('all');

  // Load user data & transactions
  const loadUserData = async () => {
    if (!user.id) return;
    try {
      const headers = { 'x-user-id': user.id };

      const [wRes, tRes, nRes] = await Promise.all([
        safeFetchJson('/api/wallet/summary', { headers }),
        safeFetchJson('/api/transactions', { headers }),
        safeFetchJson('/api/notifications', { headers }),
      ]);

      if (wRes && wRes.balance !== undefined) {
        setUser(prev => ({
          ...prev,
          walletBalance: wRes.balance ?? prev.walletBalance,
          totalSavings: wRes.totalSavings ?? prev.totalSavings,
          referralEarnings: wRes.referralEarnings ?? prev.referralEarnings,
          totalTransactionsCount: wRes.totalTransactionsCount ?? prev.totalTransactionsCount,
        }));
        if (wRes.virtualAccounts) setVirtualAccounts(wRes.virtualAccounts);
      }

      if (tRes && tRes.transactions && tRes.transactions.length > 0) {
        setTransactions(tRes.transactions);
      }

      // Live Firestore synchronization for seamless Vercel & AI Studio data sharing
      try {
        const { collection, getDocs, query, where, doc, getDoc } = await import('firebase/firestore');
        const { firestoreDb } = await import('./lib/firebase.ts');

        // Fetch user's latest balance and virtual accounts directly from Firestore
        const userDocRef = doc(firestoreDb, 'users', user.id);
        const userSnap = await getDoc(userDocRef).catch(() => null);
        if (userSnap && userSnap.exists()) {
          const liveUser = userSnap.data() as User;
          setUser(prev => ({
            ...prev,
            walletBalance: liveUser.walletBalance !== undefined ? liveUser.walletBalance : prev.walletBalance,
            totalSavings: liveUser.totalSavings !== undefined ? liveUser.totalSavings : prev.totalSavings,
            referralEarnings: liveUser.referralEarnings !== undefined ? liveUser.referralEarnings : prev.referralEarnings,
            totalTransactionsCount: liveUser.totalTransactionsCount !== undefined ? liveUser.totalTransactionsCount : prev.totalTransactionsCount,
            role: liveUser.role || prev.role,
            virtualAccounts: liveUser.virtualAccounts || prev.virtualAccounts,
          }));
          if (liveUser.virtualAccounts && liveUser.virtualAccounts.length > 0) {
            setVirtualAccounts(liveUser.virtualAccounts);
          }
        }

        // Fetch transactions from Firestore if empty or on reload
        const txQuery = user.role === 'admin'
          ? collection(firestoreDb, 'transactions')
          : query(collection(firestoreDb, 'transactions'), where('userId', '==', user.id));

        const snap = await getDocs(txQuery).catch(() => null);
        if (snap && !snap.empty) {
          const liveList = snap.docs.map(d => d.data() as Transaction);
          liveList.sort((a, b) => new Date(b.date || (b as any).createdAt || 0).getTime() - new Date(a.date || (a as any).createdAt || 0).getTime());
          setTransactions(liveList);
        }
      } catch (fsErr) {
        console.warn('Live Firestore data synchronization note:', fsErr);
      }

      if (nRes.notifications) {
        setNotifications(nRes.notifications);
        setUnreadNotifsCount(nRes.notifications.filter((n: any) => !n.read).length);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user.id]);

  // Real-time Firestore onSnapshot listeners: automatically syncs wallet balance and transactions
  useEffect(() => {
    if (!user.id) return;

    // Seed Firestore asynchronously if not yet populated
    initializeFirestoreSeeds(user, transactions).catch(() => {});

    // Subscribe to real-time user updates (wallet balance, savings, stats)
    const unsubscribeUser = subscribeToUser(
      user.id,
      (updatedUser) => {
        if (updatedUser) {
          setUser((prev) => ({
            ...prev,
            walletBalance: updatedUser.walletBalance !== undefined ? updatedUser.walletBalance : prev.walletBalance,
            totalSavings: updatedUser.totalSavings !== undefined ? updatedUser.totalSavings : prev.totalSavings,
            referralEarnings: updatedUser.referralEarnings !== undefined ? updatedUser.referralEarnings : prev.referralEarnings,
            totalTransactionsCount: updatedUser.totalTransactionsCount !== undefined ? updatedUser.totalTransactionsCount : prev.totalTransactionsCount,
            role: updatedUser.role || prev.role,
            name: updatedUser.name || prev.name,
            phone: updatedUser.phone || prev.phone,
            transactionPin: updatedUser.transactionPin || prev.transactionPin || '1234',
          }));
        }
      },
      (err) => {
        console.warn('Real-time user snapshot notice:', err.message);
      }
    );

    // Subscribe to real-time transactions
    const unsubscribeTxs = user.role === 'admin'
      ? subscribeToAllTransactions(
          (liveTxs) => {
            if (liveTxs && liveTxs.length > 0) {
              setTransactions(liveTxs);
            }
          },
          (err) => {
            console.warn('Real-time admin transactions notice:', err.message);
          }
        )
      : subscribeToTransactions(
          user.id,
          (liveTxs) => {
            if (liveTxs && liveTxs.length > 0) {
              setTransactions(liveTxs);
            }
          },
          (err) => {
            console.warn('Real-time transactions notice:', err.message);
          }
        );

    // Attach FCM Foreground Push Message Listener
    listenToForegroundPushMessages((payload) => {
      addToast(payload.title, payload.body, 'info');
      loadUserData();
    });

    return () => {
      unsubscribeUser();
      unsubscribeTxs();
    };
  }, [user.id, user.role]);

  // Handle Quick Demo Account Switch
  const handleQuickSwitch = async (role: UserRole) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.user) {
        setUser(data.user);
        localStorage.setItem('naeem_user_session', JSON.stringify(data.user));
        setCurrentView('app');
        setActiveTab('home');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Centralized transaction error handler
  const handleTransactionError = useCallback((error: any, context?: { serviceName?: string; reference?: string; provider?: string }) => {
    console.error('[NDS Centralized Transaction Error Handler]:', error, context);

    let title = 'Transaction Notice';
    let message = 'An error occurred while processing your request. Please try again or contact customer care.';

    const rawMsg = typeof error === 'string'
      ? error
      : (error?.message || error?.error || error?.statusText || '');
    const status = error?.status || error?.http_code || error?.statusCode;

    const is404 = status === 404 || rawMsg.includes('404') || rawMsg.toLowerCase().includes('not found') || rawMsg.toLowerCase().includes('endpoint');
    const isInvalidResponse = rawMsg.toLowerCase().includes('invalid response') || rawMsg.toLowerCase().includes('unexpected response') || rawMsg.toLowerCase().includes('syntaxerror') || rawMsg.toLowerCase().includes('format');
    const isGatewayDown = status === 502 || status === 503 || status === 504 || rawMsg.toLowerCase().includes('gateway') || rawMsg.toLowerCase().includes('timeout') || rawMsg.toLowerCase().includes('communication failed') || rawMsg.toLowerCase().includes('server error');
    const isInsufficient = rawMsg.toLowerCase().includes('insufficient') || rawMsg.toLowerCase().includes('balance');
    const isPin = rawMsg.toLowerCase().includes('pin');
    const isRateLimited = status === 429 || rawMsg.toLowerCase().includes('too many requests') || rawMsg.toLowerCase().includes('rate limit');

    if (is404 || isInvalidResponse) {
      title = `${context?.serviceName || 'Service'} Provider Unavailable (HTTP 404)`;
      message = 'The active VTU gateway returned 404 Not Found or an invalid response. Please switch to an alternative provider (e.g. VTUNaija or NCWallet) in the Admin Dashboard, or contact Support on WhatsApp for assistance.';
    } else if (isGatewayDown) {
      title = 'Provider Gateway Timeout';
      message = 'The upstream telecom provider is currently experiencing delays. Please try switching provider in Admin Dashboard or retry shortly.';
    } else if (isRateLimited) {
      title = 'Security Throttled';
      message = 'Request limit reached for account security. Please wait 60 seconds before retrying.';
    } else if (isInsufficient) {
      if (rawMsg.toLowerCase().includes('upstream') || rawMsg.toLowerCase().includes('gateway') || rawMsg.toLowerCase().includes('vtunaija') || rawMsg.toLowerCase().includes('ncwallet') || rawMsg.toLowerCase().includes('api')) {
        title = 'Provider Gateway Balance Low';
        message = rawMsg;
      } else {
        title = 'Insufficient Wallet Balance';
        message = rawMsg || 'Your wallet balance is insufficient for this transaction. Please fund your wallet.';
      }
    } else if (isPin) {
      title = 'Transaction PIN Error';
      message = rawMsg || 'Incorrect 4-digit PIN. Please verify your PIN.';
    } else if (rawMsg) {
      title = 'Transaction Declined';
      message = `${rawMsg}. If this persists, please try an alternative service provider or contact support.`;
    }

    addToast(title, message, 'error');
  }, []);

  // Global listener for transaction service errors
  useEffect(() => {
    const handleServiceErrorEvent = (e: any) => {
      if (e?.detail) {
        handleTransactionError(e.detail.error, e.detail.context);
      }
    };
    window.addEventListener('nds-service-error' as any, handleServiceErrorEvent);
    return () => window.removeEventListener('nds-service-error' as any, handleServiceErrorEvent);
  }, [handleTransactionError]);

  const handlePurchaseSuccess = (tx: Transaction, newBalance?: number) => {
    setSelectedTx(tx);
    setIsReceiptOpen(true);

    if (newBalance !== undefined) {
      setUser(prev => ({
        ...prev,
        walletBalance: newBalance,
        totalTransactionsCount: (prev.totalTransactionsCount || 0) + (tx.status === 'successful' ? 1 : 0),
      }));

      // Synchronous update to Firestore user document on client side
      if (user.id) {
        updateWalletBalance(user.id, newBalance).catch(() => {});
      }
    }

    if (tx) {
      setTransactions(prev => [tx, ...prev.filter(t => t.id !== tx.id)]);
      syncTransactionToFirestore(tx).catch(err => console.warn('Firestore sync note:', err));
      
      if (tx.status === 'failed') {
        hapticError();
        handleTransactionError(tx.failureReason || 'Provider connection failed', {
          serviceName: tx.planName || tx.serviceType?.toUpperCase(),
          reference: tx.reference,
        });
      } else {
        hapticSuccess();
        addToast('Transaction Successful!', `₦${tx.amount.toLocaleString()} charged for ${tx.planName || tx.serviceType}. Receipt generated.`, 'success');
      }
    }

    loadUserData();
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadNotifsCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (txFilter === 'all') return true;
    return t.status.toLowerCase() === txFilter;
  });

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      {/* Toast Popups Container */}
      <ToastPopup toasts={toasts} onDismiss={removeToast} />

      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">
        {/* If viewing landing page */}
        {currentView === 'landing' ? (
          <LandingPage
            onOpenLogin={() => { setAuthInitialMode('login'); setIsAuthOpen(true); }}
            onOpenRegister={() => { setAuthInitialMode('register'); setIsAuthOpen(true); }}
            onSelectService={(service) => {
              if (!user.id) {
                setAuthInitialMode('login');
                setIsAuthOpen(true);
                return;
              }
              setCurrentView('app');
              if (service === 'data') setIsBuyDataOpen(true);
              else if (service === 'airtime') setIsBuyAirtimeOpen(true);
              else setIsPayBillsOpen(true);
            }}
            onOpenResellerRegister={() => {
              setAuthInitialMode('register');
              setIsAuthOpen(true);
            }}
          />
        ) : (
          /* APP VIEW */
          <div className={`mx-auto ${deviceFrameMode ? 'max-w-md py-6 px-2' : 'max-w-6xl px-4 py-4 sm:py-6'}`}>
            <div className={`overflow-hidden ${
              deviceFrameMode
                ? 'rounded-[40px] shadow-2xl border-8 border-slate-900 bg-white dark:bg-slate-900 ring-1 ring-purple-500/20'
                : 'rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800'
            }`}>
              {/* App Header Bar matching mockup */}
              <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Logo size="sm" showTagline={false} />
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5">
                  {/* Screen Translation Selector */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-2 py-1 text-xs font-bold border border-slate-200 dark:border-slate-700">
                    <Globe className="w-3.5 h-3.5 text-purple-600 mr-1 shrink-0" />
                    <select
                      value={currentLang}
                      onChange={(e) => {
                        const l = e.target.value as Language;
                        setCurrentLang(l);
                        addToast('Language Switched', `Screen translation set to ${l.toUpperCase()}`, 'info');
                      }}
                      className="bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer text-xs font-bold uppercase"
                    >
                      <option value="en">EN</option>
                      <option value="ha">HA</option>
                      <option value="yo">YO</option>
                      <option value="ig">IG</option>
                      <option value="fr">FR</option>
                    </select>
                  </div>

                  {/* Theme Toggle */}
                  <button
                    onClick={() => {
                      hapticNavClick();
                      setDarkMode(!darkMode);
                    }}
                    className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 flex items-center justify-center transition"
                    title="Toggle Theme"
                  >
                    {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                  </button>

                  {/* Notifications button */}
                  <button
                    onClick={() => {
                      hapticNavClick();
                      setIsNotificationsOpen(true);
                    }}
                    className="relative w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 flex items-center justify-center transition"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>

                  {/* Profile Avatar button matching mockup */}
                  <button
                    onClick={() => {
                      hapticNavClick();
                      setIsProfileOpen(true);
                    }}
                    className="flex items-center gap-2 p-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 p-0.5">
                      <div className="w-full h-full rounded-full bg-purple-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-xs text-purple-900 dark:text-purple-300">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </header>

              {/* Main App Body */}
              <main className="p-4 sm:p-6 pb-20 md:pb-6 space-y-6">
                {/* ROLE ROUTING */}
                {user.role === 'admin' ? (
                  <AdminDashboard
                    currentAdmin={user}
                    onRefreshUser={loadUserData}
                  />
                ) : user.role === 'reseller' && activeTab === 'services' ? (
                  <ResellerDashboard
                    user={user}
                    onOpenBuyData={() => setIsBuyDataOpen(true)}
                    onOpenBuyAirtime={() => setIsBuyAirtimeOpen(true)}
                    onOpenFundWallet={() => setIsFundWalletOpen(true)}
                  />
                ) : (
                  /* CUSTOMER DASHBOARD matching mockup */
                  <div className="space-y-6">
                    {/* Welcome Row matching mockup */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 p-0.5 shadow-md">
                            <div className="w-full h-full rounded-full bg-purple-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-sm font-black text-purple-900 dark:text-purple-300">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                user.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                          </div>
                          {user.isVerified && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-700 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </div>
                          )}
                        </div>

                        <div>
                          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                            {user.name}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Welcome back!</p>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold">
                        Verified
                      </span>
                    </div>

                    {/* Wallet Balance Card matching the mockup with integrated single bank display */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 p-6 text-white shadow-xl shadow-purple-900/20">
                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold">
                            <Wallet className="w-4 h-4" />
                            <span>Wallet Balance</span>
                          </div>
                          <div className="text-3xl sm:text-4xl font-black tracking-tight">
                            ₦{user.walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            hapticNavClick();
                            setIsFundWalletOpen(true);
                          }}
                          className="px-6 py-3 rounded-2xl bg-white text-purple-900 hover:bg-purple-50 font-black text-xs sm:text-sm shadow-md transition self-start sm:self-auto cursor-pointer"
                        >
                          Fund Wallet
                        </button>
                      </div>

                      {/* Single Virtual Bank Account Row */}
                      {virtualAccounts.length > 0 ? (
                        (() => {
                          const currentBank = virtualAccounts[activeBankIdx % virtualAccounts.length];
                          const nextBankIdx = (activeBankIdx + 1) % virtualAccounts.length;
                          const nextBank = virtualAccounts[nextBankIdx];

                          return (
                            <div className="mt-5 pt-4 border-t border-white/15 relative z-10">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                {/* Single Bank Account Details */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-purple-200/90 flex items-center gap-1">
                                      <Landmark className="w-3.5 h-3.5 text-purple-300" />
                                      {currentBank.bankName}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                                      Dedicated
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-lg sm:text-xl font-black tracking-widest text-white select-all">
                                      {currentBank.accountNumber}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(currentBank.accountNumber);
                                        setCopiedCardAcc(currentBank.accountNumber);
                                        setTimeout(() => setCopiedCardAcc(null), 2000);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                      title="Copy Account Number"
                                    >
                                      {copiedCardAcc === currentBank.accountNumber ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                                          <span className="text-emerald-300 text-[11px]">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span className="text-[11px]">Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <div className="text-[11px] text-purple-200/80 font-medium">
                                    Account Name: <span className="font-semibold text-white">{currentBank.accountName}</span>
                                  </div>
                                </div>

                                {/* Next Bank Indicator & Cycle Button */}
                                {virtualAccounts.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveBankIdx(nextBankIdx)}
                                    className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-950/70 hover:bg-purple-950/90 border border-purple-400/40 text-xs font-bold text-purple-100 transition shadow-inner cursor-pointer"
                                    title="Switch to Next Available Bank Account"
                                  >
                                    <span>Next Bank: <strong className="text-white font-black">{nextBank.bankName}</strong></span>
                                    <ChevronRight className="w-4 h-4 text-purple-300 shrink-0" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="mt-4 pt-3 border-t border-white/15 relative z-10 flex items-center justify-between">
                          <span className="text-xs text-purple-200">No Virtual Bank Account assigned yet</span>
                          <button
                            onClick={() => setIsFundWalletOpen(true)}
                            className="text-xs font-bold text-white underline hover:text-purple-200 flex items-center gap-1 cursor-pointer"
                          >
                            <span>+ Generate Dedicated Account</span>
                          </button>
                        </div>
                      )}

                      {/* Subtle background glow */}
                      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
                    </div>

                    {/* 3 Stats Cards matching the mockup */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* Transactions */}
                      <div
                        onClick={() => setActiveTab('wallet')}
                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center cursor-pointer hover:border-purple-300 transition"
                      >
                        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center mb-1.5">
                          <Clock className="w-4 h-4" />
                        </div>
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {user.totalTransactionsCount}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Transactions</span>
                      </div>

                      {/* Savings */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-1.5">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          ₦{user.totalSavings.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Savings</span>
                      </div>

                      {/* Referral Earned */}
                      <div
                        onClick={() => setIsProfileOpen(true)}
                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center cursor-pointer hover:border-purple-300 transition"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-1.5">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          ₦{user.referralEarnings.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Referral Earned</span>
                      </div>
                    </div>

                    {/* Quick Service Buttons Grid matching the mockup */}
                    <div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {/* 1. Buy Data */}
                        <button
                          onClick={() => {
                            hapticNavClick();
                            setIsBuyDataOpen(true);
                          }}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 transition flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                            <Wifi className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                            Buy Data
                          </span>
                        </button>

                        {/* 2. Buy Airtime */}
                        <button
                          onClick={() => {
                            hapticNavClick();
                            setIsBuyAirtimeOpen(true);
                          }}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 transition flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                            <PhoneCall className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                            Buy Airtime
                          </span>
                        </button>

                        {/* 3. Electricity */}
                        <button
                          onClick={() => {
                            hapticNavClick();
                            setPayBillsTab('electricity');
                            setIsPayBillsOpen(true);
                          }}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 transition flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-400/20 group-hover:scale-105 transition-transform">
                            <Zap className="w-6 h-6 fill-slate-950" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                            Electricity
                          </span>
                        </button>

                        {/* 4. Cable TV */}
                        <button
                          onClick={() => {
                            hapticNavClick();
                            setPayBillsTab('cable');
                            setIsPayBillsOpen(true);
                          }}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 transition flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 group-hover:scale-105 transition-transform">
                            <Tv className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                            Cable TV
                          </span>
                        </button>

                        {/* 5. Exam Pins */}
                        <button
                          onClick={() => {
                            hapticNavClick();
                            setPayBillsTab('exam');
                            setIsPayBillsOpen(true);
                          }}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 transition flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
                            <GraduationCap className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                            Exam Pins
                          </span>
                        </button>

                        {/* 6. More / Reseller */}
                        <button
                          onClick={() => {
                            hapticNavClick();
                            setIsProfileOpen(true);
                          }}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 transition flex flex-col items-center justify-center text-center group cursor-pointer shadow-sm"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-purple-900 text-white flex items-center justify-center shadow-md shadow-purple-900/20 group-hover:scale-105 transition-transform">
                            <Clock className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                            More
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Recent Transactions List matching mockup */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          Recent Transactions
                        </h3>
                        <button
                          onClick={() => {
                            hapticNavClick();
                            setActiveTab('wallet');
                          }}
                          className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>View All</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Filter Chips matching mockup (All, Success, Pending, Failed) */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {(['all', 'successful', 'pending', 'failed'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => {
                              hapticNavClick();
                              setTxFilter(f);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                              txFilter === f
                                ? 'bg-purple-800 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {f === 'successful' ? 'Success' : f}
                          </button>
                        ))}
                      </div>

                      {/* Transaction items */}
                      <div className="space-y-2.5">
                        <AnimatePresence initial={false}>
                          {filteredTransactions.slice(0, 5).map(tx => {
                            const isData = tx.serviceType === 'data';
                            const isAirtime = tx.serviceType === 'airtime';
                            const isElectricity = tx.serviceType === 'electricity';
                            const isCable = tx.serviceType === 'cable';

                            return (
                              <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                                transition={{ duration: 0.22, ease: 'easeOut' }}
                                onClick={() => {
                                  hapticNavClick();
                                  setSelectedTx(tx);
                                  setIsReceiptOpen(true);
                                }}
                                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition cursor-pointer flex items-center justify-between shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    isData
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                      : isAirtime
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : isElectricity
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  }`}>
                                    {isData && <Wifi className="w-5 h-5" />}
                                    {isAirtime && <PhoneCall className="w-5 h-5" />}
                                    {isElectricity && <Zap className="w-5 h-5" />}
                                    {isCable && <Tv className="w-5 h-5" />}
                                    {!isData && !isAirtime && !isElectricity && !isCable && <Wallet className="w-5 h-5" />}
                                  </div>

                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-white text-xs block">
                                      {tx.planName || `${tx.serviceType.toUpperCase()} Purchase`}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right flex flex-col items-end">
                                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block">
                                    ₦{tx.amount.toLocaleString()}
                                  </span>
                                  <div className="mt-0.5">
                                    <TransactionStatusBadge
                                      status={tx.status}
                                      failureReason={tx.failureReason}
                                      alignTooltip="right"
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}
              </main>

              {/* Mobile Bottom Navigation Bar matching mockup */}
              <BottomNav
                activeTab={activeTab}
                onTabChange={(tab) => {
                  hapticNavClick();
                  setActiveTab(tab);
                  if (tab === 'services') setIsBuyDataOpen(true);
                  if (tab === 'wallet') setIsFundWalletOpen(true);
                  if (tab === 'support') setIsSupportOpen(true);
                  if (tab === 'more') setIsProfileOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {/* ================= MODALS ================= */}
        {/* Receipt Modal */}
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          transaction={selectedTx}
          onDispute={(tx) => {
            setDisputeTx(tx);
            setIsSupportOpen(true);
          }}
        />

        {/* Fund Wallet Modal */}
        <FundWalletModal
          isOpen={isFundWalletOpen}
          onClose={() => setIsFundWalletOpen(false)}
          virtualAccounts={virtualAccounts}
          userId={user.id}
          onFundSuccess={loadUserData}
        />

        {/* Buy Data Modal */}
        <BuyDataModal
          isOpen={isBuyDataOpen}
          onClose={() => setIsBuyDataOpen(false)}
          userRole={user.role}
          userPhone={user.phone}
          userId={user.id}
          userEmail={user.email}
          userName={user.name}
          userPin={user.transactionPin || '1234'}
          walletBalance={user.walletBalance}
          onPurchaseSuccess={handlePurchaseSuccess}
          onError={handleTransactionError}
        />

        {/* Buy Airtime Modal */}
        <BuyAirtimeModal
          isOpen={isBuyAirtimeOpen}
          onClose={() => setIsBuyAirtimeOpen(false)}
          userRole={user.role}
          userPhone={user.phone}
          userId={user.id}
          userEmail={user.email}
          userName={user.name}
          userPin={user.transactionPin || '1234'}
          walletBalance={user.walletBalance}
          onPurchaseSuccess={handlePurchaseSuccess}
          onError={handleTransactionError}
        />

        {/* Pay Bills Modal */}
        <PayBillsModal
          isOpen={isPayBillsOpen}
          onClose={() => setIsPayBillsOpen(false)}
          defaultTab={payBillsTab}
          walletBalance={user.walletBalance}
          userPhone={user.phone}
          userId={user.id}
          userEmail={user.email}
          userName={user.name}
          userPin={user.transactionPin || '1234'}
          onPurchaseSuccess={handlePurchaseSuccess}
          onError={handleTransactionError}
        />

        {/* Profile Modal */}
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onOpenTransactions={() => setActiveTab('wallet')}
          onOpenSupport={() => setIsSupportOpen(true)}
          onLogout={() => {
            localStorage.removeItem('naeem_user_session');
            localStorage.removeItem('naeem_remembered_user');
            setUser({
              id: '',
              name: 'Guest User',
              email: '',
              phone: '',
              role: 'customer',
              status: 'active',
              isVerified: false,
              referralCode: '',
              walletBalance: 0,
              totalSavings: 0,
              referralEarnings: 0,
              totalTransactionsCount: 0,
              createdAt: new Date().toISOString(),
            });
            setCurrentView('landing');
          }}
        />

        {/* Support Modal */}
        <SupportModal
          isOpen={isSupportOpen}
          onClose={() => { setIsSupportOpen(false); setDisputeTx(null); }}
          user={user}
          disputeTx={disputeTx}
        />

        {/* Notifications Modal */}
        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notifications}
          userId={user.id}
          onMarkRead={handleMarkNotificationRead}
        />

        {/* Authentication Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          initialMode={authInitialMode}
          onAuthSuccess={(u) => {
            setUser(u);
            localStorage.setItem('naeem_user_session', JSON.stringify(u));
            localStorage.setItem('naeem_remembered_user', JSON.stringify({
              id: u.id,
              name: u.name,
              email: u.email,
              phone: u.phone,
              avatar: u.avatar,
              transactionPin: u.transactionPin || '1234',
            }));
            setCurrentView('app');
            loadUserData();
          }}
        />
      </div>
    </div>
  );
}
