import React from 'react';

type Foot = 'left' | 'right' | 'both';

interface PreferredFootIconProps {
  preferredFoot?: Foot | string | null;
  className?: string;
}

export default function PreferredFootIcon({ preferredFoot, className = '' }: PreferredFootIconProps) {
  const foot = preferredFoot === 'left' || preferredFoot === '왼발' ? 'left' : 
               preferredFoot === 'right' || preferredFoot === '오른발' ? 'right' : 
               preferredFoot === 'both' || preferredFoot === '양발' ? 'both' : 'right';

  const isLeftActive = foot === 'left' || foot === 'both';
  const isRightActive = foot === 'right' || foot === 'both';

  const activeColor = 'var(--foot-active)';
  const inactiveColor = 'var(--foot-inactive)';
  const strokeColor = 'var(--foot-stroke)';

  return (
    <svg viewBox="0 0 160 200" className={className} style={{ height: '100%', width: 'auto' }}>
      {/* Left Foot */}
      <g transform="translate(5, 5)">
        <path
          d="M 55 10 C 35 10, 15 20, 10 40 C 5 60, 5 90, 15 130 C 20 160, 25 180, 40 185 C 55 190, 65 180, 65 155 C 65 130, 45 110, 45 85 C 45 60, 70 55, 70 35 C 70 15, 65 10, 55 10 Z"
          fill={isLeftActive ? activeColor : inactiveColor}
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinejoin="round"
        />
      </g>
      {/* Right Foot (Mirrored) */}
      <g transform="translate(155, 5) scale(-1, 1)">
        <path
          d="M 55 10 C 35 10, 15 20, 10 40 C 5 60, 5 90, 15 130 C 20 160, 25 180, 40 185 C 55 190, 65 180, 65 155 C 65 130, 45 110, 45 85 C 45 60, 70 55, 70 35 C 70 15, 65 10, 55 10 Z"
          fill={isRightActive ? activeColor : inactiveColor}
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
