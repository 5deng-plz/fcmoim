import type { UserStats } from '@/types';

interface HexagonRadarProps {
  data: number[] | UserStats;
}

export default function HexagonRadar({ data }: HexagonRadarProps) {
  const cx = 150,
    cy = 130,
    r = 85;
  const labels = ['스피드', '슈팅', '패스', '수비', '피지컬', '드리블'];
  const statKeys = ['speed', 'shooting', 'passing', 'defense', 'physical', 'dribble'] as const;

  // UserStats 객체 또는 number[] 배열 양쪽 지원
  const values: number[] = Array.isArray(data)
    ? data
    : statKeys.map((key) => (data as UserStats)[key]);

  const getPoint = (val: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return `${cx + r * (val / 100) * Math.cos(rad)},${cy + r * (val / 100) * Math.sin(rad)}`;
  };

  const gridLevels = [20, 40, 60, 80, 100];
  const angles = [0, 60, 120, 180, 240, 300];

  // 시즌 초기값 60 기준선
  const baselineLevel = 60;

  return (
    <svg viewBox="0 0 300 250" className="w-full h-auto drop-shadow-lg">
      {/* 배경 그리드 */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={angles.map((a) => getPoint(level, a)).join(' ')}
          fill="none"
          stroke="#334155"
          strokeWidth="1"
          opacity={level === baselineLevel ? 0.6 : 0.3}
        />
      ))}

      {/* 60 기준선 (시즌 초기값) */}
      <polygon
        points={angles.map((a) => getPoint(baselineLevel, a)).join(' ')}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />

      {/* 축선 */}
      {angles.map((a) => (
        <line
          key={a}
          x1={cx}
          y1={cy}
          x2={cx + r * Math.cos(((a - 90) * Math.PI) / 180)}
          y2={cy + r * Math.sin(((a - 90) * Math.PI) / 180)}
          stroke="#334155"
          strokeWidth="1"
          opacity={0.3}
        />
      ))}

      {/* 능력치 폴리곤 */}
      <polygon
        points={values.map((val, i) => getPoint(val, angles[i])).join(' ')}
        fill="rgba(16, 185, 129, 0.4)"
        stroke="#10b981"
        strokeWidth="2.5"
        className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
      />

      {/* 능력치 포인트 (도트) */}
      {values.map((val, i) => {
        const rad = ((angles[i] - 90) * Math.PI) / 180;
        const px = cx + r * (val / 100) * Math.cos(rad);
        const py = cy + r * (val / 100) * Math.sin(rad);
        return (
          <circle
            key={`dot-${i}`}
            cx={px}
            cy={py}
            r={3}
            fill="#10b981"
            stroke="white"
            strokeWidth="1.5"
          />
        );
      })}

      {/* 라벨 + 수치 */}
      {labels.map((label, i) => {
        const textX =
          cx + (r + 28) * Math.cos(((angles[i] - 90) * Math.PI) / 180);
        const textY =
          cy + (r + 28) * Math.sin(((angles[i] - 90) * Math.PI) / 180);
        return (
          <g key={label}>
            <text
              x={textX}
              y={textY - 6}
              fill="#cbd5e1"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label}
            </text>
            <text
              x={textX}
              y={textY + 8}
              fill="#10b981"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {values[i]}
            </text>
          </g>
        );
      })}

      {/* 기준선 라벨 */}
      <text
        x={cx + r * 0.6 + 5}
        y={cy - r * 0.6 - 5}
        fill="#64748b"
        fontSize="8"
        fontWeight="bold"
      >
        초기값 {baselineLevel}
      </text>
    </svg>
  );
}
