let lockCount = 0;
let previousOverflow = '';
let previousTouchAction = '';

export function lockBodyScroll() {
  if (typeof document === 'undefined') return;

  lockCount += 1;
  if (lockCount !== 1) return;

  previousOverflow = document.body.style.overflow;
  previousTouchAction = document.body.style.touchAction;
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;

  lockCount -= 1;
  if (lockCount !== 0) return;

  document.body.style.overflow = previousOverflow;
  document.body.style.touchAction = previousTouchAction;
  previousOverflow = '';
  previousTouchAction = '';
}
