'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CalendarClock, Clock3, CloudSun, MapPin, Wind, Tent, Beer, Guitar } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { getSchedulePollErrorMessage } from '@/stores/schedulePollClient';
import { useToastStore } from '@/stores/useToastStore';
import Badge from '@/components/ui/Badge';

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
        <div role="status" className="card p-5 text-sm font-bold text-secondary">
          확정 일정을 불러오는 중입니다
        </div>
      ) : null}

      {upcomingMatchesStatus === 'error' && upcomingMatchesError ? (
        <div role="alert" className="card border-feedback-error-border bg-feedback-error-bg p-5">
          <p className="text-sm font-bold text-feedback-error">{upcomingMatchesError}</p>
        </div>
      ) : null}

      {upcomingMatchesStatus !== 'loading' && nextMatch ? (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-card px-5 py-4.5 shadow-md shadow-gray-200/10">
          {/* Ticket Left Punch Hole */}
          <div className="absolute -left-3.5 top-[52px] h-7 w-7 rounded-full bg-surface-bg border border-border/60 shadow-inner z-10" />
          {/* Ticket Right Punch Hole */}
          <div className="absolute -right-3.5 top-[52px] h-7 w-7 rounded-full bg-surface-bg border border-border/60 shadow-inner z-10" />

          {/* D-Day Badge */}
          {dDayText && nextMatch.status !== 'cancelled' && (
            <div className="absolute right-0 top-0 rounded-bl-2xl bg-fcgreen-600 px-4 py-1.5 text-[10px] font-black tracking-wider text-white shadow-sm ring-1 ring-white/10 uppercase">
              {dDayText}
            </div>
          )}

          <div className="flex items-center gap-3.5 min-h-[92px]">
            {/* Football/Icon Emblem Wrapper */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl blue-shimmer-icon-bg ring-1 ring-blue-team-border/60">
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
                <span className="text-gray-800 animate-counter-spin">
                  {nextMatch.type === 'training' ? (
                    <Tent size={28} strokeWidth={2} />
                  ) : nextMatch.type === 'seminar' ? (
                    <Beer size={28} strokeWidth={2} />
                  ) : (
                    <Guitar size={28} strokeWidth={2} />
                  )}
                </span>
              )}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <p className="text-base font-black leading-tight text-primary truncate max-w-[130px]">{stripDatePrefix(nextMatch.title)}</p>
                {nextMatch.status === 'cancelled' ? (
                  <Badge label="취소" variant="gray" className="border border-border bg-surface-hover text-secondary" />
                ) : (
                  <Badge label="예정" variant="green" />
                )}
              </div>
              <div className="mt-2 space-y-1.5 text-xs font-bold text-secondary">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Clock3 size={14} className="shrink-0 text-secondary" aria-hidden="true" />
                  <span className="truncate text-sm font-extrabold leading-tight text-secondary">{formatMatchDate(nextMatch.date)}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <MapPin size={14} className="shrink-0 text-secondary" aria-hidden="true" />
                  <span className="truncate text-secondary">{nextMatch.location}</span>
                </span>
              </div>
            </div>

            {/* Vertical Ticket Dashed Separator */}
            <div className="h-14 border-r border-dashed border-border/80 self-center mx-1 shrink-0" />

            {/* Compact Forecast */}
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
        <div className="card p-5">
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
      className="flex flex-col gap-2 rounded-xl py-0.5 text-right transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      aria-label={`경기일 예보: ${location} 네이버 날씨`}
    >
      <div className="flex items-center justify-end gap-1.5">
        <span className="sr-only">날씨</span>
        <CloudSun size={14} className="text-weather-clear shrink-0" />
        <span className="text-xs font-black text-primary leading-none">맑음 24°</span>
      </div>
      <div className="flex items-center justify-end gap-1">
        <span className="sr-only">미세먼지</span>
        <Wind size={13} className="text-fcgreen-600 shrink-0" />
        <span className="text-[10px] font-extrabold text-secondary leading-none">
          <span className="sr-only">보통</span>
          먼지 보통
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
