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

        <div className="mt-3 grid grid-cols-2 gap-2">
          {sortedTraits.map((trait) => {
            const isSelected = trait.id === selectedTrait?.id;
            return (
              <button
                key={trait.id}
                type="button"
                onClick={() => setSelectedTraitId(trait.id)}
                className={`flex h-[88px] flex-col items-center justify-center gap-2 rounded-xl border px-2 py-2 text-center transition-all active:scale-[0.98] ${
                  isSelected
                    ? 'border-brand-primary bg-glass-bg-hover ring-2 ring-brand-primary/20'
                    : 'border-glass-border bg-glass-bg hover:bg-glass-bg-hover'
                }`}
                aria-pressed={isSelected}
              >
                <TraitCardIcon trait={trait} />
                <span className="w-full truncate text-[10px] font-black leading-tight text-primary">
                  {trait.name}
                </span>
              </button>
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
    <div className="rounded-2xl border border-border bg-surface-card px-3 py-3 shadow-sm" data-testid="locker-shop-preview">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-bg text-secondary">
          <TraitIcon size={26} strokeWidth={2.4} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black leading-tight text-primary">{trait.name}</p>
          <p className="mt-1 truncate text-[11px] font-bold text-secondary">{trait.category}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs font-bold leading-relaxed text-secondary">{trait.description}</p>
      <p className="mt-2 truncate text-[10px] font-black text-tertiary">현재 카드: {equippedTrait.name}</p>
    </div>
  );
}

function TraitCardIcon({ trait }: { trait: TraitCard }) {
  const TraitIcon = traitIconMap[trait.icon];
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-card text-secondary">
      <TraitIcon size={18} strokeWidth={2.4} aria-hidden="true" />
    </div>
  );
}
