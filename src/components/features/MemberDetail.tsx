import Image from 'next/image';
import HexagonRadar from '@/components/ui/HexagonRadar';
import Heatmap from '@/components/features/Heatmap';
import type { Position } from '@/types';
import { Target, Zap, Award } from 'lucide-react';

interface BadgeData {
  name: string;
  color: string;
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
    border: 'border-award-mvp',
    shadow: 'shadow-sm',
    gradient: 'from-award-mvp to-fee-partial',
    text: 'text-award-mvp',
    icon: Target,
  },
  sky: {
    border: 'border-condition-poor',
    shadow: 'shadow-sm',
    gradient: 'from-condition-poor to-pos-df',
    text: 'text-condition-poor',
    icon: Zap,
  },
  emerald: {
    border: 'border-fcgreen-500',
    shadow: 'shadow-sm',
    gradient: 'from-fcgreen-500 to-green-600',
    text: 'text-fcgreen-500',
    icon: Award,
  },
  purple: {
    border: 'border-tier-special',
    shadow: 'shadow-sm',
    gradient: 'from-tier-special to-tier-special',
    text: 'text-tier-special',
    icon: Award,
  },
  red: {
    border: 'border-result-loss',
    shadow: 'shadow-sm',
    gradient: 'from-result-loss to-chem-weak',
    text: 'text-result-loss',
    icon: Target,
  },
};

// ─── 특성카드 색상 (재미 요소) ───
const traitColorMap: Record<string, string> = {
  '유리멘탈': 'bg-result-loss/15 text-result-loss border-result-loss/30',
  '저질체력': 'bg-fee-partial/15 text-fee-partial border-fee-partial/30',
  '5연패': 'bg-tier-special/15 text-tier-special border-tier-special/30',
  '철의 폐활량': 'bg-stamina-full/15 text-stamina-full border-stamina-full/30',
  '패스 마스터': 'bg-condition-poor/15 text-condition-poor border-condition-poor/30',
  '왼발만': 'bg-award-mvp/15 text-award-mvp border-award-mvp/30',
};
const defaultTraitColor = 'bg-slate-500/15 text-slate-400 border-slate-500/30';

export default function MemberDetail({ member: m }: MemberDetailProps) {
  return (
    <div className="p-4 sm:p-5 text-white animate-fadeIn">
      {/* ─── 상단: 프로필 카드 + 특성/뱃지 ─── */}
      <div className="flex gap-4 mb-5">
        <div className="w-24 h-32 bg-slate-800 rounded-lg overflow-hidden border-2 border-viz-grid relative shadow-lg shrink-0">
          <Image
            src={m.photo}
            alt={m.name}
            width={96}
            height={128}
            className="w-full h-full object-cover"
            style={{ width: '100%', height: '100%' }}
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
                    className={`flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 border ${style.border} ${style.shadow}`}
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
      <div className="flex items-center gap-4 rounded-xl border border-green-100 bg-green-50/60 p-3">
        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 text-center text-gray-500">
            Abilities (OVR 산정)
          </span>
          <div className="w-full max-w-[140px] mx-auto">
            <HexagonRadar data={m.radar} />
          </div>
        </div>
        <div className="w-px h-28 bg-green-100"></div>
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 text-gray-500">
            Heatmap
          </span>
          <Heatmap type={m.heatmap} />
        </div>
      </div>
    </div>
  );
}
