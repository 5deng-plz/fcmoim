'use client';

import { LogOut } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import LockerProfile from '@/components/features/LockerProfile';

export default function MyPage() {
  const { setShowMyPage, teamName } = useAppStore();
  const { signOut } = useAuthStore();

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <LockerProfile />

      {/* ─── 하단 부가 기능: 소형으로 축소 배치 ─── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="font-medium">소속:</span>
          <span className="text-xs text-gray-500 font-bold">{teamName}</span>
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
