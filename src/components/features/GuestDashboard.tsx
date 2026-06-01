'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, ChevronRight, Shield, Trophy, Users } from 'lucide-react';
import TeamEmblem from '@/components/brand/TeamEmblem';
import AttendeeList from '@/components/features/AttendeeList';
import { getScheduleEventTheme, type ScheduleEventThemeType } from '@/components/features/scheduleEventTheme';
import { useAppStore } from '@/stores/useAppStore';
import {
  fetchMembershipSnapshot,
  fetchPublicClubDetail,
  fetchPublicClubs,
  type PublicClubDetail,
  type PublicClubSummary,
} from '@/stores/membershipClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';

export default function GuestDashboard() {
  const {
    isAuthenticated,
    clearJoinIntent,
    selectedJoinClubId,
    setAuthView,
    setJoinIntent,
    setSelectedJoinClubId,
    setShowJoinForm,
    setUserStatus,
  } = useAppStore();
  const { switchClub } = useAuthStore();
  const { showToast } = useToastStore();
  const [clubs, setClubs] = useState<PublicClubSummary[]>([]);
  const [clubDetail, setClubDetail] = useState<PublicClubDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    fetchPublicClubs()
      .then((publicClubs) => {
        if (!isActive) return;
        setClubs(publicClubs);
        const selectedClub = publicClubs.find((club) => club.id === selectedJoinClubId) || publicClubs[0];
        if (selectedClub) {
          setSelectedJoinClubId(selectedClub.id);
          return fetchPublicClubDetail(selectedClub.id);
        }
        return null;
      })
      .then((detail) => {
        if (!isActive) return;
        setClubDetail(detail ?? null);
      })
      .catch((error) => {
        console.error('[FC Moim] Public club load failed:', error);
        showToast('팀 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedJoinClubId, setSelectedJoinClubId, showToast]);

  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedJoinClubId) || clubs[0] || null,
    [clubs, selectedJoinClubId],
  );

  const handleSelectClub = async (clubId: string) => {
    setSelectedJoinClubId(clubId);
    setIsLoading(true);
    try {
      setClubDetail(await fetchPublicClubDetail(clubId));
    } catch (error) {
      console.error('[FC Moim] Public club detail failed:', error);
      showToast('팀 상세를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedClub) {
      return;
    }

    setSelectedJoinClubId(selectedClub.id);
    if (!isAuthenticated) {
      setJoinIntent({ clubId: selectedClub.id });
      setShowJoinForm(false);
      setAuthView('login');
      showToast('입단을 위해 로그인이 먼저 필요합니다. 로그인해주세요.');
      return;
    }

    try {
      const snapshot = await fetchMembershipSnapshot(selectedClub.id);
      if (snapshot.membershipState === 'new') {
        setJoinIntent({ clubId: selectedClub.id });
        setUserStatus('guest');
        setShowJoinForm(true);
        return;
      }
      if (snapshot.membershipState === 'approved') {
        await switchClub(selectedClub.id);
        clearJoinIntent();
        showToast('이미 이 팀의 멤버입니다.');
        return;
      }

      setJoinIntent({ clubId: selectedClub.id });
      setUserStatus(snapshot.membershipState);
      setShowJoinForm(true);
    } catch (error) {
      console.error('[FC Moim] Membership snapshot failed:', error);
      showToast(error instanceof Error ? error.message : '멤버십 상태를 확인하지 못했습니다.');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
      <div className="p-4 space-y-5 pb-24">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">팀 둘러보기</h2>
            <span className="text-[11px] font-bold text-gray-400">{clubs.length}개 팀</span>
          </div>

          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => void handleSelectClub(club.id)}
              className={`w-full rounded-xl border bg-white p-3 text-left transition-all active:scale-[0.99] ${
                selectedClub?.id === club.id ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50">
                  <TeamEmblem teamName={club.name} size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-gray-900">{club.name}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs font-medium text-gray-400">
                    {club.description || '공개 소개가 준비 중입니다.'}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </button>
          ))}
          {!isLoading && clubs.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-10 text-center">
              <p className="text-sm font-black text-gray-900">공개된 팀이 아직 없어요</p>
              <p className="mt-1 text-xs font-medium text-gray-400">
                입단신청은 공개 팀이 등록된 뒤 시작할 수 있습니다.
              </p>
            </div>
          ) : null}
        </section>

        {isLoading ? (
          <div className="py-16 text-center text-sm font-bold text-gray-400">팀 정보를 불러오는 중입니다</div>
        ) : clubDetail ? (
          <section className="space-y-4">
            <div className="text-center py-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                <TeamEmblem teamName={clubDetail.name} size={38} />
              </div>
              <h1 className="mt-3 text-xl font-black text-gray-900">{clubDetail.name}</h1>
              <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">
                {clubDetail.description || '팀 소개가 준비 중입니다.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Metric icon={<Users size={16} />} label="현재 멤버" value={`${clubDetail.memberCount}`} />
              <Metric icon={<Trophy size={16} />} label="시즌 경기" value={`${clubDetail.recentMatchCount}`} />
              <Metric icon={<CalendarDays size={16} />} label="최근 경기" value={formatRecentMatchDate(clubDetail.recentMatches[0]?.date)} />
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Shield size={16} className="text-green-600" />
                <h3 className="text-sm font-black text-gray-900">최근 경기 요약</h3>
              </div>
              <div className="space-y-2">
                {clubDetail.recentMatches.slice(0, 3).map((match) => (
                  <RecentMatchSummaryCard key={match.id} match={match} />
                ))}
                {clubDetail.recentMatches.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-xs font-bold text-gray-400">
                    공개 가능한 최근 경기가 아직 없어요
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {selectedClub ? (
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-8">
        <button
          onClick={() => void handleJoin()}
          className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-gray-800 active:scale-[0.98] transition-all shadow-lg"
        >
          입단신청 시작
        </button>
      </div>
      ) : null}
    </div>
  );
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
    <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center text-green-600">
        {icon}
      </div>
      <span className="block truncate text-base font-black text-gray-900">{value}</span>
      <p className="text-[9px] font-medium text-gray-400">{label}</p>
    </div>
  );
}
