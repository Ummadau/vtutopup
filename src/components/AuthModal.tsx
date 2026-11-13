import React, { useState } from 'react';
import {
  User as UserIcon,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, firestoreDb, apiFetch } from '../lib/firebase.ts';
import { getUser, setUser } from '../lib/firebaseService.ts';
import { Logo } from './Logo.tsx';
import { User } from '../types/index.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setInfoMessage(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Safe JSON response reader that never crashes on HTML or non-JSON responses
  const safeParseJson = async (res: Response): Promise<any> => {
    try {
      const text = await res.text();
      if (!text || (!text.trim().startsWith('{') && !text.trim().startsWith('['))) {
        return null;
      }
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  // Unified Registration with Firebase Auth + Firestore Resilience
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Firebase Auth user creation
      let fbUid: string | null = null;
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        fbUid = cred.user?.uid || null;
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email already exists. Please sign in instead.');
        } else if (fbErr.code !== 'auth/configuration-not-found') {
          console.warn('Firebase Auth note:', fbErr.message);
        }
      }

      // 2. Synchronize with backend API
      let registeredUser: User | null = null;
      try {
        const res = await apiFetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, email: cleanEmail, password, referralCode, uid: fbUid }),
        });
        const data = await safeParseJson(res);
        if (res.ok && data?.user) {
          registeredUser = data.user;
        } else if (data?.error) {
          throw new Error(data.error);
        }
      } catch (fetchErr: any) {
        if (fetchErr.message && !fetchErr.message.includes('Unexpected token') && !fetchErr.message.includes('JSON')) {
          throw fetchErr;
        }
      }

      // 3. Fallback: Construct user only if Firebase Auth succeeded and backend returned non-JSON
      if (!registeredUser && fbUid) {
        const generatedRefCode = name.replace(/\s+/g, '').slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900);
        registeredUser = {
          id: fbUid,
          name: name.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          role: (cleanEmail === 'naeemummadau@gmail.com' || cleanEmail === 'ahmadnaim2877@gmail.com') ? 'admin' : 'customer',
          status: 'active',
          isVerified: true,
          referralCode: generatedRefCode,
          referredBy: referralCode || undefined,
          walletBalance: 0,
          totalSavings: 0,
          referralEarnings: 0,
          totalTransactionsCount: 0,
          createdAt: new Date().toISOString(),
        };
      }

      if (!registeredUser) {
        throw new Error('Registration service unavailable. Please try again.');
      }

      // 4. Persist to Firestore
      await setUser(registeredUser).catch(err => console.warn('Firestore sync note:', err));

      onAuthSuccess(registeredUser);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Unified Single Login with Firebase Auth + Backend Verification
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanIdentifier = identifier.trim().toLowerCase();
    if (!cleanIdentifier || !loginPassword) {
      setErrorMessage('Please enter both your email/phone and password.');
      return;
    }

    setLoading(true);
    try {
      // 1. Firebase Auth sign in if identifier is an email
      let fbAuthed = false;
      let fbUid: string | null = null;
      if (cleanIdentifier.includes('@')) {
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanIdentifier, loginPassword);
          fbAuthed = true;
          fbUid = cred.user?.uid || null;
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
            // Only abort immediately if not logging in with a server-managed seed admin password
            if (cleanIdentifier !== 'naeemummadau@gmail.com') {
              throw new Error('Incorrect password. Please verify your password.');
            }
          }
        }
      }

      // 2. Verify with backend API
      let authedUser: User | null = null;
      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanIdentifier, password: loginPassword }),
        });
        const data = await safeParseJson(res);
        if (res.ok && data?.user) {
          authedUser = data.user;
        } else if (data?.error) {
          throw new Error(data.error);
        }
      } catch (fetchErr: any) {
        if (fetchErr.message && !fetchErr.message.includes('Unexpected token') && !fetchErr.message.includes('JSON')) {
          if (!fbAuthed) {
            throw fetchErr;
          }
        }
      }

      // 3. Synchronize Firebase Auth session if phone/username login succeeded on server
      if (authedUser && !fbAuthed && authedUser.email) {
        await signInWithEmailAndPassword(auth, authedUser.email, loginPassword).catch(() => {});
      }

      // 4. Fallback ONLY if Firebase Auth already verified the user's password
      let isFallbackUser = false;
      if (!authedUser && fbAuthed) {
        try {
          if (fbUid) {
            const directUser = await getUser(fbUid).catch(() => null);
            if (directUser) {
              authedUser = directUser;
            }
          }
          if (!authedUser) {
            const qUsers = query(collection(firestoreDb, 'users'), where('email', '==', cleanIdentifier));
            const snap = await getDocs(qUsers).catch(() => null);
            if (snap && !snap.empty) {
              authedUser = snap.docs[0].data() as User;
            } else if (fbUid) {
              isFallbackUser = true;
              authedUser = {
                id: fbUid,
                name: cleanIdentifier.split('@')[0],
                email: cleanIdentifier,
                phone: '',
                role: (cleanIdentifier === 'naeemummadau@gmail.com' || cleanIdentifier === 'ahmadnaim2877@gmail.com') ? 'admin' : 'customer',
                status: 'active',
                isVerified: true,
                referralCode: 'NPAY' + Math.floor(100 + Math.random() * 900),
                walletBalance: 0,
                totalSavings: 0,
                referralEarnings: 0,
                totalTransactionsCount: 0,
                createdAt: new Date().toISOString(),
              };
            }
          }
        } catch (fsErr) {
          console.warn('Firestore verified lookup note:', fsErr);
        }
      }

      if (!authedUser) {
        throw new Error('Invalid credentials or account not found. Please check your details.');
      }

      // Only create user in Firestore if no document exists yet (never overwrite existing balances/virtual accounts)
      const existingFsUser = await getUser(authedUser.id).catch(() => null);
      if (existingFsUser) {
        if (isFallbackUser) {
          authedUser = existingFsUser;
        }
      } else {
        await setUser(authedUser).catch(err => console.warn('Firestore sync note:', err));
      }

      onAuthSuccess(authedUser);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Password Reset via Firebase Auth
  const handleForgotPassword = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    const cleanEmail = identifier.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Enter your registered email address in the field above, then click Forgot Password.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setInfoMessage(`Password reset instructions have been sent to ${cleanEmail}. Please check your inbox.`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to send password reset email. Please verify your email address.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In via Firebase Auth + Verified ID Token
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      if (!fbUser.email) throw new Error('No email returned from Google');
      const cleanEmail = fbUser.email.toLowerCase();
      const idToken = await fbUser.getIdToken();

      // Verify token with backend API
      let userObj: User | null = null;
      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanEmail, idToken }),
        });
        const data = await safeParseJson(res);
        if (res.ok && data?.user) {
          userObj = data.user;
        }
      } catch {}

      if (!userObj && fbUser.uid) {
        userObj = await getUser(fbUser.uid).catch(() => null);
      }

      if (!userObj) {
        try {
          const qUsers = query(collection(firestoreDb, 'users'), where('email', '==', cleanEmail));
          const snap = await getDocs(qUsers).catch(() => null);
          if (snap && !snap.empty) {
            userObj = snap.docs[0].data() as User;
          }
        } catch {}
      }

      if (!userObj) {
        const newId = fbUser.uid || `usr_${Date.now()}`;
        userObj = {
          id: newId,
          name: fbUser.displayName || 'Google User',
          phone: fbUser.phoneNumber || `080${Math.floor(10000000 + Math.random() * 90000000)}`,
          email: cleanEmail,
          role: (cleanEmail === 'naeemummadau@gmail.com' || cleanEmail === 'ahmadnaim2877@gmail.com') ? 'admin' : 'customer',
          status: 'active',
          isVerified: true,
          referralCode: (fbUser.displayName || 'USER').replace(/\s+/g, '').slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900),
          walletBalance: 0,
          totalSavings: 0,
          referralEarnings: 0,
          totalTransactionsCount: 0,
          createdAt: new Date().toISOString(),
        };
        await setUser(userObj).catch(() => {});
      }

      if (cleanEmail === 'naeemummadau@gmail.com' || cleanEmail === 'ahmadnaim2877@gmail.com') {
        userObj.role = 'admin';
      }

      onAuthSuccess(userObj);
      onClose();
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' && typeof window !== 'undefined') {
        setErrorMessage(
          `Domain "${window.location.hostname}" is not authorized for Google Sign-In yet. Add it in Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else {
        setErrorMessage(err?.message || 'Google authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Curved Purple Top */}
        <div className="relative bg-gradient-to-br from-purple-800 via-purple-700 to-indigo-900 pt-7 pb-6 px-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            ✕
          </button>
          <div className="flex justify-center mb-1">
            <Logo size="lg" white />
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {infoMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              {infoMessage}
            </div>
          )}



          {/* CREATE ACCOUNT MODE */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="text-center mb-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Create Account</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Join us today and enjoy our services</p>
              </div>

              {/* Full Name */}
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Phone Number */}
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Referral Code (Optional) */}
              <div className="relative">
                <Sparkles className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value)}
                  placeholder="Referral Code (Optional)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600 uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Register Account'}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* SINGLE UNIFIED SIGN IN MODE (Handles both admin and all users) */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Welcome Back!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sign in to your account</p>
              </div>

              {/* Identifier */}
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Phone Number or Email"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline disabled:opacity-50"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                <span className="flex-shrink mx-3 text-xs text-slate-400 uppercase font-bold">OR</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              </div>

              {/* Google Sign In via Firebase Auth */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2.5 shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('register')}
                className="w-full py-3 rounded-2xl border border-purple-200 dark:border-purple-800/80 text-purple-700 dark:text-purple-400 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <UserIcon className="w-4 h-4" />
                <span>Create New Account</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
