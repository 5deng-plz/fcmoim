'use client';

import {
  Anchor,
  Badge,
  Bolt,
  Brain,
  Crown,
  Flame,
  Gauge,
  Goal,
  Layers,
  Map,
  MoveDiagonal,
  Radar,
  Rocket,
  Shield,
  Sparkles,
  Store,
  Swords,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  PURCHASABLE_TRAITS,
  findTraitById,
  getDefaultTraitForProfile,
  getTraitGradeClasses,
  getTraitGradeLabel,
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

const COMPACT_TRAIT_CARD_CLASSES = 'flex h-[88px] w-[104px] shrink-0 snap-start flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center shadow-inner';
const COMPACT_TRAIT_ICON_CLASSES = 'mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-card text-secondary';

export default function CardMarket() {
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const [selectedTraitId, setSelectedTraitId] = useState(PURCHASABLE_TRAITS[0]?.id ?? '');
  const selectedTrait = findTraitById(selectedTraitId) ?? PURCHASABLE_TRAITS[0];
  const selectedEquippedTrait = findTraitById(memberProfile?.selectedTraitId);
  const fallbackTrait = getDefaultTraitForProfile(memberProfile?.mainPosition ?? 'MF', memberProfile?.stats ?? DEFAULT_STATS);
  const previewTrait = selectedTrait ?? selectedEquippedTrait ?? fallbackTrait;
  const sortedTraits = useMemo(
    () => [...PURCHASABLE_TRAITS].sort((left, right) => left.price - right.price || left.name.localeCompare(right.name, 'ko')),
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
        <TraitPreviewCard trait={previewTrait} equippedTrait={selectedEquippedTrait ?? fallbackTrait} />

        <div
          className="mt-3 flex gap-2 snap-x snap-mandatory pb-1"
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

function TraitPreviewCard({ trait, equippedTrait }: { trait: TraitCard; equippedTrait: TraitCard }) {
  const TraitIcon = traitIconMap[trait.icon];
  return (
    <div className="rounded-xl border border-border bg-surface-card px-3 py-2.5 shadow-sm" data-testid="locker-shop-preview">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-bg text-secondary">
          <TraitIcon size={22} strokeWidth={2.4} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black leading-tight text-primary">{trait.name}</p>
          <p className="mt-1 truncate text-[11px] font-bold text-secondary">{trait.category}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-[11px] font-bold leading-relaxed text-secondary">{trait.description}</p>
      <p className="mt-1 truncate text-[10px] font-black text-tertiary">현재 카드: {equippedTrait.name}</p>
    </div>
  );
}

function TraitShopCard({ trait, isSelected, onClick }: { trait: TraitCard; isSelected: boolean; onClick: () => void }) {
  const TraitIcon = traitIconMap[trait.icon];
  const traitClasses = getTraitGradeClasses(trait.grade);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${COMPACT_TRAIT_CARD_CLASSES} ${traitClasses} transition-all active:scale-[0.98] ${
        isSelected ? 'border-brand-primary ring-2 ring-brand-primary/30' : 'hover:bg-glass-bg-hover'
      }`}
      aria-pressed={isSelected}
      data-testid="locker-shop-trait-card"
    >
      <span className={COMPACT_TRAIT_ICON_CLASSES}>
        <TraitIcon size={18} strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="w-full truncate text-[10px] font-black leading-tight opacity-90">
        {trait.name}
      </span>
      <span className="mt-0.5 w-full truncate text-[8px] font-black leading-none opacity-70">
        {getTraitGradeLabel(trait.grade)}
      </span>
    </button>
  );
}
