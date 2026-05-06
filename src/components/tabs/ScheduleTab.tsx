'use client';

import { useEffect } from 'react';
import CalendarView from '@/components/features/CalendarView';
import { buildMatchCalendarEvents, buildPollCalendarEvents } from '@/components/features/calendarEventUtils';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';

export default function ScheduleTab() {
  const {
    activePolls,
    activePollsStatus,
    upcomingMatches,
    upcomingMatchesStatus,
    loadActivePolls,
    loadUpcomingMatches,
  } = useScheduleStore();
  const { userRole, activeClubId } = useAppStore();
  const { openModal } = useModalStore();
  const canManageSchedule = userRole === 'admin' || userRole === 'operator';
  const scheduleCalendarEvents = [
    ...buildMatchCalendarEvents(upcomingMatches),
    ...buildPollCalendarEvents(activePolls),
  ];

  useEffect(() => {
    if (activePollsStatus !== 'idle') return;

    void loadActivePolls(activeClubId).catch(() => {
      // Home notice cards show the retry UI; the calendar simply omits remote markers.
    });
  }, [activeClubId, activePollsStatus, loadActivePolls]);

  useEffect(() => {
    if (upcomingMatchesStatus !== 'idle') return;

    void loadUpcomingMatches(activeClubId).catch(() => {
      // Home upcoming schedule shows details; the calendar simply omits remote markers.
    });
  }, [activeClubId, upcomingMatchesStatus, loadUpcomingMatches]);

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {canManageSchedule ? (
        <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900">일정 운영</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => openModal('matchCreate')}
              className="rounded-lg bg-green-600 px-3 py-2.5 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
            >
              일정 만들기
            </button>
            <button
              onClick={() => openModal('pollCreate')}
              className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2.5 text-xs font-bold text-yellow-800 transition-all hover:bg-yellow-100 active:scale-95"
            >
              투표 만들기
            </button>
          </div>
        </section>
      ) : null}

      <CalendarView events={scheduleCalendarEvents} />

      <section className="card overflow-hidden p-5">
        <div className="rounded-2xl bg-[linear-gradient(180deg,#fbfffc_0%,#f7faf8_100%)] px-4 py-5 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center">
            <EmptyDayIllustration />
          </div>
          <p className="text-base font-black text-gray-900">텅</p>
          <p className="mt-1 text-xs font-medium text-gray-500">
            아직 휘슬이 울린 일정은 없어요
          </p>
        </div>
      </section>
    </div>
  );
}

function EmptyDayIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="10" y="14" width="60" height="52" rx="16" fill="#F0FDF4" />
      <rect x="22" y="24" width="36" height="28" rx="10" fill="#DCFCE7" />
      <path d="M30 52h20" stroke="#86EFAC" strokeWidth="3" strokeLinecap="round" />
      <circle cx="27" cy="29" r="2.5" fill="#FBBF24" />
      <path d="M26 14v8M54 14v8" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
      <text x="40" y="44" textAnchor="middle" fontSize="16" fontWeight="900" fill="#166534">
        텅
      </text>
    </svg>
  );
}
