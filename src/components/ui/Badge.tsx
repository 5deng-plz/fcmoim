interface BadgeProps {
  label: string;
  variant?: 'green' | 'orange' | 'gray' | 'slate' | 'red' | 'yellow';
  className?: string;
  pulse?: boolean;
}

const variantClasses: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  gray: 'bg-gray-200 text-gray-600',
  slate: 'bg-slate-200 text-slate-600',
  red: 'bg-red-50 text-red-500',
  yellow: 'bg-yellow-100 text-yellow-700',
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
