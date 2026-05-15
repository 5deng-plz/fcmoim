import type { SVGProps } from 'react';
import FcmoimLogo from './FcmoimLogo';

interface TeamEmblemProps extends SVGProps<SVGSVGElement> {
  teamName: string;
  size?: number | string;
}

export default function TeamEmblem({ teamName, size = 40, ...props }: TeamEmblemProps) {
  if (teamName.toLowerCase().includes('guppy')) {
    return <GuppyEmblem size={size} {...props} />;
  }

  return <FcmoimLogo size={size} {...props} />;
}

function GuppyEmblem({ size, ...props }: Omit<TeamEmblemProps, 'teamName'>) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="FC Guppy emblem"
      {...props}
    >
      <circle cx="60" cy="60" r="52" fill="var(--color-blue-team-bg)" stroke="var(--color-blue-team)" strokeWidth="6" />
      <path
        d="M33 72c-10-4-16-13-14-25 2-13 12-23 25-24 8-1 16 3 21 9 5-7 13-10 22-7 10 4 15 14 13 24-2 11-10 19-20 22"
        fill="var(--match-upcoming)"
        opacity="0.92"
      />
      <path
        d="M42 67c-8 8-19 6-23-3M84 66c8 8 19 6 23-3"
        fill="none"
        stroke="var(--color-blue-team)"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <path
        d="M47 58c0-10 5-17 14-17s15 7 15 17v22c0 9-6 16-15 16s-14-7-14-16V58Z"
        fill="var(--color-blue-team)"
      />
      <path
        d="M54 79c5 6 11 6 17 0M61 58v24"
        fill="none"
        stroke="var(--surface-card)"
        strokeLinecap="round"
        strokeWidth="4"
        opacity="0.72"
      />
      <circle cx="50" cy="48" r="3.5" fill="var(--surface-card)" />
      <circle cx="72" cy="48" r="3.5" fill="var(--surface-card)" />
      <path
        d="M45 27c-6 0-11 5-13 12M78 28c7-1 13 4 15 11"
        fill="none"
        stroke="var(--surface-card)"
        strokeLinecap="round"
        strokeWidth="4"
        opacity="0.85"
      />
    </svg>
  );
}
