import React, { useState } from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2, RefreshCw, Info } from 'lucide-react';
import { parseTransactionFailureReason } from '../lib/transactionStatus.ts';

interface TransactionStatusBadgeProps {
  status: string;
  failureReason?: string;
  className?: string;
  alignTooltip?: 'right' | 'left' | 'center';
}

export const TransactionStatusBadge: React.FC<TransactionStatusBadgeProps> = ({
  status,
  failureReason,
  className = '',
  alignTooltip = 'right',
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (status === 'successful') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 ${className}`}
      >
        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
        Success
      </span>
    );
  }

  if (status === 'pending') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 ${className}`}
      >
        <RefreshCw className="w-2.5 h-2.5 animate-spin shrink-0" />
        Pending
      </span>
    );
  }

  if (status === 'reversed') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 ${className}`}
      >
        Reversed
      </span>
    );
  }

  // Failed status with descriptive hover tooltip explaining 'Timeout' vs 'Insufficient Provider Balance'
  const failInfo = parseTransactionFailureReason(failureReason);

  // Position alignment
  const tooltipAlignClass =
    alignTooltip === 'left'
      ? 'left-0'
      : alignTooltip === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-0';

  const arrowAlignClass =
    alignTooltip === 'left'
      ? 'left-4'
      : alignTooltip === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-4';

  return (
    <div
      className={`relative inline-block group/txstatus ${className}`}
      onClick={(e) => {
        // Toggle mobile tooltip on tap without navigating/opening modal immediately if tapped directly
        e.stopPropagation();
        setIsMobileOpen((prev) => !prev);
      }}
      onMouseLeave={() => setIsMobileOpen(false)}
    >
      {/* Badge Button / Pill */}
      <span
        title={`${failInfo.tooltipTitle}: ${failInfo.tooltipExplanation}`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase cursor-help transition-all shadow-2xs group-hover/txstatus:scale-105 ${failInfo.badgeClass}`}
      >
        {failInfo.category === 'Timeout' ? (
          <Clock className="w-2.5 h-2.5 shrink-0 animate-pulse text-amber-700 dark:text-amber-300" />
        ) : failInfo.category === 'Insufficient Provider Balance' ? (
          <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-orange-700 dark:text-orange-300" />
        ) : (
          <AlertCircle className="w-2.5 h-2.5 shrink-0 text-rose-700 dark:text-rose-300" />
        )}
        <span>{failInfo.badgeLabel}</span>
        <Info className="w-2.5 h-2.5 opacity-60 ml-0.5 shrink-0" />
      </span>

      {/* Descriptive Status Tooltip on hover (and mobile tap) */}
      <div
        role="tooltip"
        className={`absolute bottom-full mb-2 z-50 w-64 sm:w-72 p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-950 text-white shadow-2xl border border-slate-700/80 backdrop-blur-md text-left transition-all duration-200 ${tooltipAlignClass} ${
          isMobileOpen ? 'flex flex-col pointer-events-auto' : 'hidden group-hover/txstatus:flex flex-col pointer-events-none'
        }`}
      >
        {/* Header with Classification category */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${failInfo.badgeDotClass}`} />
            <span className="text-xs font-black tracking-wide uppercase text-slate-100">
              {failInfo.tooltipTitle}
            </span>
          </div>
          <span
            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
              failInfo.category === 'Timeout'
                ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                : failInfo.category === 'Insufficient Provider Balance'
                ? 'bg-orange-900/60 text-orange-300 border border-orange-700/50'
                : 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
            }`}
          >
            {failInfo.category}
          </span>
        </div>

        {/* User-friendly explanation */}
        <p className="text-xs text-slate-200 leading-relaxed font-normal">
          {failInfo.tooltipExplanation}
        </p>

        {/* Diagnostic raw reason from failureReason */}
        {failInfo.rawReason && (
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
              Provider Reason Details:
            </span>
            <div className="text-[10px] font-mono text-slate-300 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50 break-words leading-tight">
              {failInfo.rawReason}
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400 pt-1">
          <span>Tap card for receipt</span>
          <span className="font-semibold text-purple-400">NAEEM VTU Guard</span>
        </div>

        {/* Tooltip pointer arrow */}
        <div
          className={`absolute top-full -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-950 ${arrowAlignClass}`}
        />
      </div>
    </div>
  );
};
