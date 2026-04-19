import { Calendar, MapPin, Sun } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import AttendeeList from '@/components/features/AttendeeList';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';

export default function UpcomingMatch() {
  const { userRole } = useAppStore();
  const { openModal } = useModalStore();
  const isAdmin = userRole === 'admin' || userRole === 'operator';

  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <h2 className="text-base font-black text-gray-900">다음 일정</h2>
        {isAdmin && (
          <button
            onClick={() => openModal('matchCreate')}
            className="text-xs font-bold text-white bg-green-600 px-3 py-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all"
          >
            + 일정 생성
          </button>
        )}
      </div>

      <div className="card card-interactive p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Badge label="정규 리그" variant="green" />
            <span className="text-xs font-bold text-gray-500">Round 7</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
            <Sun size={14} className="text-orange-500" />
            15°C · 미세 보통
          </div>
        </div>
        <div className="space-y-2 text-sm text-gray-600 font-medium pb-2 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <span>3월 14일 (토) 오후 19:00</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-gray-400" />
            <span>서울 용산 풋살장</span>
          </div>
        </div>

        <AttendeeList count={7} total={10} />
      </div>
    </section>
  );
}
