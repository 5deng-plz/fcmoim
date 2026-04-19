'use client';

import { Megaphone, Pin } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';

export default function RecentNotice() {
  const { userRole } = useAppStore();
  const { openModal } = useModalStore();
  const isAdmin = userRole === 'admin' || userRole === 'operator';

  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <h2 className="text-base font-black text-gray-900">최근 공지</h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => openModal('announcementCreate')}
              className="text-xs font-bold text-green-600 hover:text-green-700 active:scale-95 transition-all"
            >
              작성하기
            </button>
          )}
          <button
            onClick={() => useAppStore.getState().setShowCommunity(true)}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 active:scale-95 transition-all"
          >
            더보기
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="card card-interactive p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0">
            <Megaphone size={18} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Pin size={12} className="text-red-500 shrink-0" />
              <p className="text-sm font-bold text-gray-900 truncate">
                25/26 새 시즌 OVR 초기화 안내
              </p>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              운영진 · 2시간 전
            </p>
          </div>
        </div>
        <div className="card card-interactive p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
            <Megaphone size={18} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              3월 회식 장소 투표 안내
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              운영진 · 1일 전
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
