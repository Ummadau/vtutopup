import React, { useState } from 'react';
import {
  Wifi,
  PhoneCall,
  Zap,
  Tv,
  GraduationCap,
  Plus,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronDown,
  ArrowRight,
  MessageCircle,
  Award,
  CheckCircle2,
  Users,
  Smartphone
} from 'lucide-react';
import { Logo } from './Logo.tsx';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onSelectService: (service: string) => void;
  onOpenResellerRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenRegister,
  onSelectService,
  onOpenResellerRegister,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How fast is data and airtime delivery on NPay?',
      a: 'All transactions are automated and delivered within 5 to 15 seconds directly to the recipient phone number. We maintain high-speed connections with MTN, Airtel, Glo, and 9mobile VTU gateways.',
    },
    {
      q: 'How do I fund my wallet?',
      a: 'You can fund your wallet via automated instant bank transfers to your dedicated virtual account (Wema Bank, Moniepoint, Sterling Bank), or pay online with debit cards and USSD through Paystack and Flutterwave.',
    },
    {
      q: 'Can I become a VTU reseller and earn money?',
      a: 'Yes! Registered resellers get access to our lowest wholesale data prices, sub-dealer discounts, and can resell to their own customers for handsome daily profits. You also receive an API key for custom integrations.',
    },
    {
      q: 'How does electricity token delivery work?',
      a: 'Once you select your distribution company (IKEDC, EKEDC, AEDC, IBEDC, etc.) and enter your prepaid meter number, our system verifies your name and generates your 20-digit STS token instantly on your screen and receipt.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Logo size="md" />

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-slate-600 dark:text-slate-300">
            <a href="#hero" className="hover:text-purple-700 dark:hover:text-purple-400 transition">Home</a>
            <a href="#services" className="hover:text-purple-700 dark:hover:text-purple-400 transition">Services</a>
            <a href="#why-us" className="hover:text-purple-700 dark:hover:text-purple-400 transition">Why Us</a>
            <a href="#reseller" className="hover:text-purple-700 dark:hover:text-purple-400 transition">Reseller</a>
            <a href="#faq" className="hover:text-purple-700 dark:hover:text-purple-400 transition">FAQ</a>
            <a href="#contact" className="hover:text-purple-700 dark:hover:text-purple-400 transition">Contact</a>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-xl text-purple-700 dark:text-purple-300 font-bold text-xs sm:text-sm hover:bg-purple-50 dark:hover:bg-purple-950/50 transition"
            >
              Login
            </button>
            <button
              onClick={onOpenRegister}
              className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-600/20 transition"
            >
              Register
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section matching the user's mockup layout */}
      <section id="hero" className="relative pt-8 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Fast, Affordable & Reliable Digital Services</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                Fast, Affordable & <br />
                <span className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-300">
                  Reliable Digital Services.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Buy Data, Airtime, Pay Bills and more with ease and confidence. Automated instant delivery, wholesale pricing, and 24/7 dedicated support.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={onOpenRegister}
                  className="px-7 py-3.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#services"
                  className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm shadow-sm transition"
                >
                  Learn More
                </a>
              </div>

              {/* Service Pills Card matching the mockup */}
              <div className="pt-4">
                <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                    Instant Services Available
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'data', name: 'Data', icon: Wifi, color: 'bg-purple-600 text-white' },
                      { id: 'airtime', name: 'Airtime', icon: PhoneCall, color: 'bg-emerald-600 text-white' },
                      { id: 'electricity', name: 'Electricity', icon: Zap, color: 'bg-amber-400 text-slate-950' },
                      { id: 'cable', name: 'Cable TV', icon: Tv, color: 'bg-rose-500 text-white' },
                      { id: 'exam', name: 'Exam Pins', icon: GraduationCap, color: 'bg-indigo-600 text-white' },
                      { id: 'more', name: 'More', icon: Plus, color: 'bg-purple-900 text-white' },
                    ].map(s => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          onClick={() => onSelectService(s.id)}
                          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-100 dark:border-slate-800 transition group cursor-pointer"
                        >
                          <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                            {s.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Visual matching the mockup */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-sm sm:max-w-md rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 ring-1 ring-purple-500/20">
                <img
                  src="/public/assets/aistudio/file_000000008bcc8243a78738db4143d576_09f5ebcf.png"
                  alt="NPay Nigerian VTU Platform"
                  className="w-full h-auto object-cover object-top"
                  style={{ maxHeight: '480px' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-950/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm">100% Secure & Automated</span>
                  </div>
                  <p className="text-xs text-purple-200">
                    Trusted by over 15,000 Nigerian students, business owners & resellers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose NPay section matching mockup banner */}
      <section id="why-us" className="py-12 bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-black">Why Choose NPay?</h2>
            <p className="text-xs sm:text-sm text-purple-200 mt-1">
              Built specifically for the Nigerian digital lifestyle and business environment
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">Super Fast Delivery</span>
                <span className="text-[11px] text-purple-200">5-15 sec automated</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">Best Prices</span>
                <span className="text-[11px] text-purple-200">Wholesale SME rates</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/30 text-blue-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">Secure & Reliable</span>
                <span className="text-[11px] text-purple-200">Double-entry ledger</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">24/7 Support</span>
                <span className="text-[11px] text-purple-200">WhatsApp & Tickets</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={onOpenRegister}
              className="px-8 py-3.5 rounded-2xl bg-white text-purple-900 hover:bg-purple-50 font-black text-sm shadow-xl transition"
            >
              Register Now
            </button>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="services" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-widest">
              Comprehensive VTU Services
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              Everything You Need in One Place
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              From mobile data bundles to utility bills and examination PINs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Service 1: Cheap Data */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center mb-4">
                <Wifi className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Cheap SME & Direct Data</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Get high-speed data for MTN, Airtel, Glo, and 9mobile at rock-bottom prices. SME, Corporate Gifting and Direct plans available with 30 days validity.
              </p>
              <button
                onClick={() => onSelectService('data')}
                className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1 hover:underline"
              >
                <span>Buy Data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Service 2: Airtime Top-Up */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-4">
                <PhoneCall className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Instant Airtime Recharge</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Enjoy up to 3.5% discount on every airtime recharge across all Nigerian networks. Instant balance top-up with zero transaction fees.
              </p>
              <button
                onClick={() => onSelectService('airtime')}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 hover:underline"
              >
                <span>Buy Airtime</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Service 3: Utility Bills & Exam PINs */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Bills & Exam Tokens</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Generate 20-digit prepaid electricity tokens (IKEDC, EKEDC, etc.), renew DStv/GOtv/StarTimes, and purchase WAEC, NECO & JAMB scratch cards instantly.
              </p>
              <button
                onClick={() => onSelectService('electricity')}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 hover:underline"
              >
                <span>Pay Bills</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Reseller Banner Section */}
      <section id="reseller" className="py-16 bg-slate-100 dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-900 p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="px-3 py-1 rounded-full bg-white/20 text-purple-200 text-xs font-bold">
                VTU RESELLER OPPORTUNITY
              </span>
              <h2 className="text-2xl sm:text-4xl font-black">
                Start Your Own Profitable VTU Business
              </h2>
              <p className="text-sm text-purple-200 leading-relaxed">
                Join our certified reseller network. Enjoy up to 15% lower wholesale data prices, free developer API keys, sub-reseller commission downlines, and marketing support.
              </p>
              <div className="pt-2">
                <button
                  onClick={onOpenResellerRegister}
                  className="px-7 py-3.5 rounded-2xl bg-white text-purple-950 hover:bg-purple-50 font-black text-sm shadow-md transition"
                >
                  Join Reseller Program
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-widest">
              Have Questions?
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <Logo size="md" white />
            <p className="text-xs text-slate-400 leading-relaxed">
              NPay is Nigeria's foremost automated platform for Virtual Top-Up, instant data subscriptions, electricity tokens, cable TV, and exam PINs.
            </p>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-3">Quick Services</span>
            <ul className="space-y-2 text-xs text-slate-300">
              <li><button onClick={() => onSelectService('data')} className="hover:text-white">MTN & Airtel SME Data</button></li>
              <li><button onClick={() => onSelectService('airtime')} className="hover:text-white">Discounted Airtime Topup</button></li>
              <li><button onClick={() => onSelectService('electricity')} className="hover:text-white">Prepaid Electricity Tokens</button></li>
              <li><button onClick={() => onSelectService('cable')} className="hover:text-white">DStv & GOtv Subscriptions</button></li>
              <li><button onClick={() => onSelectService('exam')} className="hover:text-white">WAEC & NECO Result PINs</button></li>
            </ul>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-3">Legal & Security</span>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Double-Entry Ledger Security</li>
              <li>Anti-Fraud Safeguards</li>
            </ul>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-3">Customer Support</span>
            <p className="text-xs text-slate-300 mb-2">Available 24/7 for instant assistance</p>
            <a
              href="https://wa.me/2348012345678"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Support</span>
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} NPay. All rights reserved. Fast, Affordable & Reliable Digital Services.
        </div>
      </footer>
    </div>
  );
};
