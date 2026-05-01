'use client';

import { Vote } from 'lucide-react';
import CalendarView from '@/components/features/CalendarView';
import MatchStatus from '@/components/features/MatchStatus';
import Badge from '@/components/ui/Badge';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';

export default function ScheduleTab() {
  const { selectedDate } = useScheduleStore();
  const { userRole } = useAppStore();
  const { openModal } = useModalStore();
  const canManageSchedule = userRole === 'admin' || userRole === 'operator';

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {canManageSchedule ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => openModal('matchCreate')}
            className="rounded-lg bg-green-600 px-3 py-2.5 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
          >
            일정 생성
          </button>
          <button
            onClick={() => openModal('pollCreate')}
            className="rounded-lg bg-yellow-500 px-3 py-2.5 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
          >
            투표 만들기
          </button>
        </div>
      ) : null}

      <CalendarView />
      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
              <Vote size={18} />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-black text-gray-900">3월 친선 경기 일정 투표</h3>
                <Badge label="투표중" variant="yellow" pulse />
              </div>
              <p className="text-xs font-medium leading-relaxed text-gray-500">
                후보 3개 중 가능한 일정을 선택해주세요. 확정 후 일정으로 등록됩니다.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs font-bold text-gray-600">
          <button className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-left text-yellow-800">
            3월 21일 토 19:00 · 서울 용산 풋살장
          </button>
          <button className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left">
            3월 22일 일 10:00 · 광명 롯데몰 옥상경기장
          </button>
        </div>
      </section>
      {selectedDate === 7 && <MatchStatus status="종료" />}
      {selectedDate === 14 && <MatchStatus status="종료" />}
      {selectedDate === 15 && <MatchStatus status="라커룸" />}
      {selectedDate === 22 && <MatchStatus status="예정" type="training" />}
      {selectedDate === 28 && <MatchStatus status="예정" type="seminar" />}
    </div>
  );
}
