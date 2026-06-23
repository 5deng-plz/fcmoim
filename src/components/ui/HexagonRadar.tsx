import { useRef, useState, type PointerEvent } from 'react';
import { STAT_KEYS, type UserStats } from '@/types';

interface HexagonRadarProps {
  data: number[] | UserStats;
  className?: string;
  onAxisClick?: (key: keyof UserStats, label: string, currentValue: number) => void;
  showAllValues?: boolean;
  isDraggable?: boolean;
  onStatDrag?: (key: keyof UserStats, value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function HexagonRadar({
  data,
  className = '',
  onAxisClick,
  showAllValues = false,
  isDraggable = false,
  onStatDrag,
  onDragStart,
  onDragEnd,
}: HexagonRadarProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeAxisRef = useRef<{ key: keyof UserStats; angle: number } | null>(null);
  const [selectedAxisKey, setSelectedAxisKey] = useState<keyof UserStats | null>(null);
  const cx = 130;
  const cy = 108;
  const r = 54;
  const viewBoxWidth = 260;
  const viewBoxHeight = 216;
  const maxStat = 99;
  const rawValues = STAT_KEYS.map((key, index) => (Array.isArray(data) ? data[index] : data[key]));
  const values = rawValues.map((value) => Math.min(maxStat, Math.max(0, Number.isFinite(value) ? value : 0)));
  const axes = [
    { key: 'attack', label: '공격', value: values[0], angle: 0 },
    { key: 'speed', label: '스피드', value: values[4], angle: 60 },
    { key: 'mentality', label: '멘탈', value: values[3], angle: 120 },
    { key: 'defense', label: '수비', value: values[1], angle: 180 },
    { key: 'manner', label: '인성', value: values[5], angle: 240 },
    { key: 'stamina', label: '체력', value: values[2], angle: 300 },
  ] as const;
  const angles = axes.map((axis) => axis.angle);
  const ariaLabel = `능력치 레이더: ${axes.map((axis) => `${axis.label} ${axis.value}`).join(', ')}`;

  const getPointCoords = (val: number, angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * (val / maxStat) * Math.cos(rad),
      y: cy + r * (val / maxStat) * Math.sin(rad),
    };
  };

  const getPoint = (val: number, angle: number) => {
    const point = getPointCoords(val, angle);
    return `${point.x},${point.y}`;
  };

  const emitDragValue = (event: PointerEvent<SVGElement>, axis = activeAxisRef.current) => {
    if (!axis || !onStatDrag) return;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width > 0 ? viewBoxWidth / rect.width : 1;
    const scaleY = rect.height > 0 ? viewBoxHeight / rect.height : 1;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const rad = ((axis.angle - 90) * Math.PI) / 180;
    const unitX = Math.cos(rad);
    const unitY = Math.sin(rad);
    const projectedDistance = (x - cx) * unitX + (y - cy) * unitY;
    const nextValue = Math.round(Math.max(0, Math.min(r, projectedDistance)) / r * maxStat);

    onStatDrag(axis.key, nextValue);
  };

  const handlePointerDown = (
    event: PointerEvent<SVGCircleElement>,
    axis: { key: keyof UserStats; angle: number },
  ) => {
    if (!isDraggable || !onStatDrag) return;
    event.preventDefault();
    activeAxisRef.current = axis;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onDragStart?.();
    emitDragValue(event, axis);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!activeAxisRef.current) return;
    event.preventDefault();
    emitDragValue(event);
  };

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (!activeAxisRef.current) return;
    event.preventDefault();
    activeAxisRef.current = null;
    onDragEnd?.();
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 260 216"
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label={ariaLabel}
      data-testid="hexagon-radar"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
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
        fill="var(--viz-danger-fill)"
        stroke="var(--viz-danger)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {isDraggable && onStatDrag ? axes.map((axis) => {
        const point = getPointCoords(axis.value, axis.angle);

        return (
          <g key={`${axis.label}-handle`} className="radar-drag-handle">
            <circle
              cx={point.x}
              cy={point.y}
              r="18"
              fill="transparent"
              className="cursor-pointer"
              style={{ touchAction: 'none' }}
              role="slider"
              aria-label={`${axis.label} 드래그`}
              aria-valuemin={0}
              aria-valuemax={99}
              aria-valuenow={axis.value}
              tabIndex={0}
              data-testid={`radar-drag-handle-${axis.key}`}
              onPointerDown={(event) => handlePointerDown(event, axis)}
            />
          </g>
        );
      }) : null}

      {axes.map((axis) => {
        const textX = cx + (r + 28) * Math.cos(((axis.angle - 90) * Math.PI) / 180);
        const textY = cy + (r + 28) * Math.sin(((axis.angle - 90) * Math.PI) / 180);
        const valueY = textY - 8;
        const labelY = textY + 8;

        return (
          <g
            key={axis.label}
            className={`radar-axis outline-none ${onAxisClick ? 'cursor-pointer' : ''}`}
            tabIndex={0}
            aria-label={`${axis.label} ${axis.value}`}
            onMouseEnter={() => setSelectedAxisKey(axis.key)}
            onMouseLeave={() => setSelectedAxisKey((current) => (current === axis.key ? null : current))}
            onFocus={() => setSelectedAxisKey(axis.key)}
            onBlur={() => setSelectedAxisKey((current) => (current === axis.key ? null : current))}
            onClick={() => {
              setSelectedAxisKey(axis.key);
              if (onAxisClick) {
                onAxisClick(axis.key, axis.label, axis.value);
              }
            }}
          >
            <title>{`${axis.label} ${axis.value}`}</title>
            <circle cx={textX} cy={textY} r="20" fill="transparent" />
            <text
              x={textX}
              y={valueY}
              className="radar-axis-value"
              style={showAllValues || selectedAxisKey === axis.key ? { opacity: 1 } : undefined}
              fill="var(--viz-danger)"
              fontSize="11"
              fontWeight="900"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {axis.value}
            </text>
            <text
              x={textX}
              y={labelY}
              fill="var(--viz-label)"
              fontSize="11"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {axis.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
