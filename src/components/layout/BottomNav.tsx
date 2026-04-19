'use client';

import { Home, CalendarDays, BarChart2, Users, Lock } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useToastStore';

const tabs = [
  { key: 'home' as const, label: '홈', Icon: Home },
  { key: 'schedule' as const, label: '일정', Icon: CalendarDays },
  { key: 'records' as const, label: '기록', Icon: BarChart2 },
  { key: 'locker_room' as const, label: '라커룸', Icon: Users },
] as const;

// 게스트 사용자에게 허용된 탭
const GUEST_ALLOWED_TABS = new Set(['home']);

export default function BottomNav() {
  const { activeTab, setActiveTab, showMyPage, showCommunity, showJoinForm, userStatus } = useAppStore();
  const { showToast } = useToastStore();

  const isGuest = userStatus === 'guest';

  const handleTabClick = (key: typeof tabs[number]['key']) => {
    if (isGuest && !GUEST_ALLOWED_TABS.has(key)) {
      showToast('가입하면 볼 수 있어요! ⚽');
      return;
    }
    setActiveTab(key);
  };

  return (
    <nav
      className="sticky bottom-0 z-20 bg-white/80 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)]"
      style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.04), 0 -4px 16px rgba(0,0,0,0.02)' }}
    >
      <div className="flex justify-around">
        {tabs.map(({ key, label, Icon }) => {
          const isActive = activeTab === key && !showMyPage && !showCommunity && !showJoinForm;
          const isLocked = isGuest && !GUEST_ALLOWED_TABS.has(key);

          return (
            <button
              key={key}
              onClick={() => handleTabClick(key)}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-3 transition-all duration-200 relative ${
                isActive
                  ? 'text-green-600'
                  : isLocked
                  ? 'text-gray-300'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {/* 활성 탭 인디케이터 pill */}
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-green-600 rounded-full" />
              )}
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {isLocked && (
                  <Lock size={8} className="absolute -top-0.5 -right-1 text-gray-400" />
                )}
              </div>
              <span
                className={`text-[10px] ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
