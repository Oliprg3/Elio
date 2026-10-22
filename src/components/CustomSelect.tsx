import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CustomSelectOption<T extends string | number = string | number> {
  value: T;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
  description?: string;
}

interface CustomSelectProps<T extends string | number = string | number> {
  id?: string;
  options: CustomSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle';
}

export function CustomSelect<T extends string | number = string | number>({
  id,
  options,
  value,
  onChange,
  label,
  placeholder = 'Select option...',
  icon,
  className = '',
  size = 'md',
  variant = 'default',
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for TV remote and desktop
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        const currentIndex = options.findIndex((opt) => opt.value === value);
        setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
      } else if (focusedIndex >= 0 && focusedIndex < options.length) {
        onChange(options[focusedIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(0);
      } else {
        setFocusedIndex((prev) => (prev + 1) % options.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(options.length - 1);
      } else {
        setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
      }
    }
  };

  // Scroll focused item into view inside dropdown
  useEffect(() => {
    if (isOpen && listRef.current && focusedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[data-select-option]');
      const targetItem = items[focusedIndex] as HTMLElement;
      if (targetItem) {
        targetItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-3.5 py-2 text-xs font-semibold rounded-xl gap-2',
    lg: 'px-4 py-2.5 text-sm font-semibold rounded-2xl gap-2.5',
  };

  const variantClasses = {
    default: 'bg-zinc-900/90 border-white/10 text-white hover:border-white/25',
    emerald: 'bg-zinc-900/90 border-white/10 text-white hover:border-white/25 focus:border-white/30',
    subtle: 'bg-zinc-800/80 border-white/5 text-zinc-200 hover:border-white/15',
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {label && <span className="block text-[11px] font-bold text-zinc-400 mb-1 uppercase tracking-wider">{label}</span>}

      {/* Select Trigger Button */}
      <button
        type="button"
        id={id}
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`flex items-center justify-between w-full border cursor-pointer select-none transition-all shadow-sm focus:outline-none ${sizeClasses[size]} ${variantClasses[variant]} ${
          isOpen ? 'ring-1 ring-white/25 border-white/30' : ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-zinc-400 shrink-0">{icon}</span>}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-white/[0.08] text-zinc-300 border border-white/10">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 z-50 min-w-[160px] max-h-60 overflow-y-auto rounded-2xl bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-xl p-1.5 custom-scrollbar"
            style={{ top: '100%' }}
            ref={listRef}
            role="listbox"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isKeyboardFocused = idx === focusedIndex;

              return (
                <div
                  key={String(opt.value)}
                  data-select-option
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl cursor-pointer transition-colors select-none ${
                    isSelected
                      ? 'bg-white/[0.1] text-white font-semibold'
                      : isKeyboardFocused
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon && <span className="text-zinc-400">{opt.icon}</span>}
                    <div className="truncate flex flex-col">
                      <span className="truncate">{opt.label}</span>
                      {opt.description && <span className="text-[10px] text-zinc-400 font-normal">{opt.description}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {opt.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-white/[0.08] text-zinc-300 border border-white/10">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
