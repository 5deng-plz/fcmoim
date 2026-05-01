'use client';

import { Bell, Home } from 'lucide-react';
import Image from 'next/image';
import FcMoimMark from '@/components/brand/FcMoimMark';
import { getDemoFace } from '@/mocks/demoMedia';
import { useAppStore } from '@/stores/useAppStore';

export default function Header() {
  const {
    userRole,
    setUserRole,
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
  const subPageTitle = showMyPage ? '마이페이지' : showJoinForm ? '가입 신청' : '커뮤니티';

  const handleBack = () => {
    setShowMyPage(false);
    setShowCommunity(false);
    setShowJoinForm(false);
  };

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl px-4 py-3 flex justify-between items-center min-h-[56px]"
      style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.02)' }}
    >
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
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-1.5">
            <FcMoimMark size={24} />
            {teamName}
          </h1>
          <div className="flex items-center gap-3">
            {/* 데모용 역할 전환 — 개발 모드에서만 표시 */}
            {isDev && (
              <select
                value={userRole}
                onChange={(e) =>
                  setUserRole(e.target.value as 'admin' | 'operator' | 'member')
                }
                className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md border-none outline-none appearance-none cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <option value="admin">Admin</option>
                <option value="operator">Op</option>
                <option value="member">Mem</option>
              </select>
            )}

            {/* 게스트 상태 배지 */}
            {userStatus === 'guest' && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                구경중 👀
              </span>
            )}

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 hover:bg-gray-100 rounded-full active:scale-90 transition-all text-gray-500"
            >
              <Bell size={22} />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            {userStatus === 'guest' ? (
              <button
                onClick={() => setShowJoinForm(true)}
                className="text-[11px] font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 active:scale-95 transition-all"
              >
                가입 신청
              </button>
            ) : (
              <button
                onClick={() => setShowMyPage(true)}
                className="hover:ring-2 hover:ring-green-300 rounded-full active:scale-90 transition-all"
              >
                <Image
                  src={getDemoFace('Felix')}
                  alt="프로필"
                  width={34}
                  height={34}
                  className="rounded-full bg-gray-200"
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
