'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import CalendarView from './CalendarView';
import { buildMatchCalendarEvents, buildPollCalendarEvents } from './calendarEventUtils';
import { useModalStore } from '@/stores/useModalStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { getSchedulePollErrorMessage } from '@/stores/schedulePollClient';
import { useAppStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useToastStore';
import type { UpcomingMatch } from '@/stores/matchClient';

const eventTypes = [
  { key: 'match', label: '경기', emoji: '⚽' },
  { key: 'training', label: '전지훈련', emoji: '🏕' },
  { key: 'seminar', label: '정신교육', emoji: '🍻' },
  { key: 'etc', label: '기타', emoji: '🎸' },
] as const;

const DEFAULT_LOCATION = '서울 영등포 SKY풋살파크';
type MatchCreateType = (typeof eventTypes)[number]['key'];

function collapseDuplicateMatchEvents(matches: UpcomingMatch[]) {
  const seenMatchDates = new Set<string>();
  const result: UpcomingMatch[] = [];

  for (const match of [...matches].sort((left, right) => left.date.localeCompare(right.date))) {
    if (match.type !== 'match') {
      result.push(match);
      continue;
    }

    const dateKey = match.date.slice(0, 10);
    if (seenMatchDates.has(dateKey)) continue;

    seenMatchDates.add(dateKey);
    result.push(match);
  }

  return result;
}

export default function MatchCreateModal() {
  const { activeModal, closeModal } = useModalStore();
  const activeClubId = useAppStore((state) => state.activeClubId);
  const { showToast } = useToastStore();
  const activePolls = useScheduleStore((state) => state.activePolls);
  const activePollsStatus = useScheduleStore((state) => state.activePollsStatus);
  const upcomingMatches = useScheduleStore((state) => state.upcomingMatches);
  const calendarMatches = useScheduleStore((state) => state.calendarMatches);
  const calendarMatchesStatus = useScheduleStore((state) => state.calendarMatchesStatus);
  const loadActivePolls = useScheduleStore((state) => state.loadActivePolls);
  const loadCalendarMatches = useScheduleStore((state) => state.loadCalendarMatches);
  const createUpcomingMatch = useScheduleStore((state) => state.createUpcomingMatch);
  const scheduleMatches = calendarMatches.length > 0 ? calendarMatches : upcomingMatches;
  const scheduleCalendarEvents = useMemo(() => [
    ...buildMatchCalendarEvents(collapseDuplicateMatchEvents(scheduleMatches)),
    ...buildPollCalendarEvents(activePolls),
  ], [activePolls, scheduleMatches]);
  const [type, setType] = useState<MatchCreateType>('match');
  const [title, setTitle] = useState('');
  const [dateNum, setDateNum] = useState<number>(new Date().getDate());
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const matchTitlePlaceholder = type === 'match'
    ? `Round ${getNextMatchRound(scheduleMatches)}`
    : '예: 3월 회식';

  const isValid = Boolean((type === 'match' || title.trim()) && dateNum && time && location.trim());

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await createUpcomingMatch({
        clubId: activeClubId,
        type,
        title: title.trim() || null,
        date: toIsoDate(monthDate, dateNum),
        time,
        location: location.trim(),
        memo: memo.trim() || null,
      });
      showToast('일정을 생성했어요.');
      closeModal();
      resetForm();
    } catch (error) {
      setFormError(getSchedulePollErrorMessage(error, '일정을 생성하지 못했어요.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setType('match');
    setTitle('');
    setDateNum(new Date().getDate());
    setMonthDate(startOfMonth(new Date()));
    setTime('18:00');
    setLocation(DEFAULT_LOCATION);
    setMemo('');
    setFormError(null);
  };

  const handleClose = () => {
    closeModal();
    resetForm();
  };

  useEffect(() => {
    if (activeModal !== 'matchCreate' || activePollsStatus !== 'idle') return;

    void loadActivePolls(activeClubId).catch(() => undefined);
  }, [activeClubId, activeModal, activePollsStatus, loadActivePolls]);

  useEffect(() => {
    if (activeModal !== 'matchCreate' || calendarMatchesStatus !== 'idle') return;

    void loadCalendarMatches({ clubId: activeClubId, ...getMonthRange(monthDate) }).catch(() => undefined);
  }, [activeClubId, activeModal, calendarMatchesStatus, loadCalendarMatches, monthDate]);

  return (
    <Modal
      title="일정 생성"
      isOpen={activeModal === 'matchCreate'}
      onClose={handleClose}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
            일정 유형
          </label>
          <div className="grid grid-cols-4 gap-2">
            {eventTypes.map((eventType) => (
              <button
                type="button"
                key={eventType.key}
                onClick={() => setType(eventType.key)}
                className={`rounded-2xl py-3 text-center text-xs font-bold transition-all duration-150 ${
                  type === eventType.key
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="mb-1 block text-2xl">{eventType.emoji}</span>
                {eventType.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-gray-500">날짜 선택</label>
          <div className="-mx-5 sm:mx-0">
            <CalendarView
              value={dateNum}
              onChange={setDateNum}
              events={scheduleCalendarEvents}
              monthDate={monthDate}
              onMonthDateChange={(nextMonth) => {
                setMonthDate(nextMonth);
                void loadCalendarMatches({ clubId: activeClubId, ...getMonthRange(nextMonth) }).catch(() => undefined);
              }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="match-create-title" className="mb-1 block text-xs font-bold text-gray-500">타이틀</label>
          <input
            id="match-create-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={matchTitlePlaceholder}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="match-create-time" className="mb-1 block text-xs font-bold text-gray-500">시간</label>
          <input
            id="match-create-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-gray-500">장소</label>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder={DEFAULT_LOCATION}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-gray-500">메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="추가 안내사항..."
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-500 focus:outline-none"
          />
        </div>

        <button
          onClick={() => void handleSubmit()}
          disabled={!isValid || isSubmitting}
          className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-150 ${
            isValid && !isSubmitting
              ? 'bg-green-600 text-white hover:brightness-110 active:scale-95'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          {isSubmitting ? '생성 중' : '일정 생성하기'}
        </button>
        {formError ? (
          <p role="alert" className="rounded-lg border border-feedback-error-border bg-feedback-error-bg px-3 py-2 text-xs font-bold text-feedback-error">
            {formError}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthRange(monthDate: Date) {
  const from = startOfMonth(monthDate);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);

  return {
    from: toIsoDate(from, from.getDate()),
    to: toIsoDate(to, to.getDate()),
  };
}

function toIsoDate(monthDate: Date, day: number) {
  const year = monthDate.getFullYear();
  const month = `${monthDate.getMonth() + 1}`.padStart(2, '0');
  const date = `${day}`.padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function getNextMatchRound(matches: UpcomingMatch[]) {
  const rounds = matches
    .filter((match) => match.type === 'match')
    .map((match) => match.round ?? parseRoundTitle(match.title))
    .filter((round): round is number => typeof round === 'number' && Number.isFinite(round));

  return (rounds.length > 0 ? Math.max(...rounds) : 0) + 1;
}

function parseRoundTitle(title: string) {
  const match = title.trim().match(/^Round\s+(\d+)$/i);
  return match ? Number(match[1]) : null;
}
