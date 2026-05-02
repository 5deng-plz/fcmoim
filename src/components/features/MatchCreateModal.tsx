'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useModalStore } from '@/stores/useModalStore';
import { useToastStore } from '@/stores/useToastStore';

import CalendarView from './CalendarView';
import Badge from '@/components/ui/Badge';

const eventTypes = [
  { key: 'match', label: '경기', emoji: '⚽' },
  { key: 'training', label: '전지훈련', emoji: '🏕' },
  { key: 'seminar', label: '정신교육', emoji: '🍻' },
  { key: 'etc', label: '기타', emoji: '🎸' },
] as const;

export default function MatchCreateModal() {
  const { activeModal, closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const [type, setType] = useState<string>('match');
  const [title, setTitle] = useState('');
  const [dateNum, setDateNum] = useState<number>(new Date().getDate());
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [memo, setMemo] = useState('');

  const isValid = (type === 'match' || title.trim()) && dateNum && time && location;

  const handleSubmit = () => {
    showToast('확정 일정 생성 API 연결 후 저장할 수 있어요.');
    closeModal();
    setTitle('');
    setDateNum(new Date().getDate());
    setTime('18:00');
    setLocation('');
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
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
            일정 유형
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {eventTypes.map((et) => (
              <button
                type="button"
                key={et.key}
                onClick={() => setType(et.key)}
                className={`rounded-xl py-3 text-center text-xs font-bold transition-all duration-150 ${
                  type === et.key
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="block text-2xl mb-1">{et.emoji}</span>
                {et.label}
              </button>
            ))}
          </div>
        </div>

        {type === 'match' ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <Badge label="경기" variant="green" />
            <p className="text-xs font-bold text-green-700">
              확정 경기 일정
            </p>
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">
              타이틀
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 3월 회식"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-500 focus:outline-none transition-colors"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-gray-500 mb-2 block">
            날짜 선택
          </label>
          <div className="-mx-5 sm:mx-0">
            <CalendarView value={dateNum} onChange={setDateNum} hideLegend />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">
            시간
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">
            장소
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="서울 용산 풋살장"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">
            메모 (선택)
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="추가 안내사항..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:border-green-500 focus:outline-none transition-colors"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
            isValid
              ? 'bg-green-600 text-white hover:brightness-110 active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          일정 생성하기
        </button>
      </div>
    </Modal>
  );
}
