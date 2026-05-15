import type { SVGProps } from 'react';

type AwardShoeRank = 1 | 2 | 3;

const rankStyles: Record<AwardShoeRank, { className: string; label: string }> = {
  1: { className: 'text-tier-gold', label: '금축구화' },
  2: { className: 'text-tier-silver', label: '은축구화' },
  3: { className: 'text-tier-bronze', label: '동축구화' },
};

interface AwardShoeIconProps extends Omit<SVGProps<SVGSVGElement>, 'rank'> {
  rank: AwardShoeRank;
  size?: number;
}

export default function AwardShoeIcon({ rank, size = 16, className = '', ...props }: AwardShoeIconProps) {
  const style = rankStyles[rank];

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label={style.label}
      className={`${style.className} ${className}`}
      {...props}
    >
      <path d="M5 19.4c3.1 1.5 6.5 2 10.2 1.4 3.9-.6 7.7.4 11.4 3 .8.6 1.2 1.4 1 2.3-.2.8-.9 1.3-1.9 1.3H7.4c-2.2 0-3.7-1.3-4.1-3.5l-.5-3.4c-.1-.8.7-1.4 1.4-1l.8.4Z" fill="currentColor" />
      <path d="M8 5.1h5.5c.8 0 1.3.4 1.5 1.1l2.6 8.1c.4 1.2 1.1 1.9 2.2 2.4l4.9 2.3c.7.3.8 1.4.2 1.8-3.2-1.4-6.5-1.9-9.9-1.4-3.5.5-6.7.1-9.5-1.2l-.4-2.3c-.1-.7.3-1.3.9-1.5l4-.9-3-6.8c-.4-.8.1-1.6 1-1.6Z" fill="currentColor" opacity="0.58" />
      <path
        d="M11.5 14.2h6.7M10.5 11.4h6.2M9.6 8.7h5.8M10 27.3v2M16 27.3v2M22 27.3v2"
        fill="none"
        stroke="var(--surface-card)"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
