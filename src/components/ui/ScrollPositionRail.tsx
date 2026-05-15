'use client';

import { useEffect, useState, type RefObject } from 'react';

interface ScrollPositionRailProps {
  containerRef: RefObject<HTMLElement | null>;
}

export default function ScrollPositionRail({ containerRef }: ScrollPositionRailProps) {
  const [metrics, setMetrics] = useState({ visible: false, top: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const scrollable = container.scrollHeight - container.clientHeight;
      if (scrollable <= 4) {
        setMetrics({ visible: false, top: 0, height: 0 });
        return;
      }

      const railHeight = container.clientHeight - 48;
      const thumbHeight = Math.max(32, (container.clientHeight / container.scrollHeight) * railHeight);
      const top = 24 + (container.scrollTop / scrollable) * (railHeight - thumbHeight);
      setMetrics({ visible: true, top, height: thumbHeight });
    };

    update();
    container.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      container.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [containerRef]);

  if (!metrics.visible) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="scroll-position-rail"
      className="pointer-events-none absolute right-1.5 top-0 z-30 h-full w-1 rounded-full bg-gray-200/45"
    >
      <div
        className="absolute left-0 w-1 rounded-full bg-gray-400/80 shadow-sm transition-[top,height] duration-150"
        style={{ top: metrics.top, height: metrics.height }}
      />
    </div>
  );
}
