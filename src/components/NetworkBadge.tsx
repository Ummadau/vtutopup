import React from 'react';
import { NetworkType } from '../types/index.ts';

interface NetworkBadgeProps {
  network: NetworkType | string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  showName?: boolean;
}

export const NetworkBadge: React.FC<NetworkBadgeProps> = ({
  network,
  size = 'md',
  selected = false,
  onClick,
  showName = true,
}) => {
  const net = (network || '').toLowerCase();

  const configs: Record<string, { name: string; bg: string; text: string; ring: string; logo: React.ReactNode }> = {
    mtn: {
      name: 'MTN',
      bg: 'bg-amber-400 hover:bg-amber-300',
      text: 'text-black font-black',
      ring: 'ring-amber-500 shadow-amber-400/40',
      logo: (
        <span className="font-black tracking-tight text-black text-sm uppercase">
          MTN
        </span>
      ),
    },
    airtel: {
      name: 'Airtel',
      bg: 'bg-red-600 hover:bg-red-500',
      text: 'text-white font-black',
      ring: 'ring-red-500 shadow-red-500/40',
      logo: (
        <span className="font-black tracking-tight text-white text-xs lowercase">
          airtel
        </span>
      ),
    },
    glo: {
      name: 'Glo',
      bg: 'bg-emerald-600 hover:bg-emerald-500',
      text: 'text-white font-black',
      ring: 'ring-emerald-500 shadow-emerald-500/40',
      logo: (
        <span className="font-black tracking-tight text-white text-sm lowercase">
          glo
        </span>
      ),
    },
    '9mobile': {
      name: '9mobile',
      bg: 'bg-emerald-800 hover:bg-emerald-700',
      text: 'text-lime-300 font-black',
      ring: 'ring-emerald-600 shadow-emerald-700/40',
      logo: (
        <div className="flex items-center gap-0.5">
          <span className="text-lime-400 font-black text-sm">9</span>
          <span className="text-white text-[10px] font-bold">mobile</span>
        </div>
      ),
    },
  };

  const current = configs[net] || {
    name: network,
    bg: 'bg-purple-700',
    text: 'text-white',
    ring: 'ring-purple-500',
    logo: <span className="text-xs font-bold uppercase">{network}</span>,
  };

  const sizeClasses = {
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-14 h-14 rounded-2xl',
    lg: 'w-20 h-20 rounded-2xl',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group relative flex flex-col items-center justify-center transition-all duration-200 focus:outline-none ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
      }`}
    >
      <div
        className={`${sizeClasses[size]} ${current.bg} flex items-center justify-center shadow-md transition-all ${
          selected
            ? `ring-4 ${current.ring} shadow-lg scale-105`
            : 'hover:shadow-lg'
        }`}
      >
        {current.logo}
      </div>
      {showName && (
        <span className={`mt-1.5 text-xs font-bold ${selected ? 'text-purple-700 dark:text-purple-400 font-extrabold' : 'text-slate-600 dark:text-slate-300'}`}>
          {current.name}
        </span>
      )}
    </button>
  );
};
