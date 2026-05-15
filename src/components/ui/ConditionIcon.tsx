import { ArrowDown, ArrowDownRight, ArrowRight, ArrowUp, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ConditionLevel = 'best' | 'good' | 'normal' | 'poor' | 'worst';

const conditionStyles: Record<ConditionLevel, { Icon: LucideIcon; className: string; label: string }> = {
  best: { Icon: ArrowUp, className: 'text-condition-best', label: '컨디션 최상' },
  good: { Icon: ArrowUpRight, className: 'text-condition-good', label: '컨디션 좋음' },
  normal: { Icon: ArrowRight, className: 'text-condition-normal', label: '컨디션 보통' },
  poor: { Icon: ArrowDownRight, className: 'text-condition-poor', label: '컨디션 나쁨' },
  worst: { Icon: ArrowDown, className: 'text-condition-worst', label: '컨디션 최하' },
};

export default function ConditionIcon({
  level = 'normal',
  size = 18,
}: {
  level?: ConditionLevel;
  size?: number;
}) {
  const style = conditionStyles[level];
  const Icon = style.Icon;

  return (
    <span
      className={`inline-flex items-center justify-center ${style.className}`}
      aria-label={style.label}
      title={style.label}
    >
      <Icon size={size} strokeWidth={3} aria-hidden="true" />
    </span>
  );
}
