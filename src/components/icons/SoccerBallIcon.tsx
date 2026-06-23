import React from 'react';

export const SoccerBallIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block align-text-bottom ${className || ''}`}
      style={{ width: '1.25em', height: '1.25em', ...style }}
      aria-hidden="true"
    >
      {/* Outer Ball Shape */}
      <circle cx="12" cy="12" r="10" className="opacity-80" />
      
      {/* Center Pentagon */}
      <polygon 
        points="12,9 14.5,10.8 13.5,13.8 10.5,13.8 9.5,10.8" 
        fill="currentColor" 
        fillOpacity="0.2" 
        stroke="currentColor" 
      />
      
      {/* Hexagon Seams (Inner Radiating Lines) */}
      <line x1="12" y1="9" x2="12" y2="2" />
      <line x1="14.5" y1="10.8" x2="21.1" y2="8.6" />
      <line x1="13.5" y1="13.8" x2="17.9" y2="21" />
      <line x1="10.5" y1="13.8" x2="6.1" y2="21" />
      <line x1="9.5" y1="10.8" x2="2.9" y2="8.6" />
      
      {/* Outer Seams */}
      <path d="M7.5 4.5 L12 2 L16.5 4.5 M21.1 8.6 L22 13.5 L17.9 21 M17.9 21 L12 22 L6.1 21 M6.1 21 L2 13.5 L2.9 8.6 M2.9 8.6 L7.5 4.5" className="opacity-50" />
    </svg>
  );
};
