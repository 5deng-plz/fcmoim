'use client';

import { Vote } from 'lucide-react';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { appConfig } from '@/config/app.config';
import { useModalStore } from '@/stores/useModalStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { getSchedulePollErrorMessage } from '@/stores/schedulePollClient';
import { useToastStore } from '@/stores/useToastStore';
import CalendarView from './CalendarView';

export default function PollCreateModal() {
  const { activeModal, closeModal } = useModalStore();
  const createPoll = useScheduleStore((state) => state.createPoll);
  const { showToast } = useToastStore();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [title, setTitle] = useState(() => createDefaultPollTitle(new Date()));
  const [selectedDates, setSelectedDates] = useState<number[]>([]);
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [memo, setMemo] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = Boolean(title.trim() && selectedDates.length >= 2 && time && location.trim());
  const canSubmit = isValid && !isSubmitting;

  const resetForm = () => {
    setTitle(createDefaultPollTitle(visibleMonth));
    setSelectedDates([]);
    setTime('18:00');
    setLocation('');
    setMemo('');
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await createPoll({
        clubId: appConfig.defaultClubId,
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
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-yellow-800">
            <Vote size={15} />
            확정 일정이 아니라 후보 투표를 먼저 만듭니다
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">투표 제목</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-500 block">후보 날짜 선택 (2~4개)</label>
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
              hideLegend 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">일괄 적용 시간</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">장소</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="서울 용산 풋살장"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">선택된 항목 요약</label>
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 max-h-32 overflow-y-auto">
            {selectedDates.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">캘린더에서 날짜를 2개 이상 선택해주세요</p>
            ) : (
              <ul className="space-y-1.5">
                {[...selectedDates].sort((a, b) => a - b).map((d, i) => (
                  <li key={d} className="flex items-start gap-2 text-xs font-medium leading-snug text-gray-700">
                    <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                    <span>항목 {i + 1}: {formatDateLabel(d, visibleMonth)} {time} · {location || '장소 미정'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            rows={2}
            placeholder="투표 안내사항"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:border-green-500 focus:outline-none transition-colors"
          />
        </div>

        {submitError ? (
          <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-relaxed text-red-600">
            {submitError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
            canSubmit
              ? 'bg-green-600 text-white hover:brightness-110 active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
