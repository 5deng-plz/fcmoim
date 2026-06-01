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
          d="M 55 42 C 45 42, 28 45, 20 60 C 14 75, 12 95, 20 135 C 25 155, 30 175, 42 178 C 52 180, 58 172, 58 152 C 58 132, 44 118, 44 98 C 44 78, 62 70, 62 55 C 62 45, 58 42, 55 42 Z"
          fill={isLeftActive ? activeColor : inactiveColor}
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <circle cx="55" cy="22" r="10" fill={isLeftActive ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth="5" />
        <circle cx="39" cy="20" r="7.5" fill={isLeftActive ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth="5" />
        <circle cx="26" cy="25" r="6" fill={isLeftActive ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth="5" />
        <circle cx="16" cy="35" r="5" fill={isLeftActive ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth="5" />
        <circle cx="10" cy="48" r="4.2" fill={isLeftActive ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth="5" />
      </g>
      {/* Right Foot (Mirrored) */}
      <g transform="translate(155, 5) scale(-1, 1)">
        <path
          d="M 55 42 C 45 42, 28 45, 20 60 C 14 75, 12 95, 20 135 C 25 155, 30 175, 42 178 C 52 180, 58 172, 58 152 C 58 132, 44 118, 44 98 C 44 78, 62 70, 62 55 C 62 45, 58 42, 55 42 Z"
          fill={isRightActive ? activeColor : inactiveColor}
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <circle cx="55" cy="22" r="10" fill={isRightActive ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth="5" />
        <circle cx="39" cy="20" r="7.5" fill={isRightActive ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth="5" />
        <circle cx="26" cy="25" r="6" fill={isRightActive ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth="5" />
        <circle cx="16" cy="35" r="5" fill={isRightActive ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth="5" />
        <circle cx="10" cy="48" r="4.2" fill={isRightActive ? activeColor : inactiveColor} stroke={strokeColor} strokeWidth="5" />
      </g>
    </svg>
  );
}
