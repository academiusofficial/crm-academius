import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  id?: string;
  value: string | number;
  onChange: (value: any) => void;
  options: (SelectOption | string | { value: string | number; label: string })[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  direction?: 'down' | 'up' | 'auto';
  triggerStyle?: React.CSSProperties;
  dropdownStyle?: React.CSSProperties;
  selectedOptionColor?: string;
  selectedOptionBgColor?: string;
  unselectedOptionColor?: string;
}

export default function CustomSelect({
  id,
  value,
  onChange,
  options,
  className = '',
  placeholder = 'Pilih opsi...',
  disabled = false,
  direction = 'auto',
  triggerStyle,
  dropdownStyle,
  selectedOptionColor,
  selectedOptionBgColor,
  unselectedOptionColor
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<'down' | 'up'>('down');
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse options to consistent SelectOption structure
  const parsedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return {
      value: opt.value,
      label: opt.label,
      icon: (opt as any).icon
    };
  });

  const selectedOption = parsedOptions.find((opt) => opt.value === value) || parsedOptions.find((opt) => String(opt.value) === String(value));

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set dropdown position direction (upwards/downwards)
  useEffect(() => {
    if (!isOpen) return;
    if (direction === 'up') {
      setPlacement('up');
      return;
    }
    if (direction === 'down') {
      setPlacement('down');
      return;
    }
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If space below is less than 240px and there is more space above, drop up
      if (spaceBelow < 240 && rect.top > spaceBelow) {
        setPlacement('up');
      } else {
        setPlacement('down');
      }
    }
  }, [isOpen, direction]);

  // Handle keypresses when focused for better accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      const currentIndex = parsedOptions.findIndex((opt) => opt.value === value);
      const nextIndex = (currentIndex + 1) % parsedOptions.length;
      onChange(parsedOptions[nextIndex].value);
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      const currentIndex = parsedOptions.findIndex((opt) => opt.value === value);
      const prevIndex = (currentIndex - 1 + parsedOptions.length) % parsedOptions.length;
      onChange(parsedOptions[prevIndex].value);
    }
  };

  const isMentoringStageSelect = id === 'modal-mentoring-stage-select';
  const hasOuterBorder = className && className.includes('border');

  return (
    <div
      ref={containerRef}
      className={`relative ${className || 'w-full'}`}
      id={id}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        style={triggerStyle}
        className={`w-full flex items-center justify-between gap-2.5 text-xs py-1.5 px-2.5 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 font-medium text-left transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm cursor-pointer ${
          hasOuterBorder
            ? 'border-0'
            : isMentoringStageSelect
            ? 'border border-[#e2e8f0]'
            : 'border border-slate-200 dark:border-slate-700'
        } ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : ''
        } ${isOpen ? 'ring-1 ring-blue-500 border-blue-500 dark:border-blue-500' : ''}`}
      >
        <span className={`flex items-start gap-1.5 text-wrap text-left whitespace-normal break-words py-0.5 ${isMentoringStageSelect ? 'border-[#e2e8f0]' : ''}`}>
          {selectedOption?.icon}
          <span className="leading-relaxed" style={{ color: triggerStyle?.color || undefined }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-300 shrink-0 ${
            isOpen ? 'transform rotate-180 text-blue-500' : ''
          } ${triggerStyle?.color ? '' : 'text-slate-400 dark:text-slate-500'}`}
          style={{ color: triggerStyle?.color || undefined }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'up' ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === 'up' ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={dropdownStyle}
            className={`absolute z-50 w-full min-w-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto left-0 ${
              placement === 'up' ? 'bottom-full mb-1' : 'mt-1'
            }`}
          >
            <div className="p-1 space-y-0.5">
              {parsedOptions.map((option) => {
                const isSelected = String(option.value) === String(value);
                const itemColor = isSelected
                  ? (selectedOptionColor || undefined)
                  : (unselectedOptionColor || undefined);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start justify-between gap-2.5 text-xs px-2.5 py-1.5 rounded-md text-left transition-colors duration-150 cursor-pointer ${
                      isSelected
                        ? selectedOptionBgColor ? 'font-bold' : 'bg-blue-50/70 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-650 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    style={{
                      backgroundColor: isSelected && selectedOptionBgColor ? selectedOptionBgColor : undefined
                    }}
                  >
                    <span className="flex items-start gap-1.5 text-wrap text-left whitespace-normal break-words py-0.5">
                      {option.icon}
                      <span className="leading-relaxed" style={{ color: itemColor }}>
                        {option.label}
                      </span>
                    </span>
                    {isSelected && (
                      <Check
                        className="h-3 w-3 shrink-0"
                        style={{
                          color: selectedOptionColor || undefined,
                          marginTop: '6px',
                          marginRight: '3px',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
