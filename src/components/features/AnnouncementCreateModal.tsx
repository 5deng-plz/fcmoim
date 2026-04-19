'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useModalStore } from '@/stores/useModalStore';
import { useToastStore } from '@/stores/useToastStore';

export default function AnnouncementCreateModal() {
  const { activeModal, closeModal } = useModalStore();
  const { showToast } = useToastStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const isValid = title.trim() && content.trim();

  const handleSubmit = () => {
    showToast('공지가 등록되었어요! 📢');
    closeModal();
    setTitle('');
    setContent('');
    setIsPinned(false);
  };

  return (
    <Modal
      title="공지 작성"
      isOpen={activeModal === 'announcementCreate'}
      onClose={closeModal}
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">
            제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목을 입력하세요"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-500 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">
            본문
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="공지 내용을 입력하세요..."
            rows={5}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:border-green-500 focus:outline-none transition-colors"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm font-bold text-gray-700">
            📌 상단 고정
          </span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
            isValid
              ? 'bg-green-600 text-white hover:brightness-110 active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          공지 등록하기
        </button>
      </div>
    </Modal>
  );
}
