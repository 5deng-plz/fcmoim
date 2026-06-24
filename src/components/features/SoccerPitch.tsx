'use client';

import type { ReactNode } from 'react';

type SoccerPitchProps = {
  children: ReactNode;
  className?: string;
  testId?: string;
};

export default function SoccerPitch({
  children,
  className = '',
  testId = 'tactics-field',
}: SoccerPitchProps) {
  return (
    <div
      className={`relative aspect-[5/2] max-h-[152px] touch-none select-none overflow-hidden rounded-3xl border border-[#00ffa3]/20 p-2 shadow-inner tactics-tension ring-1 ring-[#00ffa3]/10 bg-soccer-pitch ${className}`}
      data-testid={testId}
    >
      <SoccerPitchLines />
      {children}
    </div>
  );
}

function SoccerPitchLines() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-2 rounded-2xl border border-[#00ffa3]/25 shadow-[0_0_4px_rgba(0,255,163,0.1)]" />
      <div className="absolute left-1/2 top-2 h-[calc(100%-16px)] w-px -translate-x-1/2 bg-[#00ffa3]/25" />
      <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#00ffa3]/25 shadow-[0_0_4px_rgba(0,255,163,0.1)]" />
      <div className="absolute left-2 top-1/2 h-16 w-9 -translate-y-1/2 rounded-r-2xl border border-l-0 border-[#00ffa3]/25 shadow-[0_0_4px_rgba(0,255,163,0.1)]" />
      <div className="absolute right-2 top-1/2 h-16 w-9 -translate-y-1/2 rounded-l-2xl border border-r-0 border-[#00ffa3]/25 shadow-[0_0_4px_rgba(0,255,163,0.1)]" />
      <div className="absolute left-2 top-1/2 h-8 w-4 -translate-y-1/2 rounded-r-xl border border-l-0 border-[#00ffa3]/25 shadow-[0_0_4px_rgba(0,255,163,0.1)]" />
      <div className="absolute right-2 top-1/2 h-8 w-4 -translate-y-1/2 rounded-l-xl border border-r-0 border-[#00ffa3]/25 shadow-[0_0_4px_rgba(0,255,163,0.1)]" />
      <div className="absolute left-[calc(50%-2px)] top-[calc(50%-2px)] h-1 w-1 rounded-full bg-[#00ffa3]/55 shadow-[0_0_6px_rgba(0,255,163,0.8)]" />
    </div>
  );
}
