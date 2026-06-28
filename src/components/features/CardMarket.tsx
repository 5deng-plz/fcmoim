'use client';

import {
  Anchor,
  ArrowUpRight,
  Badge,
  Bolt,
  Brain,
  CornerDownRight,
  Crosshair,
  Crown,
  Flame,
  Gauge,
  Goal,
  HandHelping,
  Layers,
  LockKeyhole,
  Map,
  MoveDiagonal,
  Radar,
  Rocket,
  Route,
  Send,
  Shield,
  Shuffle,
  Sparkles,
  Store,
  Swords,
  Target,
  Users,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { createElement, useMemo, useState } from 'react';
import {
  TRAIT_CATALOG,
  findTraitById,
  getDefaultTraitForProfile,
  type TraitCard,
  type TraitIconName,
} from '@/lib/traitCatalog';
import { useAuthStore } from '@/stores/useAuthStore';
import { DEFAULT_STATS } from '@/types';

const traitIconMap: Record<TraitIconName, LucideIcon> = {
  anchor: Anchor,
  badge: Badge,
  bolt: Bolt,
  brain: Brain,
  crown: Crown,
  flame: Flame,
  gauge: Gauge,
  goal: Goal,
  layers: Layers,
  map: Map,
  moveDiagonal: MoveDiagonal,
  radar: Radar,
  rocket: Rocket,
  shield: Shield,
  sparkles: Sparkles,
  swords: Swords,
  target: Target,
  users: Users,
};

const traitIconOverrideMap: Partial<Record<string, LucideIcon>> = {
  'target-man': HandHelping,
  'def-fullback': LockKeyhole,
  'cross-specialist': Send,
  'fox-in-the-box': Crosshair,
  'off-fullback': Route,
  'fb-finisher': CornerDownRight,
  'prolific-winger': Wind,
  'hole-player': ArrowUpRight,
  'roaming-flank': Shuffle,
};

const COMPACT_TRAIT_CARD_CLASSES = 'flex h-[82px] w-[88px] shrink-0 snap-start flex-col items-center justify-center rounded-2xl border px-1 py-2 text-center';
const COMPACT_TRAIT_ICON_CLASSES = 'mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-colors group-hover:text-white';
const DEFAULT_SELECTED_TRAIT_ID = 'dummy-runner';
const DEFAULT_FUTSAL_TRAIT = TRAIT_CATALOG.find((trait) => trait.id === DEFAULT_SELECTED_TRAIT_ID) ?? TRAIT_CATALOG.find((trait) => trait.positionGroup !== 'GK')!;

function isFutsalTrait(trait: TraitCard) {
  return trait.positionGroup !== 'GK';
}

function getTraitSurfaceClasses(trait: TraitCard, isSelected: boolean) {
  const base = 'bg-[#12131e]/90 backdrop-blur-md text-white transition-all duration-300 border';
  
  if (trait.positionGroup === 'FW') {
    return `${base} ${
      isSelected 
        ? 'border-[#00ffa3] shadow-[0_0_12px_rgba(0,255,163,0.22)] bg-[#00ffa3]/5' 
        : 'border-white/10 hover:border-[#00ffa3]/30'
    }`;
  }
  if (trait.positionGroup === 'MF') {
    return `${base} ${
      isSelected 
        ? 'border-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.22)] bg-[#a855f7]/5' 
        : 'border-white/10 hover:border-[#a855f7]/30'
    }`;
  }
  if (trait.positionGroup === 'DF') {
    return `${base} ${
      isSelected 
        ? 'border-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.22)] bg-[#3b82f6]/5' 
        : 'border-white/10 hover:border-[#3b82f6]/30'
    }`;
  }
  return `${base} ${
    isSelected 
      ? 'border-gray-400 shadow-[0_0_12px_rgba(156,163,175,0.22)] bg-white/5' 
      : 'border-white/10 hover:border-gray-500/30'
  }`;
}

function getTraitIcon(trait: TraitCard) {
  return traitIconOverrideMap[trait.id] ?? traitIconMap[trait.icon];
}

function renderTraitIcon(trait: TraitCard, size: number) {
  return createElement(getTraitIcon(trait), {
    size,
    strokeWidth: 2.4,
    'aria-hidden': true,
  });
}

function getTraitSortGroup(trait: TraitCard) {
  if (trait.positionGroup === 'FW') return 0;
  if (trait.positionGroup === 'MF') return 1;
  if (trait.positionGroup === 'DF') return 2;
  return 3;
}

export default function CardMarket() {
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const [selectedTraitId, setSelectedTraitId] = useState(DEFAULT_SELECTED_TRAIT_ID);
  const selectedTraitCandidate = findTraitById(selectedTraitId);
  const selectedTrait = selectedTraitCandidate && isFutsalTrait(selectedTraitCandidate)
    ? selectedTraitCandidate
    : DEFAULT_FUTSAL_TRAIT;
  const selectedEquippedTraitCandidate = findTraitById(memberProfile?.selectedTraitId);
  const selectedEquippedTrait = selectedEquippedTraitCandidate && isFutsalTrait(selectedEquippedTraitCandidate)
    ? selectedEquippedTraitCandidate
    : null;
  const fallbackTraitCandidate = getDefaultTraitForProfile(memberProfile?.mainPosition ?? 'MF', memberProfile?.stats ?? DEFAULT_STATS);
  const fallbackTrait = isFutsalTrait(fallbackTraitCandidate) ? fallbackTraitCandidate : DEFAULT_FUTSAL_TRAIT;
  const previewTrait = selectedTrait ?? selectedEquippedTrait ?? fallbackTrait;
  const sortedTraits = useMemo(
    () => TRAIT_CATALOG
      .filter(isFutsalTrait)
      .sort((left, right) => (
        getTraitSortGroup(left) - getTraitSortGroup(right)
        || left.price - right.price
        || left.name.localeCompare(right.name, 'ko')
      )),
    [],
  );

  return (
    <section>
      <div className="mb-3 px-1">
        <h3 className="flex items-center gap-1.5 font-bold text-primary">
          <Store size={18} className="text-award-motm" /> 라커룸 상점
        </h3>
      </div>

      <div className="mb-3 rounded-2xl border border-glass-border bg-glass-bg p-3 shadow-glass-shadow backdrop-blur-md" data-testid="locker-shop">
        <TraitPreviewCard trait={previewTrait} />

        <div
          className="mt-3 flex gap-2 snap-x snap-mandatory pb-1 no-scrollbar"
          style={{ overflowX: 'auto' }}
          data-testid="locker-shop-carousel"
        >
          {sortedTraits.map((trait) => {
            const isSelected = trait.id === selectedTrait?.id;
            return (
              <TraitShopCard
                key={trait.id}
                trait={trait}
                isSelected={isSelected}
                onClick={() => setSelectedTraitId(trait.id)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TraitPreviewCard({ trait }: { trait: TraitCard }) {
  return (
    <div className={`${getTraitSurfaceClasses(trait, true)} rounded-xl border px-3 py-2.5 shadow-sm relative overflow-hidden`} data-testid="locker-shop-preview">
      <div className="flex items-center gap-3 relative z-10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white" data-testid={`locker-shop-preview-icon-${trait.id}`}>
          {renderTraitIcon(trait, 22)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black leading-tight text-white">{trait.name}</p>
          <span className="mt-0.5 inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
            {trait.category}
          </span>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] font-bold leading-relaxed text-gray-300 relative z-10">{trait.description}</p>
    </div>
  );
}

function TraitShopCard({ trait, isSelected, onClick }: { trait: TraitCard; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${COMPACT_TRAIT_CARD_CLASSES} ${getTraitSurfaceClasses(trait, isSelected)} transition-all active:scale-[0.98] group`}
      aria-pressed={isSelected}
      data-testid="locker-shop-trait-card"
    >
      <span className={`${COMPACT_TRAIT_ICON_CLASSES} ${isSelected ? 'text-[#00ffa3] border-[#00ffa3]/25 bg-[#00ffa3]/5' : ''}`} data-testid={`locker-shop-trait-icon-${trait.id}`}>
        {renderTraitIcon(trait, 18)}
      </span>
      <span className="w-full truncate text-[10px] font-black leading-tight opacity-90">
        {trait.name}
      </span>
    </button>
  );
}
