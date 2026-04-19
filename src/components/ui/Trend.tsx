interface TrendProps {
  trend: number;
}

export default function Trend({ trend }: TrendProps) {
  if (trend > 0)
    return (
      <span className="text-[10px] text-red-500 font-bold ml-1">▲{trend}</span>
    );
  if (trend < 0)
    return (
      <span className="text-[10px] text-blue-500 font-bold ml-1">
        ▼{Math.abs(trend)}
      </span>
    );
  return <span className="text-[10px] text-gray-400 font-bold ml-1">-</span>;
}
