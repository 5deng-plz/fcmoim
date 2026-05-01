'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Megaphone, Pin, Vote } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';
import Badge from '@/components/ui/Badge';
import AttendeeList from '@/components/features/AttendeeList';

export default function RecentNotice() {
  const { userRole } = useAppStore();
  const { openModal } = useModalStore();
  const isAdmin = userRole === 'admin' || userRole === 'operator';
  
  const [isPollExpanded, setIsPollExpanded] = useState(false);
  const [selectedPolls, setSelectedPolls] = useState<number[]>([]);

  const handlePollSelect = (id: number) => {
    setSelectedPolls((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <h2 className="text-base font-black text-gray-900">공지사항</h2>
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
        <section className="card card-gold-shimmer overflow-hidden rounded-xl">
          <button
            type="button"
            onClick={() => setIsPollExpanded(!isPollExpanded)}
            aria-expanded={isPollExpanded}
            className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
                <Vote size={18} />
              </div>
              <div className="min-w-0">
                <div className="mb-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
                  <h3 className="min-w-0 text-sm font-black leading-snug text-gray-900">
                    3월 친선 경기 일정 투표
                  </h3>
                  <Badge label="투표중" variant="amber" className="shrink-0" />
                </div>
                <p className="text-xs font-medium leading-snug text-gray-500">
                  가능한 일정을 모두 선택해주세요
                </p>
              </div>
            </div>
            <div className="shrink-0 text-gray-400">
              {isPollExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {isPollExpanded && (
            <div className="p-4 pt-0 border-t border-gray-50 bg-gray-50/50">
              <div className="mt-3 grid gap-3">
                <label className={`block cursor-pointer rounded-xl border p-3 transition-all ${selectedPolls.includes(1) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${selectedPolls.includes(1) ? 'border-yellow-500 bg-yellow-500' : 'border-gray-300 bg-white'}`}>
                      {selectedPolls.includes(1) && <div className="h-2.5 w-2.5 rounded-sm bg-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 text-sm font-bold leading-snug text-gray-900">
                        3월 21일 토 19:00 · 서울 용산 풋살장
                      </div>
                      <AttendeeList count={5} total={12} />
                    </div>
                  </div>
                  <input type="checkbox" className="hidden" checked={selectedPolls.includes(1)} onChange={() => handlePollSelect(1)} />
                </label>

                <label className={`block cursor-pointer rounded-xl border p-3 transition-all ${selectedPolls.includes(2) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${selectedPolls.includes(2) ? 'border-yellow-500 bg-yellow-500' : 'border-gray-300 bg-white'}`}>
                      {selectedPolls.includes(2) && <div className="h-2.5 w-2.5 rounded-sm bg-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 text-sm font-bold leading-snug text-gray-900">
                        3월 22일 일 10:00 · 광명 롯데몰 옥상경기장
                      </div>
                      <AttendeeList count={3} total={12} />
                    </div>
                  </div>
                  <input type="checkbox" className="hidden" checked={selectedPolls.includes(2)} onChange={() => handlePollSelect(2)} />
                </label>
              </div>
              <div className="mt-4">
                <button type="button" className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-gray-800 active:scale-95">
                  투표 제출하기
                </button>
              </div>
            </div>
          )}
        </section>

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
