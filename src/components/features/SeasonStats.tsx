import { Trophy, MinusCircle, XCircle, PieChart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  trophy: Trophy,
  'minus-circle': MinusCircle,
  'x-circle': XCircle,
  'pie-chart': PieChart,
};

const seasonStats = [
  { label: '승', value: '0', icon: 'trophy', color: 'text-result-win' },
  { label: '무', value: '0', icon: 'minus-circle', color: 'text-gray-400' },
  { label: '패', value: '0', icon: 'x-circle', color: 'text-result-loss' },
  { label: '승률', value: '0%', icon: 'pie-chart', color: 'text-pos-df' },
];

export default function SeasonStats() {
  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <h2 className="text-base font-extrabold text-gray-900">현재 시즌 기록</h2>
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
                <div className="flex items-center gap-1 mb-1.5">
                  {IconComp && <IconComp size={13} className={stat.color} />}
                  <span className="text-[11px] font-bold text-gray-500">
                    {stat.label}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-extrabold text-gray-900 transition-colors">
                    {stat.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
