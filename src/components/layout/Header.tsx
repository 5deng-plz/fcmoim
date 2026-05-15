'use client';

import { Bell, Home } from 'lucide-react';
import Image from 'next/image';
import TeamEmblem from '@/components/brand/TeamEmblem';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function Header() {
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const {
    userStatus,
    setShowMyPage,
    showMyPage,
    showCommunity,
    setShowCommunity,
    showJoinForm,
    setShowJoinForm,
    showNotifications,
    setShowNotifications,
    teamName,
  } = useAppStore();

  const isSubPage = showMyPage || showCommunity || showJoinForm;
  const subPageTitle = showMyPage ? '마이페이지' : showJoinForm ? '입단신청' : '커뮤니티';

  const handleBack = () => {
    setShowMyPage(false);
    setShowCommunity(false);
    setShowJoinForm(false);
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl px-4 py-3 flex justify-between items-center min-h-[56px] shadow-sm">
      {isSubPage ? (
        <>
          <button
            onClick={handleBack}
            className="text-gray-500 hover:text-gray-900 active:scale-95 transition-all w-16 text-left"
          >
            <Home size={20} />
          </button>
          <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">{subPageTitle}</h1>
          <div className="w-16" />
        </>
      ) : (
        <>
          <h1 className="flex items-center gap-1.5 text-xl font-black tracking-tight text-gray-900">
            <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-green-100">
              <TeamEmblem teamName={teamName} size={44} className="shrink-0 scale-[1.08]" />
            </span>
            <span className="truncate">{teamName}</span>
          </h1>
          <div className="flex items-center gap-3">
            {/* 게스트 상태 배지 */}
            {userStatus === 'guest' && (
              <span className="text-[10px] font-bold bg-fee-partial/15 text-fee-partial px-2 py-0.5 rounded-full">
                구경중 👀
              </span>
            )}

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 hover:bg-gray-100 rounded-full active:scale-90 transition-all text-gray-500"
            >
              <Bell size={22} />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-matchst-live rounded-full ring-2 ring-white" />
            </button>

            {userStatus === 'guest' ? (
              <button
                onClick={() => setShowJoinForm(true)}
                className="text-[11px] font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 active:scale-95 transition-all"
              >
                입단신청
              </button>
            ) : (
              <button
                onClick={() => setShowMyPage(true)}
                className="hover:ring-2 hover:ring-green-300 rounded-full active:scale-90 transition-all"
              >
                <Image
                  src={memberProfile?.photoUrl || getFallbackAvatar(memberProfile?.name || 'member-profile')}
                  alt="프로필"
                  width={34}
                  height={34}
                  sizes="34px"
                  loading="eager"
                  priority
                  className="rounded-full bg-gray-200 object-cover"
                  style={{ width: 34, height: 34 }}
                  unoptimized
                />
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
}
