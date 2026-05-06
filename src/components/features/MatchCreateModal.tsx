'use client';

import { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import CalendarView from './CalendarView';
import { buildPollCalendarEvents } from './calendarEventUtils';
import { useModalStore } from '@/stores/useModalStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useToastStore } from '@/stores/useToastStore';

const eventTypes = [
  { key: 'match', label: '경기', emoji: '⚽' },
  { key: 'training', label: '전지훈련', emoji: '🏕' },
  { key: 'seminar', label: '정신교육', emoji: '🍻' },
  { key: 'etc', label: '기타', emoji: '🎸' },
] as const;

const DEFAULT_LOCATION = '서울 영등포 SKY풋살파크';

export default function MatchCreateModal() {
  const { activeModal, closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const activePolls = useScheduleStore((state) => state.activePolls);
  const pollCalendarEvents = useMemo(() => buildPollCalendarEvents(activePolls), [activePolls]);
  const [type, setType] = useState<string>('match');
  const [title, setTitle] = useState('');
  const [dateNum, setDateNum] = useState<number>(new Date().getDate());
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [memo, setMemo] = useState('');

  const isValid = (type === 'match' || title.trim()) && dateNum && time && location.trim();

  const handleSubmit = () => {
    showToast('확정 일정 생성 API 연결 후 저장할 수 있어요.');
    closeModal();
    setTitle('');
    setDateNum(new Date().getDate());
    setTime('18:00');
    setLocation(DEFAULT_LOCATION);
    setMemo('');
  };

  return (
    <Modal
      title="일정 생성"
      isOpen={activeModal === 'matchCreate'}
      onClose={closeModal}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
            일정 유형
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

        {type === 'match' ? (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
            <Badge label="경기" variant="green" />
            <p className="text-xs font-bold text-green-700">확정 경기 일정</p>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">타이틀</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 3월 회식"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-bold text-gray-500">날짜 선택</label>
          <div className="-mx-5 sm:mx-0">
            <CalendarView value={dateNum} onChange={setDateNum} events={pollCalendarEvents} />
          </div>
        </div>

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
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-150 ${
            isValid
              ? 'bg-green-600 text-white hover:brightness-110 active:scale-95'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          일정 생성하기
        </button>
      </div>
    </Modal>
  );
}
