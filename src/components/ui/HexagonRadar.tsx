import { STAT_KEYS, type UserStats } from '@/types';

interface HexagonRadarProps {
  data: number[] | UserStats;
  className?: string;
  onAxisClick?: (key: keyof UserStats, label: string, currentValue: number) => void;
  showAllValues?: boolean;
}

const labelToKey: Record<string, keyof UserStats> = {
  '공격': 'attack',
  '스피드': 'speed',
  '멘탈': 'mentality',
  '수비': 'defense',
  '인성': 'manner',
  '체력': 'stamina',
};

export default function HexagonRadar({
  data,
  className = '',
  onAxisClick,
  showAllValues = false,
}: HexagonRadarProps) {
  const cx = 130;
  const cy = 108;
  const r = 54;
  const maxStat = 99;
  const rawValues = STAT_KEYS.map((key, index) => (Array.isArray(data) ? data[index] : data[key]));
  const values = rawValues.map((value) => Math.min(maxStat, Math.max(0, Number.isFinite(value) ? value : 0)));
  const axes = [
    { label: '공격', value: values[0], angle: 0 },
    { label: '스피드', value: values[4], angle: 60 },
    { label: '멘탈', value: values[3], angle: 120 },
    { label: '수비', value: values[1], angle: 180 },
    { label: '인성', value: values[5], angle: 240 },
    { label: '체력', value: values[2], angle: 300 },
  ] as const;
  const angles = axes.map((axis) => axis.angle);
  const ariaLabel = `능력치 레이더: ${axes.map((axis) => `${axis.label} ${axis.value}`).join(', ')}`;

  const getPoint = (val: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return `${cx + r * (val / maxStat) * Math.cos(rad)},${cy + r * (val / maxStat) * Math.sin(rad)}`;
  };

  return (
    <svg
      viewBox="0 0 260 216"
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label={ariaLabel}
      data-testid="hexagon-radar"
    >
      <polygon
        points={angles.map((angle) => getPoint(maxStat, angle)).join(' ')}
        fill="var(--glass-bg)"
        opacity="0.5"
      />

      {angles.map((angle) => (
        <line
          key={angle}
          x1={cx}
          y1={cy}
          x2={cx + r * Math.cos(((angle - 90) * Math.PI) / 180)}
          y2={cy + r * Math.sin(((angle - 90) * Math.PI) / 180)}
          stroke="var(--viz-grid)"
          strokeWidth="1"
          opacity="1"
        />
      ))}

      <polygon
        points={axes.map((axis) => getPoint(axis.value, axis.angle)).join(' ')}
        fill="var(--viz-primary-fill)"
        stroke="var(--viz-primary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {axes.map((axis) => {
        const textX = cx + (r + 28) * Math.cos(((axis.angle - 90) * Math.PI) / 180);
        const textY = cy + (r + 28) * Math.sin(((axis.angle - 90) * Math.PI) / 180);
        const valueY = textY + (axis.angle === 180 ? 14 : axis.angle === 0 ? -14 : axis.angle > 180 ? 14 : -14);

        return (
          <g
            key={axis.label}
            className={`radar-axis outline-none ${onAxisClick ? 'cursor-pointer' : ''}`}
            tabIndex={0}
            aria-label={`${axis.label} ${axis.value}`}
            onClick={() => {
              if (onAxisClick) {
                const key = labelToKey[axis.label];
                onAxisClick(key, axis.label, axis.value);
              }
            }}
          >
            <title>{`${axis.label} ${axis.value}`}</title>
            <circle cx={textX} cy={textY} r="20" fill="transparent" />
            <text
              x={textX}
              y={textY}
              fill="var(--viz-label)"
              fontSize="11"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {axis.label}
            </text>
            <text
              x={textX}
              y={valueY}
              className="radar-axis-value"
              style={showAllValues ? { opacity: 1 } : undefined}
              fill="var(--brand-primary)"
              fontSize="11"
              fontWeight="900"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {axis.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
