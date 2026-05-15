import type { UserStats } from '@/types';

interface HexagonRadarProps {
  data: number[] | UserStats;
  className?: string;
}

export default function HexagonRadar({ data, className = '' }: HexagonRadarProps) {
  const cx = 130;
  const cy = 108;
  const r = 54;
  const maxStat = 99;
  const statKeys = ['speed', 'shooting', 'passing', 'defense', 'physical', 'dribble'] as const;
  const rawValues = statKeys.map((key, index) => (Array.isArray(data) ? data[index] : data[key]));
  const values = rawValues.map((value) => Math.min(maxStat, Math.max(0, Number.isFinite(value) ? value : 0)));
  const axes = [
    { label: '패스', value: values[2], angle: 0 },
    { label: '슈팅', value: values[1], angle: 60 },
    { label: '피지컬', value: values[4], angle: 120 },
    { label: '수비', value: values[3], angle: 180 },
    { label: '스피드', value: values[0], angle: 240 },
    { label: '드리블', value: values[5], angle: 300 },
  ] as const;
  const angles = axes.map((axis) => axis.angle);

  const getPoint = (val: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return `${cx + r * (val / maxStat) * Math.cos(rad)},${cy + r * (val / maxStat) * Math.sin(rad)}`;
  };

  return (
    <svg
      viewBox="0 0 260 216"
      className={`h-auto w-full ${className}`}
      aria-hidden="true"
      data-testid="hexagon-radar"
    >
      <polygon
        points={angles.map((angle) => getPoint(maxStat, angle)).join(' ')}
        fill="var(--surface-card)"
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
          strokeWidth="0.75"
          opacity="0.55"
        />
      ))}

      <polygon
        points={axes.map((axis) => getPoint(axis.value, axis.angle)).join(' ')}
        fill="var(--result-loss)"
        fillOpacity="0.25"
        stroke="var(--result-loss)"
        strokeWidth="2.75"
        strokeLinejoin="round"
      />

      {axes.map((axis) => {
        const textX = cx + (r + 28) * Math.cos(((axis.angle - 90) * Math.PI) / 180);
        const textY = cy + (r + 28) * Math.sin(((axis.angle - 90) * Math.PI) / 180);

        return (
          <text
            key={axis.label}
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
        );
      })}
    </svg>
  );
}
