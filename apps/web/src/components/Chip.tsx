import type { ReactNode } from 'react';

export type ChipTone = 'blue' | 'red' | 'neutral' | 'good' | 'warn' | 'rope' | 'timer';

const TONES: Record<ChipTone, string> = {
  blue: 'bg-blueteam-100 text-blueteam-800 border-blueteam-200',
  red: 'bg-redteam-100 text-redteam-800 border-redteam-200',
  neutral: 'bg-paper-sunk text-ink-muted border-paper-line',
  good: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warn: 'bg-amber-100 text-amber-800 border-amber-200',
  rope: 'bg-rope-light/30 text-rope-dark border-rope-light',
  timer: 'bg-timer/25 text-amber-900 border-timer',
};

export type ChipProps = {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
};

/** The small pill used throughout the reference for status and labels. */
export function Chip({ tone = 'neutral', children, className = '' }: ChipProps) {
  return (
    <span className={`mtow-chip border px-2.5 py-1 text-[11px] ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
