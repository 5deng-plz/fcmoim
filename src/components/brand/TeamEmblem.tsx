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

function GuppyEmblem({ size, ...props }: Omit<TeamEmblemProps, 'teamName'>) {
  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      role="img"
      aria-label="FC Guppy emblem"
      {...props}
    >
      <image href="/icons/svgrepo-fish.svg" width="128" height="128" />
    </svg>
  );
}
