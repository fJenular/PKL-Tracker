'use client';

import React from 'react';

type TactileButtonSize = 'sm' | 'md' | 'lg';
type TactileButtonVariant = 'dark' | 'amber' | 'emerald' | 'rose';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: TactileButtonSize;
  variant?: TactileButtonVariant;
  children: React.ReactNode;
}

const sizeMap: Record<TactileButtonSize, string> = {
  sm: 'px-4 py-2 text-[12px] gap-1.5',
  md: 'px-5 py-2.5 text-[13px] gap-2',
  lg: 'px-6 py-3 text-[14px] gap-2.5',
};

const variantMap: Record<TactileButtonVariant, string> = {
  dark: [
    'bg-[#14151a] text-white border border-white/10',
    'shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_-2px_0_0_rgba(0,0,0,0.5)_inset,0_4px_12px_rgba(0,0,0,0.25)]',
    'hover:bg-[#1e1f26] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_-2px_0_0_rgba(0,0,0,0.5)_inset,0_6px_18px_rgba(0,0,0,0.3)] hover:-translate-y-px',
    'active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_0_0_0_rgba(0,0,0,0.4)_inset,0_2px_6px_rgba(0,0,0,0.2)]',
  ].join(' '),
  amber: [
    'bg-[#f97316] text-white border border-orange-400/30',
    'shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-2px_0_0_rgba(0,0,0,0.3)_inset,0_4px_14px_rgba(249,115,22,0.4)]',
    'hover:bg-[#ea6c0a] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-2px_0_0_rgba(0,0,0,0.3)_inset,0_6px_20px_rgba(249,115,22,0.5)] hover:-translate-y-px',
    'active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_0_0_0_rgba(0,0,0,0.3)_inset,0_2px_6px_rgba(249,115,22,0.3)]',
  ].join(' '),
  emerald: [
    'bg-[#10b981] text-white border border-emerald-400/30',
    'shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-2px_0_0_rgba(0,0,0,0.25)_inset,0_4px_14px_rgba(16,185,129,0.35)]',
    'hover:bg-[#059669] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-2px_0_0_rgba(0,0,0,0.25)_inset,0_6px_20px_rgba(16,185,129,0.45)] hover:-translate-y-px',
    'active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_0_0_0_rgba(0,0,0,0.25)_inset,0_2px_6px_rgba(16,185,129,0.25)]',
  ].join(' '),
  rose: [
    'bg-[#e11d48] text-white border border-rose-400/30',
    'shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-2px_0_0_rgba(0,0,0,0.3)_inset,0_4px_14px_rgba(225,29,72,0.4)]',
    'hover:bg-[#be123c] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_-2px_0_0_rgba(0,0,0,0.3)_inset,0_6px_20px_rgba(225,29,72,0.5)] hover:-translate-y-px',
    'active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_0_0_0_rgba(0,0,0,0.3)_inset,0_2px_6px_rgba(225,29,72,0.3)]',
  ].join(' '),
};

export function TactileButton({
  size = 'md',
  variant = 'dark',
  children,
  className = '',
  ...props
}: TactileButtonProps) {
  return (
    <button
      {...props}
      className={[
        // Base layout
        'inline-flex items-center justify-center font-semibold tracking-wide select-none',
        // Pill shape
        'rounded-full',
        // Variant (color + shadows)
        variantMap[variant],
        // Transition
        'transition-all duration-100 ease-out',
        // Disabled
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0',
        // Size
        sizeMap[size],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
