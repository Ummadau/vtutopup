import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  white?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showTagline = true,
  white = false,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-12 h-12 text-xl',
    xl: 'w-16 h-16 text-2xl',
  };

  const titleSizes = {
    sm: 'text-base font-extrabold tracking-tight',
    md: 'text-lg font-black tracking-tight',
    lg: 'text-2xl font-black tracking-tight',
    xl: 'text-3xl font-black tracking-tight',
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Stylized N Logo Icon with Broadcast / Signal Waves */}
      <div
        className={`${iconSizes[size]} relative rounded-xl flex items-center justify-center font-black shadow-md transition-transform duration-300 hover:scale-105 shrink-0 ${
          white
            ? 'bg-white text-purple-900 shadow-purple-950/20'
            : 'bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-900 text-white shadow-purple-600/30 ring-1 ring-purple-500/20'
        }`}
      >
        <svg
          viewBox="0 0 40 40"
          className="w-full h-full p-1.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stylized curved N */}
          <path
            d="M9 31V9C9 9 17 21 21 26C24 30 31 31 31 23V9"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Signal / wifi curves in top corner */}
          <path
            d="M26 6C28 7.5 29.5 9.5 30 12"
            stroke={white ? '#7e22ce' : '#38bdf8'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M23 8C24.5 9 25.5 10.5 26 12"
            stroke={white ? '#a855f7' : '#93c5fd'}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Small digital pulse dot */}
          <circle cx="31" cy="9" r="2" fill={white ? '#7e22ce' : '#22c55e'} />
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <div className={`flex items-center gap-0.5 ${titleSizes[size]} ${white ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          <span className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-300">
            N
          </span>
          <span className={white ? 'text-purple-200' : 'text-purple-900 dark:text-purple-300'}>Pay</span>
        </div>
        {showTagline && (
          <span className={`${taglineSizes[size]} font-medium tracking-wide mt-0.5 ${white ? 'text-purple-200/80' : 'text-purple-600 dark:text-purple-400'}`}>
            Fast, Affordable & Reliable
          </span>
        )}
      </div>
    </div>
  );
};
