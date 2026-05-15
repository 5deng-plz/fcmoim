interface BadgeProps {
  label: string;
  variant?: 'green' | 'orange' | 'gray' | 'slate' | 'red' | 'yellow' | 'amber';
  className?: string;
  pulse?: boolean;
}

const variantClasses: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  orange: 'bg-fee-partial/15 text-fee-partial',
  gray: 'bg-gray-200 text-gray-600',
  slate: 'bg-slate-200 text-slate-600',
  red: 'bg-result-loss/10 text-result-loss',
  yellow: 'bg-award-mvp/15 text-award-mvp',
  amber: 'bg-stat-bronze text-white',
};

export default function Badge({
  label,
  variant = 'green',
  className = '',
  pulse = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-block px-2.5 py-1 text-[11px] font-extrabold rounded-md tracking-wide ${variantClasses[variant]} ${pulse ? 'animate-pulse' : ''} ${className}`}
    >
      {label}
    </span>
  );
}
