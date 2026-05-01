'use client';

import { Vote } from 'lucide-react';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useModalStore } from '@/stores/useModalStore';
import { useToastStore } from '@/stores/useToastStore';
import CalendarView from './CalendarView';

export default function PollCreateModal() {
  const { activeModal, closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const [title, setTitle] = useState('3월 친선 경기 일정 투표');
  const [selectedDates, setSelectedDates] = useState<number[]>([]);
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [memo, setMemo] = useState('');

  const isValid = title.trim() && selectedDates.length >= 2 && time && location.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    showToast('일정 투표가 생성되었어요!');
    closeModal();
    setTitle('3월 친선 경기 일정 투표');
    setSelectedDates([]);
    setTime('18:00');
    setLocation('');
    setMemo('');
  };

  return (
    <Modal
      title="투표 만들기"
      isOpen={activeModal === 'pollCreate'}
      onClose={closeModal}
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
                    <span>항목 {i + 1}: 3월 {d}일 {time} · {location || '장소 미정'}</span>
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

        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
            isValid
              ? 'bg-green-600 text-white hover:brightness-110 active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          투표 생성하기
        </button>
      </div>
    </Modal>
  );
}
