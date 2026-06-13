'use client';

import { ArrowLeft, Bell, LogOut, Sun, Moon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import TeamEmblem from '@/components/brand/TeamEmblem';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function Header() {
  const authUser = useAuthStore((state) => state.authUser);
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const {
    isAuthenticated,
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
    teamLogoUrl,
    setActiveTab,
    setAuthView,
  } = useAppStore();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as 'light' | 'dark';
      if (saved) return saved;
      const isDark = typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false;
      return isDark ? 'dark' : 'light';
    }
    return 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const isGuestMode = userStatus === 'guest' || userStatus === 'pending' || userStatus === 'withdrawn';
  const displayedTeamName = isGuestMode ? 'FC moim' : teamName;
  const isCenteredSubPage = (showMyPage || showJoinForm) && !isGuestMode;
  const subPageTitle = showMyPage ? '마이페이지' : '입단신청';
  const shouldShowProfile = isGuestMode ? isAuthenticated && Boolean(authUser || memberProfile) : true;
  const authDisplayName = getAuthDisplayName(authUser);
  const profileName = memberProfile?.name || authDisplayName || authUser?.email || '로그인 계정';
  const profileEmail = authUser?.email || null;
  const profilePhotoUrl = memberProfile?.photoUrl || getAuthAvatarUrl(authUser);
  const avatarSrc = profilePhotoUrl || getFallbackAvatar(profileName);
  const hasCustomPhoto = Boolean(profilePhotoUrl);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isProfileMenuOpen]);

  const handleBack = () => {
    setShowMyPage(false);
    setShowJoinForm(false);
  };

  const handleCommunityBack = () => {
    setShowCommunity(false);
  };

  const handleLogoHome = () => {
    if (isGuestMode) {
      setShowJoinForm(false);
      setAuthView('login');
    } else {
      setActiveTab('home');
    }
  };

  const handleProfileClick = () => {
    if (isGuestMode) {
      setIsProfileMenuOpen((isOpen) => !isOpen);
      return;
    }

    setShowMyPage(true);
  };

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false);
    await signOut();
  };

  return (
    <header className="sticky top-0 z-20 flex min-h-[var(--header-height)] items-center justify-between bg-surface-card/80 px-4 py-3 shadow-sm backdrop-blur-xl animate-fadeIn">
      {isCenteredSubPage ? (
        <div className="relative w-full flex items-center justify-center h-10">
          <button
            type="button"
            aria-label={`${subPageTitle} 뒤로가기`}
            onClick={handleBack}
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full text-secondary transition-all hover:bg-surface-hover hover:text-primary active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-bold text-primary select-none">
            {subPageTitle}
          </h1>
          <div className="absolute right-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 hover:bg-surface-hover rounded-full active:scale-90 transition-all text-secondary"
              aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
              title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      ) : showCommunity ? (
        <>
          <LogoHomeButton teamName={displayedTeamName} logoUrl={teamLogoUrl} onClick={handleLogoHome} isGuestMode={isGuestMode} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 hover:bg-surface-hover rounded-full active:scale-90 transition-all text-secondary"
              aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
              title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              type="button"
              aria-label="커뮤니티 뒤로가기"
              onClick={handleCommunityBack}
              className="flex h-10 w-10 items-center justify-center rounded-full text-secondary transition-all hover:bg-surface-hover hover:text-primary active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
        </>
      ) : (
        <>
          <LogoHomeButton teamName={displayedTeamName} logoUrl={teamLogoUrl} onClick={handleLogoHome} isGuestMode={isGuestMode} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 hover:bg-surface-hover rounded-full active:scale-90 transition-all text-secondary"
              aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
              title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
            >
              {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
            </button>

            {shouldShowProfile && (
              <>
                {!isGuestMode ? (
                  <button
                    type="button"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-1.5 hover:bg-surface-hover rounded-full active:scale-90 transition-all text-secondary"
                    aria-label="알림 열기"
                  >
                    <Bell size={22} />
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-matchst-live rounded-full ring-2 ring-surface-card" />
                  </button>
                ) : null}

                <div ref={profileMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className="hover:ring-2 hover:ring-green-300 rounded-full active:scale-90 transition-all"
                    aria-label={isGuestMode ? '계정 메뉴 열기' : '마이페이지 열기'}
                    aria-expanded={isGuestMode ? isProfileMenuOpen : undefined}
                  >
                    <Image
                      src={avatarSrc}
                      alt="프로필"
                      width={34}
                      height={34}
                      sizes="34px"
                      loading="eager"
                      priority
                      className={
                        hasCustomPhoto
                          ? 'rounded-full bg-surface-hover object-cover'
                          : 'rounded-full bg-surface-elevated object-contain p-0.5'
                      }
                      style={{ width: 34, height: 34 }}
                      unoptimized
                    />
                  </button>

                  {isGuestMode && isProfileMenuOpen ? (
                    <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-border-subtle bg-surface-card p-3 shadow-xl animate-slideDown">
                      <p className="truncate text-xs font-black text-primary">{profileName}</p>
                      {profileEmail ? (
                        <p className="mt-0.5 truncate text-[11px] font-bold text-tertiary">{profileEmail}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-result-loss/10 px-3 py-2 text-xs font-black text-result-loss transition-all hover:bg-result-loss/20 active:scale-[0.98]"
                      >
                        <LogOut size={14} />
                        로그아웃
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </header>
  );
}

function getAuthDisplayName(authUser: ReturnType<typeof useAuthStore.getState>['authUser']) {
  const metadata = authUser?.user_metadata;
  const displayName = metadata?.full_name || metadata?.name || metadata?.display_name;
  return typeof displayName === 'string' && displayName.trim() ? displayName.trim() : null;
}

function getAuthAvatarUrl(authUser: ReturnType<typeof useAuthStore.getState>['authUser']) {
  const avatarUrl = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;
  return typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl : null;
}

function LogoHomeButton({
  teamName,
  logoUrl,
  onClick,
  isGuestMode,
}: {
  teamName: string;
  logoUrl: string | null;
  onClick: () => void;
  isGuestMode: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xl font-black tracking-tight text-primary">
      <button
        type="button"
        aria-label={isGuestMode ? `${teamName} 로그인 화면으로 이동` : `${teamName} 홈으로 이동`}
        onClick={onClick}
        className="group flex h-[36px] w-[36px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-card ring-1 ring-border-subtle transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:bg-surface-hover hover:shadow-md hover:ring-green-200 active:translate-y-0 active:scale-95"
      >
        <TeamEmblem teamName={teamName} logoUrl={isGuestMode ? null : logoUrl} size={44} className="shrink-0 scale-[1.08] transition-transform duration-200 group-hover:rotate-[-3deg]" />
      </button>
      <span className="truncate">{teamName}</span>
    </div>
  );
}
