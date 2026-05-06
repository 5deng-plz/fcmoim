import type { Position } from '@/types';

interface HeatmapProps {
  type: Position;
}

export default function Heatmap({ type }: HeatmapProps) {
  return (
    <div className="w-full max-w-[110px] aspect-[2/3] bg-[#1a2e1f] border-2 border-white/20 relative mx-auto rounded-sm overflow-hidden shadow-inner">
      <div className="absolute top-1/2 w-full border-t-2 border-white/20"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-white/20 rounded-full"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-5 border-x-2 border-b-2 border-white/20"></div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-5 border-x-2 border-t-2 border-white/20"></div>

      {type === 'FW' && (
        <>
          <div className="absolute top-[10%] left-[10%] w-[80%] h-[30%] bg-red-500/80 blur-[8px] rounded-full mix-blend-screen"></div>
          <div className="absolute top-[20%] left-[30%] w-[40%] h-[20%] bg-yellow-400/70 blur-[10px] rounded-full mix-blend-screen"></div>
        </>
      )}
      {type === 'MF' && (
        <>
          <div className="absolute top-[30%] left-[15%] w-[70%] h-[40%] bg-red-500/70 blur-[10px] rounded-full mix-blend-screen"></div>
          <div className="absolute top-[35%] left-[30%] w-[40%] h-[30%] bg-yellow-400/60 blur-[12px] rounded-full mix-blend-screen"></div>
        </>
      )}
      {type === 'DF' && (
        <>
          <div className="absolute bottom-[10%] left-[15%] w-[70%] h-[30%] bg-red-500/80 blur-[10px] rounded-full mix-blend-screen"></div>
          <div className="absolute bottom-[15%] left-[30%] w-[40%] h-[20%] bg-yellow-400/70 blur-[10px] rounded-full mix-blend-screen"></div>
        </>
      )}
    </div>
  );
}
