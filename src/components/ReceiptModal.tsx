import React, { useState } from 'react';
import { CheckCircle2, Clock, XCircle, RefreshCw, Copy, Check, Printer, Share2, AlertTriangle, ShieldCheck, Download } from 'lucide-react';
import { Transaction } from '../types/index.ts';
import { Logo } from './Logo.tsx';
import { parseTransactionFailureReason } from '../lib/transactionStatus.ts';
import { hapticLight, hapticSuccess } from '../lib/haptics.ts';

interface ReceiptModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onDispute?: (transaction: Transaction) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onDispute,
}) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  if (!isOpen || !transaction) return null;

  const handleCopy = (text: string, type: 'token' | 'ref') => {
    hapticLight();
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'successful':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Successful</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
            <span>Pending</span>
          </div>
        );
      case 'reversed':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span>Reversed</span>
          </div>
        );
      default: {
        const failInfo = parseTransactionFailureReason(transaction?.failureReason);
        return (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              failInfo.category === 'Timeout'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300'
                : failInfo.category === 'Insufficient Provider Balance'
                ? 'bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300'
            }`}
          >
            {failInfo.category === 'Timeout' ? (
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            ) : failInfo.category === 'Insufficient Provider Balance' ? (
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{failInfo.badgeLabel}</span>
          </div>
        );
      }
    }
  };

  const handleShare = async () => {
    if (!transaction) return;
    setIsSharing(true);

    const shareText = `🧾 NAEEM DATA SUB TRANSACTION RECEIPT
------------------------------------------
Service: ${transaction.planName || transaction.serviceType.toUpperCase()}
Amount: ₦${transaction.amount.toLocaleString()}
Recipient: ${transaction.recipient}
Network/Provider: ${(transaction.network || 'N/A').toUpperCase()}
Reference: ${transaction.reference}
Status: ${transaction.status.toUpperCase()}
${transaction.token ? `STS Token: ${transaction.token}\n` : ''}Date: ${new Date(transaction.date).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
------------------------------------------
Verified by NAEEM DATA SUB Platform`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${transaction.reference}`,
          text: shareText,
          url: window.location.href,
        });
        hapticSuccess();
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          hapticLight();
          await navigator.clipboard.writeText(shareText);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 3000);
        }
      }
    } else {
      try {
        hapticLight();
        await navigator.clipboard.writeText(shareText);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (err) {
        console.error(err);
      }
    }
    setIsSharing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 p-5 text-white flex items-center justify-between">
          <Logo size="sm" white showTagline={false} />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status & Amount */}
          <div className="text-center pb-4 border-b border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex justify-center mb-2">
              {getStatusBadge(transaction.status)}
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              ₦{transaction.amount.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {transaction.planName || `${transaction.serviceType.toUpperCase()} Purchase`}
            </p>
          </div>

          {/* Token Display (if electricity or exam pin) */}
          {transaction.token && (
            <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">
                  {transaction.serviceType === 'electricity' ? 'STS Electricity Token' : 'Exam Result PIN / Token'}
                </span>
                <button
                  onClick={() => handleCopy(transaction.token!, 'token')}
                  className="flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:text-purple-900"
                >
                  {copiedToken ? (
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
              <p className="font-mono text-base font-black tracking-widest text-purple-950 dark:text-purple-200 select-all break-all">
                {transaction.token}
              </p>
              {transaction.serviceType === 'electricity' && (
                <p className="text-[11px] text-purple-700/80 dark:text-purple-400 mt-1">
                  Key this 20-digit token into your prepaid meter and press enter.
                </p>
              )}
            </div>
          )}

          {/* Details Table */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-slate-400">Recipient / Beneficiary</span>
              <span className="font-bold text-slate-900 dark:text-white text-right break-all">
                {transaction.recipient}
              </span>
            </div>

            {transaction.network && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-slate-400">Network / Provider</span>
                <span className="font-bold text-slate-900 dark:text-white uppercase">
                  {transaction.network}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-slate-400">Reference No</span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>{transaction.reference}</span>
                <button
                  onClick={() => handleCopy(transaction.reference, 'ref')}
                  className="text-purple-600 hover:text-purple-800"
                  title="Copy reference"
                >
                  {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 dark:text-slate-400">Date & Time</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {new Date(transaction.date).toLocaleString('en-NG', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>

            {transaction.paymentMethod && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-slate-400">Payment Channel</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {transaction.paymentMethod}
                </span>
              </div>
            )}

            {transaction.providerReference && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-slate-400">Provider Ref</span>
                <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                  {transaction.providerReference}
                </span>
              </div>
            )}

            {transaction.failureReason && (() => {
              const failInfo = parseTransactionFailureReason(transaction.failureReason);
              return (
                <div
                  className={`p-3.5 rounded-2xl text-xs border ${
                    failInfo.category === 'Timeout'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900/60'
                      : failInfo.category === 'Insufficient Provider Balance'
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-900/60'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                      {failInfo.category === 'Timeout' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                      {failInfo.category === 'Insufficient Provider Balance' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                      )}
                      {failInfo.category === 'Declined' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                      {failInfo.tooltipTitle}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80">
                      {failInfo.category}
                    </span>
                  </div>
                  <p className="leading-relaxed text-[11px] opacity-90 mb-1.5">
                    {failInfo.tooltipExplanation}
                  </p>
                  <div className="text-[10px] font-mono opacity-80 pt-1.5 border-t border-current/20 break-words">
                    <span className="font-sans font-bold">Details: </span>
                    {transaction.failureReason}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Security stamp */}
          <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Verified by NAEEM DATA SUB Platform</span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800/80 transition"
          >
            {shareSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400">Shared!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                <span>Share</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-600 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          {onDispute && (
            <button
              onClick={() => {
                onClose();
                onDispute(transaction);
              }}
              className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 transition"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Dispute</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
