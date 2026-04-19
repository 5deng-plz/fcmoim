import Image from 'next/image';
import HexagonRadar from '@/components/features/HexagonRadar';
import Heatmap from '@/components/features/Heatmap';
import type { Position } from '@/types';
import { Target, Zap, Award } from 'lucide-react';

interface BadgeData {
  name: string;
  color: string; // 'amber' | 'sky' | 'emerald' | 'purple' | 'red'
}

interface MemberDetailProps {
  member: {
    name: string;
    ovr: number;
    photo: string;
    radar: number[];
    heatmap: Position;
    traits: string[];
    badges: BadgeData[];
  };
}

// ─── 배지 색상 매핑 ───
const badgeStyles: Record<string, { border: string; shadow: string; gradient: string; text: string; icon: typeof Target }> = {
  amber: {
    border: 'border-amber-400',
    shadow: 'shadow-[0_0_12px_rgba(251,191,36,0.25)]',
    gradient: 'from-amber-300 to-yellow-600',
    text: 'text-amber-400',
    icon: Target,
  },
  sky: {
    border: 'border-sky-400',
    shadow: 'shadow-[0_0_12px_rgba(56,189,248,0.25)]',
    gradient: 'from-sky-300 to-blue-600',
    text: 'text-sky-400',
    icon: Zap,
  },
  emerald: {
    border: 'border-emerald-400',
    shadow: 'shadow-[0_0_12px_rgba(52,211,153,0.25)]',
    gradient: 'from-emerald-300 to-green-600',
    text: 'text-emerald-400',
    icon: Award,
  },
  purple: {
    border: 'border-purple-400',
    shadow: 'shadow-[0_0_12px_rgba(168,85,247,0.25)]',
    gradient: 'from-purple-300 to-purple-600',
    text: 'text-purple-400',
    icon: Award,
  },
  red: {
    border: 'border-red-400',
    shadow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
    gradient: 'from-red-300 to-red-600',
    text: 'text-red-400',
    icon: Target,
  },
};

// ─── 특성카드 색상 (재미 요소) ───
const traitColorMap: Record<string, string> = {
  '유리멘탈': 'bg-red-500/15 text-red-400 border-red-500/30',
  '저질체력': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  '5연패': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  '철의 폐활량': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  '패스 마스터': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  '왼발만': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};
const defaultTraitColor = 'bg-slate-500/15 text-slate-400 border-slate-500/30';

export default function MemberDetail({ member: m }: MemberDetailProps) {
  return (
    <div className="p-4 sm:p-5 text-white animate-fadeIn">
      {/* ─── 상단: 프로필 카드 + 특성/뱃지 ─── */}
      <div className="flex gap-4 mb-5">
        <div className="w-24 h-32 bg-[#1e293b] rounded-lg overflow-hidden border-2 border-[#334155] relative shadow-lg shrink-0">
          <Image
            src={m.photo}
            alt={m.name}
            width={96}
            height={128}
            className="w-full h-full object-cover"
            unoptimized
          />
          <div className="absolute bottom-1 w-full flex flex-col items-center drop-shadow-lg">
            <span className="text-[7px] font-black text-green-400 uppercase leading-none tracking-tighter">OVR</span>
            <span className="text-sm font-black text-green-400 leading-none mt-0.5 italic">{m.ovr}</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-3">
          {/* 특성카드 (재미 요소) */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
              특성 카드
            </span>
            <div className="flex flex-wrap gap-1.5">
              {m.traits.map((trait, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 border rounded text-[10px] font-bold ${traitColorMap[trait] || defaultTraitColor}`}
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
          {/* 최근 업적 뱃지 상위 3개 */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
              최근 업적
            </span>
            <div className="flex gap-2">
              {m.badges.slice(0, 3).map((badge, idx) => {
                const style = badgeStyles[badge.color] || badgeStyles.amber;
                const IconComp = style.icon;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md bg-[#1e293b] border ${style.border} ${style.shadow}`}
                  >
                    <IconComp size={10} className={style.text} />
                    <span className={`text-[9px] font-black ${style.text}`}>
                      {badge.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 하단: 능력치 차트 + 히트맵 ─── */}
      <div className="flex items-center gap-4 bg-[#1e293b]/50 rounded-xl p-3 border border-[#334155]">
        <div className="flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 text-center">
            Abilities (OVR 산정)
          </span>
          <div className="w-full max-w-[140px] mx-auto">
            <HexagonRadar data={m.radar} />
          </div>
        </div>
        <div className="w-px h-28 bg-[#334155]"></div>
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
            Heatmap
          </span>
          <Heatmap type={m.heatmap} />
        </div>
      </div>
    </div>
  );
}
