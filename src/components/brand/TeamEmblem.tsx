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
