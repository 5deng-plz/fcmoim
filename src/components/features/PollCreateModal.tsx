'use client';

import { Clock3, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { getSchedulePollErrorMessage } from '@/stores/schedulePollClient';
import { useToastStore } from '@/stores/useToastStore';
import CalendarView from './CalendarView';
import { buildPollCalendarEvents } from './calendarEventUtils';

const DEFAULT_LOCATION = '서울 영등포 SKY풋살파크';

export default function PollCreateModal() {
  const { activeModal, closeModal } = useModalStore();
  const { activeClubId } = useAppStore();
  const createPoll = useScheduleStore((state) => state.createPoll);
  const activePolls = useScheduleStore((state) => state.activePolls);
  const { showToast } = useToastStore();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [title, setTitle] = useState(() => createDefaultPollTitle(new Date()));
  const [selectedDates, setSelectedDates] = useState<number[]>([]);
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [memo, setMemo] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollCalendarEvents = useMemo(() => buildPollCalendarEvents(activePolls), [activePolls]);

  const isValid = Boolean(title.trim() && selectedDates.length >= 1 && time && location.trim());
  const canSubmit = isValid && !isSubmitting;

  const resetForm = () => {
    setTitle(createDefaultPollTitle(visibleMonth));
    setSelectedDates([]);
    setTime('18:00');
    setLocation(DEFAULT_LOCATION);
    setMemo('');
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createPoll({
        clubId: activeClubId,
        seasonId: null,
        title: title.trim(),
        commonTime: time,
        location: location.trim(),
        memo: memo.trim() || null,
        closesAt: null,
        optionDates: selectedDates
          .slice()
          .sort((left, right) => left - right)
          .map((day) => toIsoDate(day, visibleMonth)),
      });

      showToast('일정 투표가 생성되었어요!');
      closeModal();
      resetForm();
    } catch (error) {
      const message = getSchedulePollErrorMessage(error, '일정 투표를 생성하지 못했어요.');
      setSubmitError(message);
      showToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    closeModal();
    setSubmitError(null);
  };

  return (
    <Modal
      title="투표 만들기"
      isOpen={activeModal === 'pollCreate'}
      onClose={handleClose}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-500">투표 제목</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-500">후보 날짜 선택 (1~4개)</label>
            <span className="text-xs font-bold text-green-600">{selectedDates.length}/4 선택됨</span>
          </div>
          <div className="-mx-5 sm:mx-0">
            <CalendarView
              isMulti
              maxSelections={4}
              value={selectedDates}
              onChangeMulti={setSelectedDates}
              monthDate={visibleMonth}
              onMonthDateChange={(nextMonth) => {
                if (title === createDefaultPollTitle(visibleMonth)) {
                  setTitle(createDefaultPollTitle(nextMonth));
                }
                setVisibleMonth(nextMonth);
                setSelectedDates([]);
              }}
              events={pollCalendarEvents}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">시간</label>
            <input
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
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-gray-500">요약</label>
          <div className="space-y-2">
            {selectedDates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-center text-xs font-medium text-gray-400">
                캘린더에서 날짜를 선택해주세요
              </div>
            ) : (
              [...selectedDates].sort((a, b) => a - b).map((day, index) => (
                <div
                  key={day}
                  className="rounded-2xl border border-feedback-warning-border bg-feedback-warning-bg px-3 py-3 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-feedback-warning-border px-2 text-[11px] font-black text-feedback-warning">
                      {index + 1}
                    </span>
                    <p className="text-sm font-black text-gray-900">
                      {formatDateLabel(day, visibleMonth)}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs font-medium text-gray-600 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-2.5 py-2">
                      <Clock3 size={14} className="text-gray-400" />
                      {time}
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-2.5 py-2 sm:col-span-1">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="truncate">{location.trim() || DEFAULT_LOCATION}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-gray-500">투표 안내사항</label>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            rows={2}
            placeholder="이번주 수요일까지 부탁드립니다~"
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-500 focus:outline-none"
          />
        </div>

        {submitError ? (
          <p role="alert" className="rounded-lg border border-feedback-error-border bg-feedback-error-bg px-3 py-2 text-xs font-bold leading-relaxed text-feedback-error">
            {submitError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-150 ${
            canSubmit
              ? 'bg-green-600 text-white hover:brightness-110 active:scale-95'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          {isSubmitting ? '생성 중...' : '투표 생성하기'}
        </button>
      </div>
    </Modal>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function createDefaultPollTitle(date: Date) {
  return `${date.getMonth() + 1}월 일정 투표`;
}

function formatDateLabel(day: number, monthDate: Date) {
  return `${monthDate.getMonth() + 1}월 ${day}일`;
}

function toIsoDate(day: number, monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = String(monthDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}
