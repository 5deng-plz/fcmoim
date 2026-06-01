import React from 'react';

export const SoccerBallIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => {
  return (
    <span className={`inline-flex items-center justify-center leading-none ${className || ''}`} style={{ fontSize: '1.25em', ...style }} role="img" aria-label="soccer ball">
      ⚽️
    </span>
  );
};
