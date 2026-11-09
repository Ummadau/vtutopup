import React from 'react';
import { Home, Grid, Wallet, HelpCircle, Menu } from 'lucide-react';
import { hapticNavClick } from '../lib/haptics.ts';

interface BottomNavProps {
  activeTab: 'home' | 'services' | 'wallet' | 'support' | 'more';
  onTabChange: (tab: 'home' | 'services' | 'wallet' | 'support' | 'more') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'services', label: 'Services', icon: Grid },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'support', label: 'Support', icon: HelpCircle },
    { id: 'more', label: 'More', icon: Menu },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 shadow-lg md:hidden">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                hapticNavClick();
                onTabChange(tab.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition ${
                isActive
                  ? 'text-purple-700 dark:text-purple-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-purple-100 dark:bg-purple-950/60 scale-110' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
