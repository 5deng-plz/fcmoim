import React, { useId } from 'react';

type SoccerBootIconProps = {
  className?: string;
  fill?: string;
  style?: React.CSSProperties;
};

export const SoccerBootIcon = ({ className, fill = 'currentColor', style }: SoccerBootIconProps) => {
  const gradId = useId().replace(/:/g, '');
  const shadowId = useId().replace(/:/g, '');

  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <filter id={`premium-shadow-${shadowId}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="1" dy="3" stdDeviation="2" floodOpacity="0.4"/>
        </filter>
        <linearGradient id={`premium-grad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={fill} stopOpacity="0.85"/>
          <stop offset="100%" stopColor={fill} stopOpacity="1"/>
        </linearGradient>
      </defs>

      <g filter={`url(#premium-shadow-${shadowId})`}>
        {/* Cleats / Studs */}
        <path d="M 28 82 L 25 93 C 24 95 26 96 28 96 L 33 96 C 35 96 36 95 36 93 L 37 82 Z" fill="var(--icon-boot-stud)"/>
        <path d="M 48 83 L 45 93 C 44 95 46 96 48 96 L 53 96 C 55 96 56 95 56 93 L 57 83 Z" fill="var(--icon-boot-stud)"/>
        <path d="M 68 81 L 65 91 C 64 93 66 94 68 94 L 73 94 C 75 94 76 93 76 91 L 76 81 Z" fill="var(--icon-boot-stud)"/>
        <path d="M 85 77 L 85 88 C 85 90 87 91 89 91 L 93 91 C 95 91 96 90 95 88 L 92 74 Z" fill="var(--icon-boot-stud)"/>

        {/* Boot Main Body */}
        <path
          d="M 12 30 C 8 38 6 48 8 58 C 10 68 15 78 25 80 L 85 80 C 95 80 100 70 95 58 C 90 48 70 42 60 38 C 50 34 45 28 45 22 C 45 15 35 15 30 20 C 25 25 18 25 12 30 Z"
          fill={`url(#premium-grad-${gradId})`}
        />

        {/* Sock Collar */}
        <path
          d="M 12 30 C 18 25 25 25 30 20 C 35 15 45 15 45 22 C 45 28 40 38 35 42 C 30 46 20 42 12 30 Z"
          fill="var(--icon-boot-collar)"
          opacity="0.9"
        />

        {/* Modern Swoosh/Streak Design */}
        <path
          d="M 15 50 C 35 40 60 40 85 62 C 70 52 40 52 15 55 Z"
          fill="var(--icon-boot-mark)"
          opacity="0.8"
        />

        {/* Laces Area Highlight */}
        <path
          d="M 45 22 C 50 32 60 36 70 40 L 65 44 C 55 40 45 36 40 28 Z"
          fill="var(--icon-boot-lace)"
          opacity="0.4"
        />
      </g>
    </svg>
  );
};
