import { Calendar, MapPin, Sun, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import AttendeeList from '@/components/features/AttendeeList';
import Badge from '@/components/ui/Badge';
import { useAppStore } from '@/stores/useAppStore';
import type { AttendanceStatus } from '@/types';

function AttendStatusBadge({ status }: { status: AttendanceStatus | 'none' }) {
  if (status === 'attend') {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-[11px] font-bold border border-green-100">
        <CheckCircle2 size={12} />
        참석
      </div>
    );
  }
  if (status === 'absent') {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-md text-[11px] font-bold border border-red-100">
        <XCircle size={12} />
        불참
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 rounded-md text-[11px] font-bold border border-gray-100">
      <HelpCircle size={12} />
      미정
    </div>
  );
}

export default function UpcomingMatch() {
  const { attendStatus } = useAppStore();

  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <h2 className="text-base font-black text-gray-900">다음 일정</h2>
      </div>

      <div className="card card-interactive p-5">
        <div className="flex justify-between items-center mb-4">
          <Badge label="Round 7" variant="green" />
        </div>
        <div className="space-y-2 text-sm text-gray-600 font-medium pb-2 border-b border-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Calendar size={15} className="text-gray-400" />
              <span className="min-w-0">3월 14일 (토) 오후 19:00</span>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
              <Sun size={13} className="text-orange-500" />
              15°C 맑음
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <MapPin size={15} className="text-gray-400" />
              <span className="min-w-0">서울 영등포 SKY파크</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <AttendeeList count={7} total={10} />
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400">나의 응답</span>
            <AttendStatusBadge status={attendStatus} />
          </div>
        </div>
      </div>
    </section>
  );
}
