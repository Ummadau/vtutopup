import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface ToastPopupProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastPopup: React.FC<ToastPopupProps> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-2xl shadow-xl border backdrop-blur-md flex items-start gap-3 transition-all duration-300 animate-slide-in-right ${
            t.type === 'success'
              ? 'bg-emerald-900/90 text-white border-emerald-500/50'
              : t.type === 'error'
              ? 'bg-rose-900/90 text-white border-rose-500/50'
              : 'bg-purple-900/90 text-white border-purple-500/50'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {t.type === 'info' && <ShieldCheck className="w-5 h-5 text-purple-400" />}
          </div>

          <div className="flex-1 text-xs">
            <h5 className="font-bold text-sm tracking-wide">{t.title}</h5>
            <p className="opacity-90 font-medium mt-0.5 leading-snug">{t.message}</p>
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-white/60 hover:text-white transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
