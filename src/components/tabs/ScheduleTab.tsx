'use client';

import { useEffect, useMemo } from 'react';
import CalendarView from '@/components/features/CalendarView';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';
import { CalendarX2 } from 'lucide-react';

export default function ScheduleTab() {
  const {
    selectedDate,
    activePolls,
    activePollsStatus,
    loadActivePolls,
  } = useScheduleStore();
  const { userRole } = useAppStore();
  const { openModal } = useModalStore();
  const canManageSchedule = userRole === 'admin' || userRole === 'operator';
  const pollCalendarEvents = useMemo(() => (
    activePolls.flatMap((poll) => (
      poll.options.flatMap((option) => {
        const day = Number(option.optionDate.split('-')[2]);

        if (!Number.isInteger(day) || day < 1 || day > 31) {
          return [];
        }

        return [{
          day,
          date: option.optionDate,
          type: 'poll' as const,
        }];
      })
    ))
  ), [activePolls]);

  useEffect(() => {
    if (activePollsStatus !== 'idle') return;

    void loadActivePolls().catch(() => {
      // Home notice cards show the retry UI; the calendar simply omits remote markers.
    });
  }, [activePollsStatus, loadActivePolls]);

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {canManageSchedule ? (
        <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900">일정 운영</h3>
              <p className="text-[11px] font-medium text-gray-400">
                확정 일정과 후보 투표를 여기서만 만듭니다
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => openModal('matchCreate')}
              className="rounded-lg bg-green-600 px-3 py-2.5 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
            >
              일정 만들기
            </button>
            <button
              onClick={() => openModal('pollCreate')}
              className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2.5 text-xs font-bold text-yellow-800 transition-all hover:bg-yellow-100 active:scale-95"
            >
              투표 만들기
            </button>
          </div>
        </section>
      ) : null}

      <CalendarView events={pollCalendarEvents} />

      <section className="card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
            <CalendarX2 size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-gray-900">
              선택한 날짜에 확정 일정이 없어요
            </h3>
            <p className="mt-1 text-xs font-medium leading-relaxed text-gray-400">
              {selectedDate}일 일정이 확정되면 상세 정보와 참석 현황이 표시됩니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
