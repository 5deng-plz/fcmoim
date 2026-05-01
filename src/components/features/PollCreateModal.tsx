'use client';

import { CalendarDays, MapPin, Plus, Vote } from 'lucide-react';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useModalStore } from '@/stores/useModalStore';
import { useToastStore } from '@/stores/useToastStore';

type PollOption = {
  date: string;
  time: string;
  location: string;
};

const emptyOption = (): PollOption => ({
  date: '',
  time: '',
  location: '',
});

export default function PollCreateModal() {
  const { activeModal, closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const [title, setTitle] = useState('3월 친선 경기 일정 투표');
  const [options, setOptions] = useState<PollOption[]>([emptyOption(), emptyOption()]);
  const [memo, setMemo] = useState('');

  const completeOptions = options.filter((option) => option.date && option.time && option.location.trim());
  const isValid = title.trim() && completeOptions.length >= 2;

  const updateOption = (index: number, patch: Partial<PollOption>) => {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    );
  };

  const addOption = () => {
    setOptions((current) => [...current, emptyOption()]);
  };

  const handleSubmit = () => {
    if (!isValid) return;
    showToast('일정 투표가 생성되었어요!');
    closeModal();
    setTitle('3월 친선 경기 일정 투표');
    setOptions([emptyOption(), emptyOption()]);
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 block">후보 일정</label>
            <button
              onClick={addOption}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-200"
            >
              <Plus size={13} />
              후보 추가
            </button>
          </div>

          {options.map((option, index) => (
            <div key={index} className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
              <div className="text-xs font-black text-gray-700">후보 {index + 1}</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="relative">
                  <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={option.date}
                    onChange={(event) => updateOption(index, { date: event.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-2 text-xs focus:border-green-500 focus:outline-none"
                  />
                </label>
                <input
                  type="time"
                  value={option.time}
                  onChange={(event) => updateOption(index, { time: event.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs focus:border-green-500 focus:outline-none"
                />
              </div>
              <label className="relative block">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={option.location}
                  onChange={(event) => updateOption(index, { location: event.target.value })}
                  placeholder="장소"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-2 text-xs focus:border-green-500 focus:outline-none"
                />
              </label>
            </div>
          ))}
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
