'use client';

import { RefreshCw } from 'lucide-react';
import { useRef, useState, type ReactNode, type TouchEvent } from 'react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
}

const TRIGGER_DISTANCE = 72;

export default function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const startYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (isRefreshing || window.scrollY > 0) return;
    startYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (startYRef.current === null || isRefreshing || window.scrollY > 0) return;

    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    const distance = Math.max(0, currentY - startYRef.current);
    setPullDistance(Math.min(distance, 96));
  };

  const handleTouchEnd = async () => {
    const shouldRefresh = pullDistance >= TRIGGER_DISTANCE;
    startYRef.current = null;

    if (!shouldRefresh) {
      setPullDistance(0);
      return;
    }

    setIsRefreshing(true);
    setPullDistance(48);

    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => void handleTouchEnd()}
      className="relative"
      style={{ transform: pullDistance ? `translateY(${pullDistance / 3}px)` : undefined }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-gray-500 shadow-sm transition-opacity"
        style={{ opacity: pullDistance > 12 || isRefreshing ? 1 : 0 }}
      >
        <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-green-600' : 'text-gray-400'} />
        {isRefreshing ? '새로고침 중' : '놓으면 새로고침'}
      </div>
      {children}
    </div>
  );
}
