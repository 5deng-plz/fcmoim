'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CalendarClock, Clock3, CloudSun, MapPin, Wind, Tent, Beer, Guitar } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { getSchedulePollErrorMessage } from '@/stores/schedulePollClient';
import { useToastStore } from '@/stores/useToastStore';
import Badge from '@/components/ui/Badge';
import type { EventType } from '@/types';

export default function UpcomingMatch() {
  const { activeClubId } = useAppStore();
  const { showToast } = useToastStore();
  const {
    upcomingMatches,
    upcomingMatchesStatus,
    upcomingMatchesError,
    loadUpcomingMatches,
  } = useScheduleStore();
  const [nowMs] = useState(() => Date.now());
  const nextMatch = upcomingMatches.find((match) => (
    match.status !== 'cancelled' && new Date(match.date).getTime() >= nowMs
  )) ?? null;
  const shimmerClassName = nextMatch ? getEventShimmerClassName(nextMatch.type) : '';

  useEffect(() => {
    if (upcomingMatchesStatus !== 'idle') return;

    void loadUpcomingMatches(activeClubId).catch((error) => {
      showToast(getSchedulePollErrorMessage(error, '확정 일정을 불러오지 못했어요.'));
    });
  }, [activeClubId, loadUpcomingMatches, showToast, upcomingMatchesStatus]);

  const dDayText = nextMatch ? getDDay(nextMatch.date) : '';

  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <div className="inline-flex items-center gap-1.5 rounded-full header-badge-green px-3 py-1 text-xs font-extrabold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full dot-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 dot-green"></span>
          </span>
          다음 일정
        </div>
      </div>

      {upcomingMatchesStatus === 'loading' ? (
        <div role="status" className="rounded-3xl border border-glass-border bg-glass-bg p-5 text-sm font-bold text-secondary shadow-glass-shadow backdrop-blur-md transition-colors">
          확정 일정을 불러오는 중입니다
        </div>
      ) : null}

      {upcomingMatchesStatus === 'error' && upcomingMatchesError ? (
        <div role="alert" className="rounded-3xl border border-feedback-error-border bg-feedback-error-bg p-5 shadow-glass-shadow backdrop-blur-md transition-colors">
          <p className="text-sm font-bold text-feedback-error">{upcomingMatchesError}</p>
        </div>
      ) : null}

      {upcomingMatchesStatus !== 'loading' && nextMatch ? (
        <div className="relative overflow-hidden rounded-3xl border border-[#25283e] bg-[#141624]/85 px-5 py-4.5 shadow-lg shadow-black/40 transition-colors">
          
          {/* D-Day Badge */}
          {dDayText && nextMatch.status !== 'cancelled' && (
            <div className="absolute right-0 top-0 rounded-bl-2xl bg-gradient-to-r from-[#00ffa3] to-[#00b872] px-3.5 py-1.5 text-[9px] font-black tracking-wide text-black shadow-sm uppercase">
              {dDayText}
            </div>
          )}

          <div className="flex items-center gap-3.5 min-h-[92px]">
            {/* Football/Icon Emblem Wrapper */}
            <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#00ffa3]/60 bg-black/60 shadow-[0_0_12px_rgba(0,255,163,0.15)] ${shimmerClassName}`}>
              {/* "LIVE" pulse badge inside emblem */}
              {nextMatch.status !== 'cancelled' && (
                <span className="absolute -top-1.5 -left-1.5 flex h-4 items-center justify-center rounded bg-red-600 px-1 text-[8px] font-black text-white gap-0.5 shadow-[0_0_6px_rgba(239,68,68,0.5)] z-20 scale-90">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              )}
              {nextMatch.type === 'match' ? (
                <Image
                  src="/icons/svgrepo-football.svg"
                  alt=""
                  width={48}
                  height={48}
                  className="h-10 w-10 object-contain animate-counter-spin"
                  unoptimized
                />
              ) : (
                <span className="text-gray-400 animate-counter-spin">
                  {nextMatch.type === 'training' ? (
                    <Tent size={26} strokeWidth={2} />
                  ) : nextMatch.type === 'seminar' ? (
                    <Beer size={26} strokeWidth={2} />
                  ) : (
                    <Guitar size={26} strokeWidth={2} />
                  )}
                </span>
              )}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <p className="text-base font-black leading-tight text-white truncate max-w-[130px]">{stripDatePrefix(nextMatch.title)}</p>
                {nextMatch.status === 'cancelled' ? (
                  <Badge label="취소" variant="gray" className="border border-border bg-surface-hover text-secondary" />
                ) : (
                  <Badge label="예정" variant="green" />
                )}
              </div>
              <div className="mt-2 space-y-1.5 text-xs font-bold text-gray-400">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Clock3 size={14} className="shrink-0 text-gray-500" aria-hidden="true" />
                  <span className="truncate text-xs font-extrabold leading-tight text-[#00ffa3]">{formatMatchDate(nextMatch.date)}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <MapPin size={14} className="shrink-0 text-gray-500" aria-hidden="true" />
                  <span className="truncate text-gray-400">{nextMatch.location}</span>
                </span>
              </div>
            </div>

            {/* Compact Forecast (Clean gaming style card) */}
            <div className="shrink-0 pl-1">
              <MatchForecastPanel location={nextMatch.location} />
            </div>
          </div>

          {/* Cancellation Info */}
          {nextMatch.status === 'cancelled' ? (
            <div className="mt-3.5 rounded-xl border border-border bg-surface-bg/80 px-4 py-3 text-[11px] font-bold leading-normal text-secondary">
              ❌ 취소 사유: {nextMatch.cancellationReason}
            </div>
          ) : null}
        </div>
      ) : null}

      {upcomingMatchesStatus === 'ready' && !nextMatch ? (
        <div className="rounded-3xl border border-glass-border bg-glass-bg p-5 shadow-glass-shadow backdrop-blur-md transition-colors">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-bg text-tertiary">
              <CalendarClock size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">확정된 다음 일정이 없어요</p>
              <p className="mt-1 text-xs font-medium text-secondary">
                다음 경기 소식이 등록되면 바로 알려드릴게요.
              </p>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}

function MatchForecastPanel({ location }: { location: string }) {
  const href = buildNaverWeatherHref(location);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col gap-1.5 rounded-lg bg-black/40 border border-[#25283e] p-2 text-right transition-all hover:bg-black/75 active:scale-95 shadow-md"
      aria-label={`경기일 예보: ${location} 네이버 날씨`}
    >
      <div className="flex items-center justify-end gap-1.5">
        <CloudSun size={13} className="text-[#ffb800] shrink-0 drop-shadow-[0_0_4px_rgba(255,184,0,0.4)]" />
        <span className="text-[10px] font-black text-white leading-none">CLEAR / 24°C</span>
      </div>
      <div className="flex items-center justify-end gap-1">
        <Wind size={11} className="text-[#00ffa3] shrink-0" />
        <span className="text-[9px] font-black text-gray-400 leading-none tracking-wider uppercase">
          PM10 GOOD
        </span>
      </div>
    </a>
  );
}

function buildNaverWeatherHref(location: string) {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(`${location} 날씨`)}`;
}

function stripDatePrefix(title: string | null | undefined): string {
  if (!title) return '';
  return title.replace(/^\d{2,4}[-./]\d{1,2}([-./]\d{1,2})?\s*/, '').trim();
}

function getDDay(dateStr: string) {
  const matchTime = new Date(dateStr).setHours(0, 0, 0, 0);
  const nowTime = new Date().setHours(0, 0, 0, 0);
  const diff = Math.floor((matchTime - nowTime) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return '';
}

function formatMatchDate(value: string) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${getPart('month')}월 ${getPart('day')}일 ${getPart('weekday')} ${getPart('hour')}:${getPart('minute')}`;
}

function getEventShimmerClassName(type: EventType) {
  if (type === 'match') return 'event-match-shimmer-icon-bg';
  if (type === 'training') return 'event-training-shimmer-icon-bg';
  if (type === 'seminar') return 'event-seminar-shimmer-icon-bg';
  return 'event-etc-shimmer-icon-bg';
}
