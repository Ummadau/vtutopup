import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, CheckCircle2, AlertTriangle, Sparkles, Info, Volume2, ShieldCheck } from 'lucide-react';
import { NotificationItem } from '../types/index.ts';
import { requestFCMPermission } from '../lib/fcmService.ts';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  userId?: string;
  onMarkRead: (id: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  userId,
  onMarkRead,
}) => {
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'prompt' | 'registering'>('prompt');
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setPushStatus('granted');
      } else if (Notification.permission === 'denied') {
        setPushStatus('denied');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnableFCMPush = async () => {
    if (!userId) return;
    setPushStatus('registering');
    const token = await requestFCMPermission(userId);
    if (token) {
      setFcmToken(token);
      setPushStatus('granted');
    } else {
      setPushStatus(typeof window !== 'undefined' && Notification.permission === 'denied' ? 'denied' : 'prompt');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-purple-800 via-purple-700 to-indigo-800 p-4 text-white flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <span className="text-sm font-black tracking-wider uppercase">NOTIFICATIONS</span>
          </div>
          <div className="w-8" />
        </div>

        {/* FCM Web Push Banner */}
        <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-800/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">Realtime FCM Push Alerts</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Get push notifications for successful transactions & low balance alerts</p>
              </div>
            </div>

            {pushStatus === 'granted' ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Active</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleEnableFCMPush}
                disabled={pushStatus === 'registering'}
                className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] shadow transition disabled:opacity-50 cursor-pointer"
              >
                {pushStatus === 'registering' ? 'Registering...' : 'Enable Push'}
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="p-5 overflow-y-auto space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span>You have no notifications yet</span>
            </div>
          ) : (
            notifications.map(notif => {
              const isSuccess = notif.type === 'success';
              const isPromo = notif.type === 'promo';
              const isWarning = notif.type === 'warning';

              return (
                <div
                  key={notif.id}
                  onClick={() => onMarkRead(notif.id)}
                  className={`p-3.5 rounded-2xl border transition text-xs cursor-pointer ${
                    notif.read
                      ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 opacity-70'
                      : 'border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSuccess
                        ? 'bg-emerald-100 text-emerald-700'
                        : isPromo
                        ? 'bg-purple-100 text-purple-700'
                        : isWarning
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                      {isPromo && <Sparkles className="w-4 h-4" />}
                      {isWarning && <AlertTriangle className="w-4 h-4" />}
                      {!isSuccess && !isPromo && !isWarning && <Info className="w-4 h-4" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{notif.title}</span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1.5 block">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
