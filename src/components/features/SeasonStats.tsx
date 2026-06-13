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
  { label: '무', value: '0', icon: 'minus-circle', color: 'text-result-draw' },
  { label: '패', value: '0', icon: 'x-circle', color: 'text-result-loss' },
  { label: '승률', value: '0%', icon: 'pie-chart', color: 'text-pos-df' },
];

export default function SeasonStats() {
  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <div className="inline-flex items-center gap-1.5 rounded-full header-badge-blue px-3 py-1 text-xs font-extrabold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full dot-blue opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 dot-blue"></span>
          </span>
          현재 시즌 기록
        </div>
      </div>
      <div className="rounded-3xl border border-glass-border bg-glass-bg p-5 shadow-glass-shadow backdrop-blur-md transition-colors">
        <div className="grid grid-cols-4 gap-y-5 gap-x-3 divide-x divide-glass-border">
          {seasonStats.map((stat, idx) => {
            const IconComp = iconMap[stat.icon];
            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-center px-1.5"
              >
                <div className="mb-2 flex items-center gap-1.5">
                  {IconComp && <IconComp size={15} className={stat.color} />}
                  <span className="text-[11px] font-bold text-secondary">
                    {stat.label}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-[28px] font-extrabold leading-none text-primary transition-colors">
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
