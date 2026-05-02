import { CalendarClock } from 'lucide-react';

export default function UpcomingMatch() {
  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <h2 className="text-base font-black text-gray-900">다음 일정</h2>
      </div>

      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <CalendarClock size={21} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-900">확정된 다음 일정이 없어요</p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-gray-400">
              운영진이 일정을 확정하면 날짜, 장소, 참석 현황이 이곳에 표시됩니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
