import { useCallback, useEffect, useRef, useState } from 'react';

type SmartFocusOptions = {
  releaseDelayMs?: number;
  transitionLockMs?: number;
};

export function useSmartFocus({
  releaseDelayMs = 300,
  transitionLockMs = 120,
}: SmartFocusOptions = {}) {
  const [isDetailFocused, setIsDetailFocused] = useState(false);
  const releaseTimerRef = useRef<number | null>(null);
  const lockUntilRef = useRef(0);

  const clearReleaseTimer = useCallback(() => {
    if (releaseTimerRef.current === null) return;
    window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = null;
  }, []);

  const activateFocus = useCallback(() => {
    clearReleaseTimer();
    lockUntilRef.current = Date.now() + transitionLockMs;
    setIsDetailFocused(true);
  }, [clearReleaseTimer, transitionLockMs]);

  const releaseFocus = useCallback((force = false) => {
    const release = () => {
      releaseTimerRef.current = null;
      setIsDetailFocused(false);
    };

    clearReleaseTimer();
    if (!force && Date.now() < lockUntilRef.current) {
      releaseTimerRef.current = window.setTimeout(release, transitionLockMs);
      return;
    }

    release();
  }, [clearReleaseTimer, transitionLockMs]);

  const releaseFocusSoon = useCallback(() => {
    clearReleaseTimer();
    releaseTimerRef.current = window.setTimeout(() => {
      releaseTimerRef.current = null;
      setIsDetailFocused(false);
    }, releaseDelayMs);
  }, [clearReleaseTimer, releaseDelayMs]);

  useEffect(() => {
    if (!isDetailFocused) return;

    window.history.pushState({ smartFocus: true }, '', window.location.href);
    const handlePopState = () => {
      setIsDetailFocused(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDetailFocused]);

  useEffect(() => () => {
    clearReleaseTimer();
  }, [clearReleaseTimer]);

  return {
    isDetailFocused,
    activateFocus,
    releaseFocus,
    releaseFocusSoon,
  };
}
