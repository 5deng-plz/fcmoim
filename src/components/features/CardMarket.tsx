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

const COMPACT_TRAIT_CARD_CLASSES = 'flex h-[84px] w-[92px] shrink-0 snap-start flex-col items-center justify-center rounded-2xl border px-1.5 py-2 text-center transition-all duration-200 shadow-sm';
const COMPACT_TRAIT_ICON_CLASSES = 'mb-1.5 flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-black/40 text-secondary transition-colors';
const DEFAULT_SELECTED_TRAIT_ID = 'dummy-runner';
const DEFAULT_FUTSAL_TRAIT = TRAIT_CATALOG.find((trait) => trait.id === DEFAULT_SELECTED_TRAIT_ID) ?? TRAIT_CATALOG.find((trait) => trait.positionGroup !== 'GK')!;

function isFutsalTrait(trait: TraitCard) {
  return trait.positionGroup !== 'GK';
}

function getTraitSurfaceClasses(trait: TraitCard) {
  if (trait.positionGroup === 'FW') {
    return 'border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent text-primary';
  }
  if (trait.positionGroup === 'MF') {
    return 'border-[#00ffa3]/20 bg-gradient-to-br from-[#00ffa3]/5 to-transparent text-primary';
  }
  if (trait.positionGroup === 'DF') {
    return 'border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent text-primary';
  }
  return 'border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent text-primary';
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
          className="mt-3 flex gap-2.5 snap-x snap-mandatory pb-2 no-scrollbar"
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
    <div className={`${getTraitSurfaceClasses(trait)} rounded-2xl border px-4 py-3.5 shadow-md backdrop-blur-md bg-black/30 flex flex-col justify-between`} data-testid="locker-shop-preview">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-[#00ffa3] shadow-inner" data-testid={`locker-shop-preview-icon-${trait.id}`}>
          {renderTraitIcon(trait, 22)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black leading-tight text-white">{trait.name}</p>
          <p className="mt-1.5 truncate text-[10.5px] font-bold text-gray-400 tracking-wider uppercase">{trait.category}</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-bold leading-relaxed text-gray-300">{trait.description}</p>
    </div>
  );
}

function TraitShopCard({ trait, isSelected, onClick }: { trait: TraitCard; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${COMPACT_TRAIT_CARD_CLASSES} ${getTraitSurfaceClasses(trait)} transition-all active:scale-[0.98] ${
        isSelected 
          ? 'border-[#00ffa3] ring-2 ring-[#00ffa3]/25 shadow-[0_0_12px_rgba(0,255,163,0.25)] bg-[#00ffa3]/10 scale-[1.02]' 
          : 'hover:border-white/20 hover:bg-white/5'
      }`}
      aria-pressed={isSelected}
      data-testid="locker-shop-trait-card"
    >
      <span className={`${COMPACT_TRAIT_ICON_CLASSES} ${isSelected ? 'border-[#00ffa3]/30 text-[#00ffa3] bg-black/60' : ''}`} data-testid={`locker-shop-trait-icon-${trait.id}`}>
        {renderTraitIcon(trait, 18)}
      </span>
      <span className={`w-full truncate text-[10.5px] font-black leading-tight ${isSelected ? 'text-[#00ffa3]' : 'opacity-90'}`}>
        {trait.name}
      </span>
    </button>
  );
}
