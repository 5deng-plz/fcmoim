'use client';

import { LogOut, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import LockerProfile from '@/components/features/LockerProfile';

const FAKE_TEAMS = [
  { id: 'tiger', name: 'FC Tiger', grade: '💎 Diamond', emblem: 'G', color: 'green' },
  { id: 'lion', name: 'FC Lion', grade: '🥇 Gold', emblem: 'L', color: 'blue' },
];

export default function MyPage() {
  const { setShowMyPage } = useAppStore();
  const { lastTenant, setLastTenant, signOut } = useAuthStore();

  const currentTenant = lastTenant || 'tiger';

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <LockerProfile />

      {/* ─── 하단 부가 기능: 소형으로 축소 배치 ─── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="font-medium">소속:</span>
          <select 
            value={currentTenant}
            onChange={(e) => {
              setLastTenant(e.target.value);
              const selectedTeam = FAKE_TEAMS.find(t => t.id === e.target.value);
              alert(`${selectedTeam?.name} 팀으로 전환합니다.`);
            }}
            className="text-xs text-gray-500 font-bold bg-transparent border-none outline-none cursor-pointer appearance-none pr-4 -mr-2"
          >
            {FAKE_TEAMS.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <ChevronDown size={10} className="text-gray-400 -ml-3" />
        </div>
        <button
          onClick={async () => {
            await signOut();
            setShowMyPage(false);
          }}
          className="text-xs text-gray-400 font-medium hover:text-gray-600 active:scale-95 transition-all flex items-center gap-1"
        >
          <LogOut size={12} />
          로그아웃
        </button>
      </div>
    </div>
  );
}
