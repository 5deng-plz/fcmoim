import {
  Trophy,
  MinusCircle,
  XCircle,
  PieChart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  trophy: Trophy,
  'minus-circle': MinusCircle,
  'x-circle': XCircle,
  'pie-chart': PieChart,
};

// highlight: 'red' = 최근 승리로 승률 상승, 'blue' = 최근 패배로 승률 하락, null = 변동 없음
type HighlightColor = 'red' | 'blue' | null;
const currentHighlight: HighlightColor = 'red'; // 최근 경기 결과에 따라 동적 변경

const seasonStats = [
  { label: '승', value: '8', icon: 'trophy', color: 'text-yellow-500', highlightOn: 'red' as const },
  { label: '무', value: '2', icon: 'minus-circle', color: 'text-gray-400', highlightOn: null },
  { label: '패', value: '3', icon: 'x-circle', color: 'text-red-400', highlightOn: 'blue' as const },
  { label: '승률', value: '61%', icon: 'pie-chart', color: 'text-blue-500', highlightOn: 'both' as const },
];

function getValueColor(stat: typeof seasonStats[number], highlight: HighlightColor): string {
  if (!highlight) return 'text-gray-900';
  if (stat.highlightOn === 'both') {
    // 승률은 red/blue 모두 반응
    return highlight === 'red' ? 'text-red-500' : 'text-blue-500';
  }
  if (stat.highlightOn === highlight) {
    return highlight === 'red' ? 'text-red-500' : 'text-blue-500';
  }
  return 'text-gray-900';
}

export default function SeasonStats() {
  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <h2 className="text-base font-black text-gray-900">현재 시즌 기록</h2>
      </div>
      <div className="card p-4">
        <div className="grid grid-cols-4 gap-y-5 gap-x-2 divide-x divide-gray-50">
          {seasonStats.map((stat, idx) => {
            const IconComp = iconMap[stat.icon];
            const valueColor = getValueColor(stat, currentHighlight);
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
                  <span className={`text-2xl font-black ${valueColor} transition-colors`}>
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
