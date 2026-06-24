import Image from 'next/image';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';

interface AttendeeListProps {
  count: number;
  total: number;
}

const seeds = [
  'Son', 'Lee', 'Kim', 'Park', 'Choi', 'Hwang', 'Jung', 'Kang', 'Jo', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh'
];

export default function AttendeeList({ count, total }: AttendeeListProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const isHighSuccess = percentage >= 70;
  const glowClass = isHighSuccess 
    ? 'text-[#00ffa3] drop-shadow-[0_0_8px_rgba(0,255,163,0.6)] animate-pulse'
    : 'text-primary';

  return (
    <div className="mt-3.5 space-y-2.5 w-full">
      {/* Mission Text & Percentage */}
      <div className="flex justify-between items-center text-xs font-black select-none">
        <span className="text-gray-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ffa3] animate-ping" />
          참석 달성 미션
        </span>
        <span className={`transition-all duration-300 ${glowClass}`}>
          {percentage}% ({count}/{total}명)
        </span>
      </div>

      {/* Chzzk Mission Gauge Bar */}
      <div className="w-full h-2.5 rounded-full bg-black/60 border border-[#25283e] overflow-hidden relative">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-[#00ffa3] to-[#00b872] transition-all duration-700 ease-out shadow-[0_0_10px_rgba(0,255,163,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Attendee Avatars */}
      <div className="flex items-center gap-2 mt-1">
        <div className="flex -space-x-2.5 flex-shrink-0">
          {seeds.slice(0, count).map((seed, i) => (
            <Image
              key={i}
              src={getFallbackAvatar(seed)}
              alt="참석자"
              width={22}
              height={22}
              sizes="22px"
              className="rounded-full border border-[#141624] bg-surface-hover relative"
              style={{ width: 22, height: 22, zIndex: 14 - i }}
              unoptimized
            />
          ))}
        </div>
        <span className="text-[10px] font-bold text-gray-500">
          투표 참여 인원
        </span>
      </div>
    </div>
  );
}
