interface BadgeProps {
  label: string;
  variant?: 'green' | 'orange' | 'gray' | 'slate' | 'red' | 'yellow' | 'amber';
  className?: string;
  pulse?: boolean;
}

const variantClasses: Record<string, string> = {
  green: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  orange: 'bg-fee-partial/10 text-fee-partial dark:bg-fee-partial/20 dark:text-fee-partial',
  gray: 'bg-gray-100 text-gray-600 dark:bg-surface-hover dark:text-secondary',
  slate: 'bg-slate-100 text-slate-600 dark:bg-surface-hover dark:text-secondary',
  red: 'bg-result-loss/10 text-result-loss dark:bg-result-loss/20 dark:text-result-loss',
  yellow: 'bg-award-mvp/10 text-award-mvp dark:bg-award-mvp/20 dark:text-award-mvp',
  amber: 'bg-stat-bronze text-white dark:bg-stat-bronze/80 dark:text-gray-100',
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
