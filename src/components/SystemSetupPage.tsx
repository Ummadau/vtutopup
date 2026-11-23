import React, { useEffect, useState } from 'react';
import { ShieldCheck, Database, CheckCircle2, AlertTriangle, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { safeFetchJson } from '../lib/safeFetch.ts';

interface SetupStatusResponse {
  installed: boolean;
  storageMode: string;
  phpInstallerPath?: string;
}

export const SystemSetupPage: React.FC<{ onGoHome: () => void }> = ({ onGoHome }) => {
  const [status, setStatus] = useState<SetupStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3306');
  const [socketPath, setSocketPath] = useState('');
  const [database, setDatabase] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [ssl, setSsl] = useState(false);

  const [platformName, setPlatformName] = useState('NAEEM DATA SUB');
  const [adminName, setAdminName] = useState('Naeem Ummadau');
  const [adminEmail, setAdminEmail] = useState('naeemummadau@gmail.com');
  const [adminPhone, setAdminPhone] = useState('08000000001');
  const [adminPin, setAdminPin] = useState('1234');
  const [adminPassword, setAdminPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await safeFetchJson('/api/setup/status');
      if (res.ok && res.data) {
        setStatus(res.data as SetupStatusResponse);
      }
    } catch {
      setStatus({ installed: true, storageMode: 'unknown' });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleTestConnection = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await safeFetchJson('/api/setup/test-mysql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: Number(port) || 3306,
          socketPath,
          user,
          password,
          database,
          ssl,
        }),
      });
      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          text: `MySQL connection succeeded (existing tables found: ${res.data.existingTables ?? 0}).`,
        });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Unable to connect to MySQL database.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error testing database connection.' });
    } finally {
      setBusy(false);
    }
  };

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await safeFetchJson('/api/setup/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          port: Number(port) || 3306,
          socketPath,
          user,
          password,
          database,
          ssl,
          platformName,
          adminName,
          adminEmail,
          adminPhone,
          adminPin,
          adminPassword,
        }),
      });
      if (res.ok && res.data?.success) {
        setFeedback({
          type: 'success',
          text: res.data.message || 'System and MySQL database installed successfully!',
        });
        await loadStatus();
      } else {
        setFeedback({ type: 'error', text: res.error || 'System installation failed.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error running installation.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-700 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">NAEEM DATA SUB — System Installer</h1>
              <p className="text-emerald-100 text-sm mt-1">
                Automated MySQL database table provisioning, catalog seeding, and Super Admin setup.
              </p>
            </div>
            <Database className="w-10 h-10 text-emerald-200 shrink-0" />
          </div>
        </div>

        {loadingStatus ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Checking installation state...</span>
          </div>
        ) : status?.installed ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">System Already Installed &amp; Protected</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  This platform is already initialized and locked against re-installation to protect your live database.
                </p>
              </div>
            </div>

            {feedback && (
              <div
                className={`p-3.5 rounded-xl text-sm font-medium ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <p>
                <strong>cPanel PHP Installer Link:</strong> On Apache shared hosting, upload <code>public_html/setup.php</code> and open{' '}
                <code>/setup.php</code> in your browser to run the standalone PHP &amp; MySQL installer.
              </p>
              <p>
                <strong>Active Storage Engine:</strong> <span className="uppercase font-semibold">{status.storageMode}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={onGoHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Platform Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleInstall} className="space-y-5">
            {feedback && (
              <div
                className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                MySQL Database Connection
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Host</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="localhost"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="3306"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Database Name</label>
                  <input
                    type="text"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="cpaneluser_dbname"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Database Username</label>
                  <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="cpaneluser_dbuser"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Database Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter MySQL password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Unix Socket (optional)</label>
                  <input
                    type="text"
                    value={socketPath}
                    onChange={(e) => setSocketPath(e.target.value)}
                    placeholder="/var/lib/mysql/mysql.sock"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} />
                Enable SSL/TLS connection
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={handleTestConnection}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-sm font-semibold transition"
              >
                Test MySQL Connection
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Platform &amp; Super Admin Account
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Platform Name</label>
                  <input
                    type="text"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Super Admin Name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Super Admin Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Super Admin Phone</label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Admin Password (min 8 chars)</label>
                  <input
                    type="password"
                    minLength={8}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Create strong admin password"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">4-Digit Transaction PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    pattern="\d{4}"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition"
                >
                  {busy ? 'Installing System...' : 'Install System & Create MySQL Tables'}
                </button>
                <button
                  type="button"
                  onClick={onGoHome}
                  className="px-5 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
