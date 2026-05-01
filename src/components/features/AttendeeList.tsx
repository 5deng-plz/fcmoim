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
  return (
    <div className="flex items-center gap-2 mt-3 w-full">
      <div className="flex -space-x-3 flex-shrink-0">
        {seeds.slice(0, count).map((seed, i) => (
          <Image
            key={i}
            src={getFallbackAvatar(seed)}
            alt="참석자"
            width={28}
            height={28}
            className="rounded-full border-[1.5px] border-white bg-gray-200 relative"
            style={{ zIndex: 14 - i }}
            unoptimized
          />
        ))}
      </div>
      <span className="text-xs font-bold text-gray-500 whitespace-nowrap ml-1 flex-shrink-0">
        {count}/{total}명 참석
      </span>
    </div>
  );
}
