

interface MatchRecord {
  round: string;
  date: string;
  result: '승' | '무' | '패';
  goals: number;
  assists: number;
  location?: string;
}

const resultStyle = {
  '승': 'bg-green-100 text-green-700',
  '무': 'bg-yellow-100 text-yellow-700',
  '패': 'bg-red-100 text-red-700',
};

interface PlayerMatchHistoryProps {
  records: MatchRecord[];
}

export default function PlayerMatchHistory({ records }: PlayerMatchHistoryProps) {
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
      {records.map((r, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 w-12">{r.round}</span>
              <span className="text-xs text-gray-400">{r.date}</span>
            </div>
            {r.location && (
              <span className="text-[10px] text-gray-400 font-medium">
                {r.location}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500">
              {r.goals > 0 && `⚽${r.goals} `}
              {r.assists > 0 && `🅰️${r.assists}`}
              {r.goals === 0 && r.assists === 0 && '-'}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${resultStyle[r.result]}`}
            >
              {r.result}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
