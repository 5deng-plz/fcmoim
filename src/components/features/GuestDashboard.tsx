'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, Shield, Trophy, Users } from 'lucide-react';
import TeamEmblem from '@/components/brand/TeamEmblem';
import AttendeeList from '@/components/features/AttendeeList';
import { getScheduleEventTheme, type ScheduleEventThemeType } from '@/components/features/scheduleEventTheme';
import { useAppStore } from '@/stores/useAppStore';
import { appConfig } from '@/config/app.config';
import {
  fetchMembershipSnapshot,
  fetchPublicClubDetail,
  type PublicClubDetail,
} from '@/stores/membershipClient';
import { useToastStore } from '@/stores/useToastStore';
import type { UserStatus } from '@/types';

type GuestDashboardProps = {
  onOpenJoinRequest?: (input: { clubId: string; status: 'pending' | 'new' }) => void;
  onCreatedClub?: (clubId: string) => Promise<void>;
};

export default function GuestDashboard({
  onOpenJoinRequest,
  onCreatedClub,
}: GuestDashboardProps = {}) {
  const {
    isAuthenticated,
    clearJoinIntent,
    setAuthView,
    setJoinIntent,
    setShowJoinForm,
    userStatus,
    setUserStatus,
  } = useAppStore();
  const { showToast } = useToastStore();
  const [clubDetail, setClubDetail] = useState<PublicClubDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    fetchPublicClubDetail(appConfig.defaultClubId)
      .then((detail) => {
        if (!isActive) return;
        setClubDetail(detail ?? null);
      })
      .catch((error) => {
        console.error('[FC Moim] Public club load failed:', error);
        showToast('클럽 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [showToast]);

  const selectedClub = useMemo(
    () => ({ id: appConfig.defaultClubId, name: clubDetail?.name || 'FC Guppy' }),
    [clubDetail],
  );

  const handleJoin = async () => {
    if (!isAuthenticated) {
      setJoinIntent({ clubId: appConfig.defaultClubId });
      setShowJoinForm(false);
      setAuthView('login');
      showToast('입단을 위해 로그인이 먼저 필요합니다. 로그인해주세요.');
      return;
    }

    try {
      const snapshot = await fetchMembershipSnapshot();
      if (snapshot.membershipState === 'new') {
        setJoinIntent({ clubId: appConfig.defaultClubId });
        if (onOpenJoinRequest) {
          onOpenJoinRequest({ clubId: appConfig.defaultClubId, status: 'new' });
          return;
        }
        setUserStatus('guest');
        setShowJoinForm(true);
        return;
      }
      if (snapshot.membershipState === 'approved') return;

      setJoinIntent({ clubId: appConfig.defaultClubId });
      if (snapshot.membershipState === 'pending' && onOpenJoinRequest) {
        onOpenJoinRequest({ clubId: appConfig.defaultClubId, status: 'pending' });
        return;
      }
      setUserStatus(snapshot.membershipState);
      setShowJoinForm(true);
    } catch (error) {
      console.error('[FC Moim] Membership snapshot failed:', error);
      showToast(error instanceof Error ? error.message : '멤버십 상태를 확인하지 못했습니다.');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
      <div className="p-4 space-y-5 pb-[calc(var(--bottom-nav-height,72px)+32px)]">
        {userStatus === 'pending' ? (
          <button
            type="button"
            onClick={() => {
              setJoinIntent({ clubId: appConfig.defaultClubId });
              if (onOpenJoinRequest) {
                onOpenJoinRequest({ clubId: appConfig.defaultClubId, status: 'pending' });
                return;
              }
              setUserStatus('pending');
              setShowJoinForm(true);
            }}
            className="w-full rounded-2xl border border-highlight-amber/30 bg-glass-bg/70 px-4 py-3 text-left shadow-sm backdrop-blur-xl transition-all active:scale-[0.99]"
          >
            <span className="block text-xs font-black text-highlight-amber">승인 대기 중</span>
            <span className="mt-1 block text-sm font-bold text-gray-900">
              현재 FC Guppy에 보낸 입단신청이 승인 대기 중입니다.
            </span>
            <span className="mt-1 block text-xs font-semibold text-gray-500">상세 보기</span>
          </button>
        ) : null}

        <section className="space-y-4">
          <div className="text-center py-5">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 shadow-sm">
              <TeamEmblem teamName={clubDetail?.name || 'FC Guppy'} size={38} />
            </div>
            <h1 className="mt-3 text-xl font-black text-gray-900">{clubDetail?.name || 'FC Guppy'}</h1>
            <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">
              {clubDetail?.description || 'FC Guppy 공식 클럽에 오신 것을 환영합니다.'}
            </p>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm font-bold text-gray-400">클럽 정보를 불러오는 중입니다</div>
          ) : clubDetail ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Metric icon={<Users size={16} />} label="현재 멤버" value={`${clubDetail.memberCount}`} />
                <Metric icon={<Trophy size={16} />} label="시즌 경기" value={`${clubDetail.recentMatchCount}`} />
                <Metric icon={<CalendarDays size={16} />} label="최근 경기" value={formatRecentMatchDate(clubDetail.recentMatches?.[0]?.date)} />
              </div>

              <div className="rounded-2xl border border-glass-border bg-glass-bg/70 p-4 shadow-sm backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-green-600" />
                  <h3 className="text-sm font-black text-gray-900">최근 경기 요약</h3>
                </div>
                <div className="space-y-2">
                  {(clubDetail.recentMatches || []).slice(0, 3).map((match) => (
                    <RecentMatchSummaryCard key={match.id} match={match} />
                  ))}
                  {(clubDetail.recentMatches || []).length === 0 ? (
                    <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-xs font-bold text-gray-400">
                      공개 가능한 최근 경기가 아직 없어요
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>

      {userStatus !== 'approved' ? (
        <div className="sticky bottom-[calc(var(--bottom-nav-height,72px)+8px)] z-30 px-4 pb-3 pt-5 bg-gradient-to-t from-surface-bg via-surface-bg/90 to-transparent">
          <button
            onClick={() => void handleJoin()}
            className="w-full rounded-2xl bg-brand-primary px-5 py-4 text-sm font-black text-white shadow-lg shadow-brand-primary/20 transition-all hover:bg-brand-primary-hover active:scale-[0.98]"
          >
            {getJoinButtonLabel(userStatus)}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getJoinButtonLabel(status?: UserStatus) {
  if (status === 'pending') return '입단신청 완료 (승인 대기 중)';
  return '입단신청 시작';
}

function RecentMatchSummaryCard({ match }: { match: PublicClubDetail['recentMatches'][number] }) {
  const theme = getScheduleEventTheme(getPublicMatchThemeType(match.type));

  return (
    <div className={`rounded-lg border px-3 py-2 ${theme.cardClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-gray-800">{match.title}</p>
          <p className="text-[11px] font-medium text-gray-500">{match.location}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-[11px] font-bold text-gray-500">
            {new Date(match.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          </span>
          <span className={`mt-0.5 block text-[11px] font-black ${theme.comment.text}`}>
            {formatMatchResult(match)}
          </span>
        </div>
      </div>
      <AttendeeList count={match.attendeeCount} total={match.attendeeTotal} />
    </div>
  );
}

function getPublicMatchThemeType(type: string): ScheduleEventThemeType {
  if (type === 'match' || type === 'vote_match' || type === 'training' || type === 'seminar' || type === 'etc') {
    return type;
  }

  return 'etc';
}

function formatRecentMatchDate(date?: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function formatMatchResult(match: PublicClubDetail['recentMatches'][number]) {
  if (match.ourScore !== null && match.oppScore !== null) {
    return `${match.ourScore} : ${match.oppScore}`;
  }

  if (match.status === 'finished') return '결과 대기';
  if (match.status === 'locker_room') return '라커룸';
  return '확정';
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-glass-border bg-glass-bg/70 p-3 text-center shadow-sm backdrop-blur-xl">
      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center text-green-600">
        {icon}
      </div>
      <span className="block truncate text-base font-black text-gray-900">{value}</span>
      <p className="text-[9px] font-medium text-gray-400">{label}</p>
    </div>
  );
}
