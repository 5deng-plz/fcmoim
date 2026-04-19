import {
  Trophy,
  MinusCircle,
  XCircle,
  PieChart,
  Target,
  Award,
  Star,
  Zap,
} from 'lucide-react';
import Trend from '@/components/ui/Trend';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  trophy: Trophy,
  'minus-circle': MinusCircle,
  'x-circle': XCircle,
  'pie-chart': PieChart,
  target: Target,
  award: Award,
  star: Star,
  zap: Zap,
};

const seasonStats = [
  { label: '승', value: '8', trend: 1, icon: 'trophy', color: 'text-yellow-500' },
  { label: '무', value: '2', trend: 0, icon: 'minus-circle', color: 'text-gray-400' },
  { label: '패', value: '3', trend: 0, icon: 'x-circle', color: 'text-red-400' },
  { label: '승률', value: '61%', trend: 3, icon: 'pie-chart', color: 'text-blue-500' },
  { label: '득점', value: '5', trend: 1, icon: 'target', color: 'text-green-500' },
  { label: '도움', value: '2', trend: -1, icon: 'award', color: 'text-purple-500' },
  { label: 'OVR', value: '72', trend: 0, icon: 'zap', color: 'text-emerald-500' },
];

export default function SeasonStats() {
  return (
    <section>
      <div className="flex items-end justify-between mb-3 ml-1 mr-1">
        <h2 className="text-sm font-bold text-gray-600 tracking-tight flex items-center gap-1.5">
          25/26 시즌 내 기록
        </h2>
        <span className="text-[10px] text-gray-400 font-bold tracking-tight">
          vs 직전 시즌 비교
        </span>
      </div>
      <div className="card p-4">
        <div className="grid grid-cols-4 gap-y-5 gap-x-2 divide-x divide-gray-50">
          {seasonStats.map((stat, idx) => {
            const IconComp = iconMap[stat.icon];
            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-center px-1"
              >
                <div className="flex items-center gap-1 mb-1">
                  {IconComp && <IconComp size={12} className={stat.color} />}
                  <span className="text-[10px] font-bold text-gray-500">
                    {stat.label}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-xl font-black text-gray-900">
                    {stat.value}
                  </span>
                </div>
                <div className="mt-1 h-3 flex items-center">
                  <Trend trend={stat.trend} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
