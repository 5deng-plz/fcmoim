import Image from 'next/image';
import type { SVGProps } from 'react';
import FcmoimLogo from './FcmoimLogo';

interface TeamEmblemProps extends SVGProps<SVGSVGElement> {
  teamName: string;
  logoUrl?: string | null;
  size?: number | string;
}

export default function TeamEmblem({ teamName, logoUrl, size = 40, className, ...props }: TeamEmblemProps) {
  const numericSize = typeof size === 'number' ? size : Number.parseInt(size, 10) || 40;
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${teamName} emblem`}
        width={numericSize}
        height={numericSize}
        className={className}
        unoptimized
      />
    );
  }

  if (teamName.toLowerCase().includes('guppy')) {
    return <GuppyEmblem size={size} className={className} {...props} />;
  }

  return <FcmoimLogo size={size} className={className} {...props} />;
}

function GuppyEmblem({ size, className, ...props }: Omit<TeamEmblemProps, 'teamName'>) {
  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      role="img"
      aria-label="FC Guppy emblem"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="fish-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffa3" />
          <stop offset="100%" stopColor="#005f3e" />
        </linearGradient>
        <linearGradient id="fish-ring" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#00ffa3" />
        </linearGradient>
      </defs>

      {/* Outer Futuristic Ring */}
      <circle cx="64" cy="64" r="58" stroke="url(#fish-ring)" strokeWidth="3" fill="#141624" />
      <circle cx="64" cy="64" r="52" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" fill="none" />
      
      {/* Cybernetic Fish (Guppy) Path */}
      {/* Body Curve */}
      <path 
        d="M 22 64 C 40 40 85 45 106 64 C 85 83 40 88 22 64 Z" 
        fill="url(#fish-grad)" 
      />
      
      {/* Tail Fin (Glow/Geometric) */}
      <path 
        d="M 22 64 L 6 45 C 12 55 12 73 6 83 Z" 
        fill="#ffffff" 
        opacity="0.85"
      />
      <path 
        d="M 22 64 L 10 52 C 14 60 14 68 10 76 Z" 
        fill="#00ffa3" 
      />

      {/* Cybernetic Scales / Neon Ribs (Lines) */}
      <path 
        d="M 42 53 L 38 75 M 54 50 L 50 78 M 66 50 L 62 78 M 78 52 L 74 76" 
        stroke="#090a10" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        opacity="0.6" 
      />
      
      {/* Fish Eye (Neon Glow Point) */}
      <circle cx="92" cy="60" r="4.5" fill="#ffffff" />
      <circle cx="92" cy="60" r="2.5" fill="#090a10" />
      <circle cx="95" cy="58" r="1.5" fill="#00ffa3" />

      {/* Text label decoration inside the emblem */}
      <path d="M 38 98 Q 64 106 90 98" stroke="#00ffa3" strokeWidth="1.5" fill="none" opacity="0.4" />
      <text x="64" y="112" fill="#cbd5e1" fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="2">GUPPY</text>
    </svg>
  );
}
