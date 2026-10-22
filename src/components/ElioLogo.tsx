import React from 'react';

interface ElioLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}

export const ElioLogo: React.FC<ElioLogoProps> = ({
  size = 'md',
  className = '',
  showIcon = true,
  showText = false,
}) => {
  const config = {
    sm: {
      iconSize: 'w-6 h-6',
      text: 'text-base',
      plus: 'text-xs',
      gap: 'gap-2',
    },
    md: {
      iconSize: 'w-7 h-7 sm:w-8 sm:h-8',
      text: 'text-xl sm:text-2xl',
      plus: 'text-sm',
      gap: 'gap-2.5',
    },
    lg: {
      iconSize: 'w-9 h-9 sm:w-10 sm:h-10',
      text: 'text-2xl sm:text-3xl',
      plus: 'text-base',
      gap: 'gap-3',
    },
    xl: {
      iconSize: 'w-11 h-11 sm:w-12 sm:h-12',
      text: 'text-3xl sm:text-4xl',
      plus: 'text-lg',
      gap: 'gap-3.5',
    },
  }[size];

  return (
    <div
      className={`inline-flex items-center ${config.gap} select-none group cursor-pointer ${className}`}
      aria-label="Home"
    >
      {showIcon && (
        <svg
          viewBox="0 0 24 24"
          className={`${config.iconSize} fill-white transition-transform duration-200 group-hover:scale-105 shrink-0`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pure Minimalist Cinema Play Glyph without any background box */}
          <path d="M6.5 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 6.5 4.5z" />
        </svg>
      )}

      {showText && (
        <div className="flex items-baseline tracking-tight">
          <span
            className={`${config.text} font-black tracking-[-0.04em] text-white transition-colors duration-200 group-hover:text-zinc-200`}
            style={{
              fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
            }}
          >
            elio
          </span>
          <span
            className={`${config.plus} font-light text-zinc-400 ml-0.5 transition-colors duration-200 group-hover:text-white`}
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            +
          </span>
        </div>
      )}
    </div>
  );
};
