import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Award, ShieldCheck, Copy, Check, ArrowUpRight, Zap, RefreshCw, Key, Code2 } from 'lucide-react';
import { User, DataPlan } from '../types/index.ts';

interface ResellerDashboardProps {
  user: User;
  onOpenBuyData: () => void;
  onOpenBuyAirtime: () => void;
  onOpenFundWallet: () => void;
}

export const ResellerDashboard: React.FC<ResellerDashboardProps> = ({
  user,
  onOpenBuyData,
  onOpenBuyAirtime,
  onOpenFundWallet,
}) => {
  const [stats, setStats] = useState<any>({
    walletBalance: user.walletBalance,
    totalProfit: 18400,
    totalSalesVolume: 124000,
    referredCount: 8,
    referralEarnings: user.referralEarnings,
    referralCode: user.referralCode,
    referredUsers: [],
  });
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey] = useState(`NDS_RES_${user.referralCode}_${Date.now().toString().slice(-6)}`);

  useEffect(() => {
    fetch('/api/reseller/stats', {
      headers: { 'x-user-id': user.id },
    })
      .then(res => res.ok ? res.json().catch(() => ({})) : {})
      .then(data => {
        if (data && Object.keys(data).length > 0) setStats(data);
      })
      .catch(() => {});

    fetch('/api/admin/data-plans')
      .then(res => res.ok ? res.json().catch(() => ({})) : {})
      .then(data => {
        if (data && data.plans) setPlans(data.plans);
      })
      .catch(() => {});
  }, [user]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-xs font-bold border border-purple-400/30 mb-3">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Certified VTU Reseller Account</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {user.name}
            </h1>
            <p className="text-sm text-purple-200 mt-1 max-w-lg">
              Enjoy exclusive wholesale data discounts, sub-dealer commissions, and automated developer API access.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenFundWallet}
              className="px-5 py-3 rounded-2xl bg-white text-purple-900 hover:bg-purple-50 font-bold text-sm shadow-md transition"
            >
              Fund Reseller Wallet
            </button>
            <button
              onClick={onOpenBuyData}
              className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-md transition"
            >
              Order Wholesale Data
            </button>
          </div>
        </div>
      </div>

      {/* Reseller Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Reseller Balance</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 flex items-center justify-center">
              ₦
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            ₦{user.walletBalance.toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-600 font-bold block mt-1">Ready for instant dispatch</span>
        </div>

        {/* Total Profit */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Estimated Reseller Profit</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            ₦{stats.totalProfit.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">From sales margins</span>
        </div>

        {/* Downlines / Referrals */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Active Customers / Downlines</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.referredCount || 8}
          </span>
          <span className="text-[11px] text-purple-600 font-bold block mt-1">Using your referral code</span>
        </div>

        {/* Affiliate Commission */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Referral Commissions</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            ₦{user.referralEarnings.toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-600 font-bold block mt-1">Credited directly to wallet</span>
        </div>
      </div>

      {/* Wholesale Pricing Table Comparison */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Wholesale Price List</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compare retail customer prices vs your exclusive reseller rates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold">
              Up to 15% Reseller Margin
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3">Network</th>
                <th className="pb-3">Data Plan</th>
                <th className="pb-3">Validity</th>
                <th className="pb-3">Normal Price</th>
                <th className="pb-3 text-purple-700 dark:text-purple-400">Reseller Price</th>
                <th className="pb-3 text-emerald-600">Your Profit/GB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {plans.slice(0, 8).map((plan) => {
                const profit = plan.customerPrice - plan.resellerPrice;
                return (
                  <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 font-bold uppercase">{plan.network}</td>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">{plan.name}</td>
                    <td className="py-3 text-slate-500">{plan.validity}</td>
                    <td className="py-3 text-slate-500 line-through">₦{plan.customerPrice.toLocaleString()}</td>
                    <td className="py-3 font-black text-purple-700 dark:text-purple-400 text-sm">
                      ₦{plan.resellerPrice.toLocaleString()}
                    </td>
                    <td className="py-3 font-black text-emerald-600">
                      +₦{profit.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reseller Tools & API Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Referral Link & Downlines */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Reseller Referral Code</h3>
              <p className="text-xs text-slate-400">Earn 5% on every deposit from your referred users</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/60">
            <span className="font-mono text-base font-black text-purple-900 dark:text-purple-300">
              {user.referralCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Developer API Key */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">VTU Reseller API Access</h3>
              <p className="text-xs text-slate-400">Integrate into your own website or mobile app</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate mr-2">
              {apiKey}
            </span>
            <button
              onClick={handleCopyKey}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition shrink-0"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
