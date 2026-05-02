import type { CSSProperties } from 'react';

interface FcMoimMarkProps {
  className?: string;
  size?: number;
  title?: string;
}

export default function FcMoimMark({
  className,
  size = 32,
  title = 'FC Moim',
}: FcMoimMarkProps) {
  const style = {
    width: size,
    height: size,
  } satisfies CSSProperties;

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
      role={title ? 'img' : undefined}
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fcmoim-shield" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E" />
          <stop offset="1" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="fcmoim-pitch" x1="20" y1="18" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0FDF4" />
          <stop offset="1" stopColor="#DCFCE7" />
        </linearGradient>
      </defs>

      <path
        d="M32 5L53 13V29C53 43.7 43.7 54.8 32 59C20.3 54.8 11 43.7 11 29V13L32 5Z"
        fill="url(#fcmoim-shield)"
      />
      <path
        d="M32 11L47 17V29C47 40.1 40.3 48.7 32 52C23.7 48.7 17 40.1 17 29V17L32 11Z"
        fill="url(#fcmoim-pitch)"
      />
      <path d="M32 17V46" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M21 31.5H43" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="32" cy="31.5" r="6" stroke="#16A34A" strokeWidth="2.2" />
      <path
        d="M32 23.5L35.8 26.2L34.3 30.7H29.7L28.2 26.2L32 23.5Z"
        fill="#111827"
      />
      <path
        d="M29.7 30.7L27.2 35L30.5 37.5L34 35.6L34.3 30.7"
        fill="#111827"
      />
      <path
        d="M34.3 30.7L36.8 35L33.5 37.5L30 35.6L29.7 30.7"
        fill="#111827"
      />
      <path
        d="M26.2 26.2L22.5 25.1L20.5 28.5L23.3 31.8L27.2 30.7"
        fill="#111827"
      />
      <path
        d="M37.8 26.2L41.5 25.1L43.5 28.5L40.7 31.8L36.8 30.7"
        fill="#111827"
      />
      <path
        d="M27.2 35L26.5 39.2L32 41.8L37.5 39.2L36.8 35"
        fill="#111827"
      />
    </svg>
  );
}
