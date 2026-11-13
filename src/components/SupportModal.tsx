import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Plus, Send, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { SupportTicket, Transaction, User } from '../types/index.ts';
import { apiFetch } from '../lib/firebase.ts';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  disputeTx?: Transaction | null;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  user,
  disputeTx,
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [isCreating, setIsCreating] = useState(!!disputeTx);

  // New ticket state
  const [subject, setSubject] = useState(
    disputeTx ? `Dispute for Transaction ${disputeTx.reference}` : ''
  );
  const [category, setCategory] = useState<'Transaction' | 'Wallet' | 'Account' | 'Technical' | 'General'>(
    disputeTx ? 'Transaction' : 'General'
  );
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [message, setMessage] = useState(
    disputeTx ? `I would like to dispute transaction ${disputeTx.reference} of ₦${disputeTx.amount.toLocaleString()} for ${disputeTx.recipient}.` : ''
  );

  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTickets = () => {
    apiFetch('/api/support/tickets', {
      headers: { 'x-user-id': user.id },
    })
      .then(res => res.ok ? res.json().catch(() => ({})) : {})
      .then((d: any) => {
        if (d && d.tickets) {
          setTickets(d.tickets);
          if (activeTicket) {
            const found = d.tickets.find((t: any) => t.id === activeTicket.id);
            if (found) setActiveTicket(found);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
      if (disputeTx) {
        setIsCreating(true);
        setSubject(`Dispute: ${disputeTx.reference}`);
        setCategory('Transaction');
        setMessage(`I experienced an issue with transaction ${disputeTx.reference} (${disputeTx.planName || disputeTx.serviceType}) of ₦${disputeTx.amount.toLocaleString()} to ${disputeTx.recipient}. Please investigate.`);
      }
    }
  }, [isOpen, disputeTx]);

  if (!isOpen) return null;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ subject, category, priority, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data) {
        setIsCreating(false);
        setActiveTicket(data.ticket);
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyMessage.trim()) return;
    try {
      const res = await apiFetch(`/api/support/tickets/${activeTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ message: replyMessage }),
      });
      if (res.ok) {
        setReplyMessage('');
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
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
            <span className="text-sm font-black tracking-wider uppercase">NPAY SUPPORT</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Quick WhatsApp Support Strip */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-xs block">Official WhatsApp Desk</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">+234 801 234 5678 (Instant)</span>
              </div>
            </div>
            <a
              href="https://wa.me/2348012345678"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
            >
              Chat Now
            </a>
          </div>

          {/* If viewing a ticket conversation */}
          {activeTicket ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTicket(null)}
                  className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline"
                >
                  ← Back to Tickets
                </button>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase">
                  {activeTicket.status}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{activeTicket.subject}</h4>
                <span className="text-[11px] text-slate-400">Category: {activeTicket.category}</span>
              </div>

              {/* Chat Thread */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                {activeTicket.messages.map(m => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                      m.sender === 'user'
                        ? 'ml-auto bg-purple-700 text-white'
                        : 'mr-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                    }`}
                  >
                    <span className="block text-[10px] opacity-75 font-bold mb-0.5">{m.senderName}</span>
                    <p className="leading-relaxed">{m.message}</p>
                    <span className="block text-[9px] opacity-60 text-right mt-1">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Type your reply..."
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : isCreating ? (
            /* Create Ticket Form */
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Open Support Ticket</h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Brief description of the issue"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-500">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="Transaction">Transaction Issue</option>
                    <option value="Wallet">Wallet Funding</option>
                    <option value="Account">Account / Reseller</option>
                    <option value="General">General Inquiry</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500">Message</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Provide complete details..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition"
              >
                Submit Ticket
              </button>
            </form>
          ) : (
            /* Ticket List */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Support Tickets</h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Ticket</span>
                </button>
              </div>

              {tickets.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No support tickets opened yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setActiveTicket(t)}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-purple-300 transition cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{t.subject}</span>
                        <span className="text-[11px] text-slate-400">{t.category} • {new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        t.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
