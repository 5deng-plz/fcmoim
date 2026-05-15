import { Cake, Gauge, MapPin, Ruler, Package, Footprints } from 'lucide-react';
import HexagonRadar from '@/components/ui/HexagonRadar';
import type { UserStats } from '@/types';

type FootSide = 'left' | 'right' | 'both';

interface PlayerAbilityPanelProps {
  stats: UserStats;
  ovr?: number | null;
  preferredFoot?: string | null;
  birthDate?: string | Date | null;
  residence?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  className?: string;
  layout?: 'full' | 'stats-only';
}

const STAT_KEYS: Array<keyof UserStats> = [
  'speed',
  'shooting',
  'passing',
  'defense',
  'physical',
  'dribble',
];

const MAX_STAT = 99;

function clampStat(value: number | undefined) {
  return Math.max(0, Math.min(MAX_STAT, Number.isFinite(value) ? Number(value) : 0));
}

export function calculateOvr(stats: UserStats) {
  const sum = STAT_KEYS.reduce((total, key) => total + clampStat(stats[key]), 0);
  return Math.round(sum / STAT_KEYS.length);
}

function normalizeFoot(preferredFoot?: string | null): FootSide {
  const value = preferredFoot?.trim().toLowerCase();

  if (value === '왼발' || value === 'left' || value === 'l') {
    return 'left';
  }

  if (value === '양발' || value === 'both' || value === 'two-footed') {
    return 'both';
  }

  return 'right';
}

function formatDate(value?: string | Date | null) {
  if (!value) return '미입력';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function formatMeasure(value: number | null | undefined, suffix: string) {
  return value ? `${value}${suffix}` : '미입력';
}

import PreferredFootIcon from '@/components/ui/PreferredFootIcon';

function PreferredFootImage({ preferredFoot }: { preferredFoot?: string | null }) {
  return (
    <div
      aria-label={`주발 ${preferredFoot ?? '오른발'}`}
      className="mt-2 flex h-7 items-center justify-center"
      role="img"
    >
      <PreferredFootIcon preferredFoot={preferredFoot} />
    </div>
  );
}

export default function PlayerAbilityPanel({
  stats,
  ovr: ovrProp,
  preferredFoot,
  birthDate,
  residence,
  heightCm,
  weightKg,
  className = '',
  layout = 'full',
}: PlayerAbilityPanelProps) {
  const ovr = typeof ovrProp === 'number' && Number.isFinite(ovrProp)
    ? Math.round(ovrProp)
    : calculateOvr(stats);
  const profileItems = [
    { label: '키', value: formatMeasure(heightCm, 'cm'), icon: Ruler, color: 'text-pos-df' },
    { label: '몸무게', value: formatMeasure(weightKg, 'kg'), icon: Gauge, color: 'text-stamina-mid' },
    { label: '생년월일', value: formatDate(birthDate), icon: Cake, color: 'text-pos-fw' },
    { label: '거주지', value: residence?.trim() || '미입력', icon: MapPin, color: 'text-pos-mf' },
  ];

  return (
    <section
      className={
        layout === 'full'
          ? `rounded-2xl border border-green-100 bg-green-50/60 p-3 shadow-sm shadow-gray-200/60 ${className}`
          : `p-3 ${className}`
      }
      data-testid="player-ability-panel"
    >
      {layout === 'full' ? (
        <div className="grid grid-cols-2 items-center">
          <div className="flex flex-col items-center justify-center py-2">
            <span className="rounded bg-fcgreen-700 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-white">
              OVR
            </span>
            <strong className="mt-1 text-4xl font-black leading-none text-fcgreen-700">{ovr}</strong>
            <PreferredFootImage preferredFoot={preferredFoot} />
          </div>

          <div className="flex flex-col items-center justify-center">
            <HexagonRadar data={stats} className="w-full max-w-[180px]" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center pt-2 pb-4">
          <HexagonRadar data={stats} className="w-full max-w-[190px]" />
        </div>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2">
        {profileItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="flex flex-col items-center justify-center rounded-xl bg-white px-1 py-2 shadow-sm"
            >
              <Icon size={16} className={item.color} />
              <p className="mt-1.5 w-full truncate text-center text-[10px] font-bold text-gray-500">
                {item.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((slot) => (
          <div
            key={slot}
            aria-label={`뱃지 슬롯 ${slot}`}
            data-testid="player-badge-slot"
            className="flex h-14 items-center justify-center rounded-xl border border-dashed border-gray-200/80 bg-gray-50 shadow-none"
          >
            <Package size={20} className="text-gray-300/70" aria-hidden="true" />
          </div>
        ))}
      </div>
    </section>
  );
}
