'use client';

import { useEffect, useMemo, useState } from 'react';
import CalendarView from '@/components/features/CalendarView';
import { CalendarCheck2, CalendarX2, Clock3, MapPin, Vote } from 'lucide-react';
import { buildMatchCalendarEvents, buildPollCalendarEvents } from '@/components/features/calendarEventUtils';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';
import PullToRefresh from '@/components/ui/PullToRefresh';
import AttendeeList from '@/components/features/AttendeeList';
import type { SchedulePoll, SchedulePollOption } from '@/stores/schedulePollClient';

export default function ScheduleTab() {
  const {
    activePolls,
    activePollsStatus,
    upcomingMatches,
    upcomingMatchesStatus,
    loadActivePolls,
    loadUpcomingMatches,
    selectedDate,
    setSelectedDate,
  } = useScheduleStore();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const { userRole, activeClubId } = useAppStore();
  const { openModal } = useModalStore();
  const canManageSchedule = userRole === 'admin' || userRole === 'operator';
  const scheduleCalendarEvents = [
    ...buildMatchCalendarEvents(upcomingMatches),
    ...buildPollCalendarEvents(activePolls),
  ];
  const refreshSchedule = async () => {
    await Promise.allSettled([
      loadActivePolls(activeClubId),
      loadUpcomingMatches(activeClubId),
    ]);
  };
  const selectedIsoDate = toIsoDate(selectedDate, visibleMonth);
  const selectedPollOptions = useMemo(
    () => findPollOptionsByDate(activePolls, selectedIsoDate),
    [activePolls, selectedIsoDate],
  );
  const selectedMatches = useMemo(
    () => upcomingMatches.filter((match) => match.date.slice(0, 10) === selectedIsoDate),
    [selectedIsoDate, upcomingMatches],
  );

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
    <PullToRefresh onRefresh={refreshSchedule}>
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
                className="rounded-lg border border-feedback-warning-border bg-feedback-warning-bg px-3 py-2.5 text-xs font-bold text-feedback-warning transition-all hover:brightness-95 active:scale-95"
              >
                투표 만들기
              </button>
            </div>
          </section>
        ) : null}

        <CalendarView
          value={selectedDate}
          onChange={setSelectedDate}
          events={scheduleCalendarEvents}
          monthDate={visibleMonth}
          onMonthDateChange={(nextMonth) => {
            setVisibleMonth(nextMonth);
            setSelectedDate(1);
          }}
        />

        {selectedPollOptions.length > 0 ? (
          <section className="card overflow-hidden p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-gray-900">투표 현황</h3>
                <p className="mt-1 text-xs font-bold text-gray-500">{formatSelectedDate(selectedDate, visibleMonth)}</p>
              </div>
              <span className="rounded-full bg-award-mvp/15 px-3 py-1 text-[11px] font-black text-award-mvp">
                투표중
              </span>
            </div>
            <div className="space-y-3">
              {selectedPollOptions.map(({ poll, option }) => (
                <div key={`${poll.id}-${option.id}`} className="rounded-2xl border border-feedback-warning-border bg-feedback-warning-bg px-4 py-3">
                  <div className="mb-2 flex items-start gap-2">
                    <Vote size={17} className="mt-0.5 shrink-0 text-award-mvp" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900">{poll.title}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-bold text-gray-600">
                        <Clock3 size={13} />
                        {option.displayTime || poll.commonTime}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                        <MapPin size={13} />
                        <span className="truncate">{option.displayLocation || poll.location}</span>
                      </p>
                    </div>
                  </div>
                  <AttendeeList count={getOptionVoteCount(poll, option)} total={getOptionVoteTotal(poll, option)} />
                </div>
              ))}
            </div>
            {selectedMatches.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-fcgreen-700">
                  <CalendarCheck2 size={15} />
                  같은 날짜 확정 일정
                </p>
                <div className="space-y-1">
                  {selectedMatches.map((match) => (
                    <p key={match.id} className="truncate text-xs font-bold text-gray-700">
                      {match.title} · {match.location}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="card overflow-hidden p-5">
            <div className="rounded-2xl bg-feedback-success-bg px-4 py-5 text-center">
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center">
                <CalendarX2 size={56} className="text-fcgreen-600" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <p className="text-base font-black text-gray-900">텅</p>
              <p className="mt-1 text-xs font-medium text-gray-500">
                아직 휘슬이 울린 일정은 없어요
              </p>
            </div>
          </section>
        )}
      </div>
    </PullToRefresh>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toIsoDate(day: number, monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = String(monthDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function formatSelectedDate(day: number, monthDate: Date) {
  return `${monthDate.getMonth() + 1}월 ${day}일`;
}

function findPollOptionsByDate(polls: SchedulePoll[], date: string) {
  return polls.flatMap((poll) => (
    poll.options
      .filter((option) => option.optionDate === date)
      .map((option) => ({ poll, option }))
  ));
}

function getOptionVoteCount(poll: SchedulePoll, option: SchedulePollOption) {
  return poll.votes.filter((vote) => vote.optionId === option.id && vote.isAvailable).length;
}

function getOptionVoteTotal(poll: SchedulePoll, option: SchedulePollOption) {
  const uniqueVoters = new Set(poll.votes.map((vote) => vote.membershipId));
  return Math.max(uniqueVoters.size, getOptionVoteCount(poll, option), 1);
}
