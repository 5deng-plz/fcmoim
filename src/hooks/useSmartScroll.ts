'use client';

import { useEffect } from 'react';

/**
 * useSmartScroll
 * 
 * Event delegation hook to automatically and smoothly scroll focused inputs
 * (input, textarea, select) into the center of the viewport after the mobile keyboard displays.
 */
export function useSmartScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        // Wait slightly for the mobile virtual keyboard to overlay and resize the viewport
        setTimeout(() => {
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }, 250);
      }
    };

    container.addEventListener('focusin', handleFocusIn);

    return () => {
      container.removeEventListener('focusin', handleFocusIn);
    };
  }, [ref]);
}
