'use client';

import type { MouseEvent } from 'react';
import { ExternalLink, Map, MapPin } from 'lucide-react';

type NaverMapLinkProps = {
  location: string;
  accentClassName: string;
  compact?: boolean;
};

export default function NaverMapLink({
  location,
  accentClassName,
  compact = false,
}: NaverMapLinkProps) {
  const href = buildNaverMapSearchUrl(location);
  const openMap = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={openMap}
        className="group relative flex h-12 w-24 shrink-0 items-center justify-between overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-surface-bg to-surface-hover/30 px-2.5 transition-all hover:from-surface-hover/80 hover:to-border/40 active:scale-[0.98]"
        aria-label={`${location} 네이버지도 열기`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[8px] font-black tracking-wider text-brand-primary">
            <span>NAVER</span>
            <ExternalLink size={8} aria-hidden="true" />
          </div>
          <p className="mt-0.5 truncate text-[10px] font-extrabold text-primary">지도</p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm transition-shadow group-hover:shadow-md ${accentClassName}`}>
          <MapPin size={15} aria-hidden="true" />
        </div>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={openMap}
      className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-surface-bg to-surface-hover/30 p-4 transition-all hover:from-surface-hover/80 hover:to-border/40 active:scale-[0.99]"
      aria-label={`${location} 네이버지도 열기`}
    >
      <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-tertiary/20 transition-transform duration-300 group-hover:scale-110">
        <Map size={80} strokeWidth={1} />
      </div>

      <div className="relative min-w-0 flex-1 pr-4">
        <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-brand-primary">
          <span>NAVER MAP</span>
          <ExternalLink size={10} aria-hidden="true" />
        </div>
        <p className="mt-1 truncate text-sm font-extrabold text-primary">{location}</p>
        <p className="mt-0.5 text-[11px] font-medium text-tertiary">지도로 위치 자세히 보기</p>
      </div>

      <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-shadow group-hover:shadow-md ${accentClassName}`}>
        <MapPin size={18} aria-hidden="true" />
      </div>
    </a>
  );
}

export function buildNaverMapSearchUrl(location: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(location.trim())}`;
}
