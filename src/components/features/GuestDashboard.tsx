'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { CalendarDays, ChevronRight, Plus, Shield, Trophy, Users } from 'lucide-react';
import TeamEmblem from '@/components/brand/TeamEmblem';
import AttendeeList from '@/components/features/AttendeeList';
import { getScheduleEventTheme, type ScheduleEventThemeType } from '@/components/features/scheduleEventTheme';
import Modal from '@/components/ui/Modal';
import { useAppStore } from '@/stores/useAppStore';
import { appConfig } from '@/config/app.config';
import {
  checkClubSlug,
  createClub,
  fetchClubCreationEligibility,
  fetchClubMemberships,
  fetchMembershipSnapshot,
  fetchPublicClubDetail,
  type PublicClubDetail,
  type PublicClubSummary,
} from '@/stores/membershipClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import type { MembershipStatus } from '@/types/domain';

type JoinRequestTargetStatus = Extract<MembershipStatus, 'pending'> | 'new';

type GuestDashboardProps = {
  onOpenJoinRequest?: (input: { clubId: string; status: JoinRequestTargetStatus }) => void;
  onCreatedClub?: (clubId: string) => Promise<void>;
};

export default function GuestDashboard({
  onOpenJoinRequest,
  onCreatedClub,
}: GuestDashboardProps = {}) {
  const {
    availableClubs,
    isAuthenticated,
    clearJoinIntent,
    selectedJoinClubId,
    setAuthView,
    setActiveTab,
    setAvailableClubs,
    setJoinIntent,
    setSelectedJoinClubId,
    setShowJoinForm,
    setUserStatus,
  } = useAppStore();
  const { switchClub } = useAuthStore();
  const { showToast } = useToastStore();
  const [clubDetail, setClubDetail] = useState<PublicClubDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    const clubId = selectedJoinClubId || appConfig.defaultClubId;
    setSelectedJoinClubId(clubId);

    fetchPublicClubDetail(clubId)
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
  }, [selectedJoinClubId, setSelectedJoinClubId, showToast]);

  const selectedClub = useMemo(
    () => {
      const clubId = selectedJoinClubId || appConfig.defaultClubId;
      return { id: clubId, name: clubDetail?.name || 'FC Guppy' };
    },
    [selectedJoinClubId, clubDetail],
  );
  const selectedMembership = useMemo(
    () => availableClubs.find((club) => club.clubId === selectedClub?.id) ?? null,
    [availableClubs, selectedClub?.id],
  );
  const pendingMembership = useMemo(
    () => availableClubs.find((club) => club.status === 'pending') ?? null,
    [availableClubs],
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
        if (onOpenJoinRequest) {
          onOpenJoinRequest({ clubId: selectedClub.id, status: 'new' });
          return;
        }
        setUserStatus('guest');
        setShowJoinForm(true);
        return;
      }
      if (snapshot.membershipState === 'approved') return;

      setJoinIntent({ clubId: selectedClub.id });
      if (snapshot.membershipState === 'pending' && onOpenJoinRequest) {
        onOpenJoinRequest({ clubId: selectedClub.id, status: 'pending' });
        return;
      }
      setUserStatus(snapshot.membershipState);
      setShowJoinForm(true);
    } catch (error) {
      console.error('[FC Moim] Membership snapshot failed:', error);
      showToast(error instanceof Error ? error.message : '멤버십 상태를 확인하지 못했습니다.');
    }
  };

  const handleOpenCreateClub = async () => {
    if (!isAuthenticated) {
      clearJoinIntent();
      setShowJoinForm(false);
      setAuthView('login');
      showToast('팀 생성을 위해 로그인이 먼저 필요합니다.');
      return;
    }

    try {
      const eligibility = await fetchClubCreationEligibility();
      if (!eligibility.canCreate) {
        showToast('계정당 최대 2개의 팀만 생성할 수 있습니다.');
        return;
      }
      setIsCreateModalOpen(true);
    } catch (error) {
      console.error('[FC Moim] Club creation eligibility failed:', error);
      showToast(error instanceof Error ? error.message : '팀 생성 가능 여부를 확인하지 못했습니다.');
    }
  };

  const handleCreatedClub = async (clubId: string) => {
    const memberships = await fetchClubMemberships();
    setAvailableClubs(memberships);
    clearJoinIntent();
    setShowJoinForm(false);
    if (onCreatedClub) {
      await onCreatedClub(clubId);
      return;
    }
    setActiveTab('home');
    await switchClub(clubId);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
      <div className="p-4 space-y-5 pb-[calc(var(--bottom-nav-height,72px)+32px)]">
        {pendingMembership ? (
          <button
            type="button"
            onClick={() => {
              setSelectedJoinClubId(pendingMembership.clubId);
              setJoinIntent({ clubId: pendingMembership.clubId });
              if (onOpenJoinRequest) {
                onOpenJoinRequest({ clubId: pendingMembership.clubId, status: 'pending' });
                return;
              }
              setUserStatus('pending');
              setShowJoinForm(true);
            }}
            className="w-full rounded-2xl border border-highlight-amber/30 bg-glass-bg/70 px-4 py-3 text-left shadow-sm backdrop-blur-xl transition-all active:scale-[0.99]"
          >
            <span className="block text-xs font-black text-highlight-amber">승인 대기 중</span>
            <span className="mt-1 block text-sm font-bold text-gray-900">
              현재 {pendingMembership.clubName}에 보낸 입단신청이 승인 대기 중입니다.
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
                <Metric icon={<CalendarDays size={16} />} label="최근 경기" value={formatRecentMatchDate(clubDetail.recentMatches[0]?.date)} />
              </div>

              <div className="rounded-2xl border border-glass-border bg-glass-bg/70 p-4 shadow-sm backdrop-blur-xl">
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
            </>
          ) : null}
        </section>
      </div>

      {selectedClub && selectedMembership?.status !== 'approved' ? (
        <div className="sticky bottom-[calc(var(--bottom-nav-height,72px)+8px)] z-30 px-4 pb-3 pt-5 bg-gradient-to-t from-surface-bg via-surface-bg/90 to-transparent">
          <button
            onClick={() => void handleJoin()}
            className="w-full rounded-2xl bg-brand-primary px-5 py-4 text-sm font-black text-white shadow-lg shadow-brand-primary/20 transition-all hover:bg-brand-primary-hover active:scale-[0.98]"
          >
            {getJoinButtonLabel(selectedMembership?.status)}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ClubCreateModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (clubId: string) => Promise<void>;
}) {
  const { showToast } = useToastStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [slugCheck, setSlugCheck] = useState<{
    slug: string;
    status: 'checking' | 'available' | 'taken';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedName = name.trim();
  const normalizedSlug = normalizeClubSlugInput(slug);
  const normalizedDescription = description.trim();
  const isNameValid = normalizedName.length >= 3 && normalizedName.length <= 50;
  const isSlugFormatValid = isValidClubSlug(normalizedSlug);
  const isDescriptionValid = normalizedDescription.length >= 1 && normalizedDescription.length <= 200;
  const slugStatus = getSlugStatus(normalizedSlug, isSlugFormatValid, slugCheck);
  const canSubmit = isNameValid && isSlugFormatValid && slugStatus === 'available' && isDescriptionValid && !isSubmitting;

  useEffect(() => {
    if (!isOpen || !normalizedSlug || !isSlugFormatValid) return;

    let isActive = true;
    const timer = window.setTimeout(() => {
      setSlugCheck({ slug: normalizedSlug, status: 'checking' });
      checkClubSlug(normalizedSlug)
        .then((result) => {
          if (isActive) setSlugCheck({ slug: normalizedSlug, status: result.exists ? 'taken' : 'available' });
        })
        .catch((error) => {
          console.error('[FC Moim] Club slug check failed:', error);
          if (isActive) setSlugCheck(null);
        });
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, isSlugFormatValid, normalizedSlug]);

  const resetAndClose = () => {
    setName('');
    setSlug('');
    setDescription('');
    setSlugCheck(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const result = await createClub({
        name: normalizedName,
        slug: normalizedSlug,
        description: normalizedDescription,
      });
      resetAndClose();
      await onCreated(result.clubId);
      showToast('팀이 생성되었습니다.');
    } catch (error) {
      console.error('[FC Moim] Club creation failed:', error);
      showToast(error instanceof Error ? error.message : '팀을 생성하지 못했습니다.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="팀 만들기" isOpen={isOpen} onClose={resetAndClose} presentation="sheet">
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block">
          <span className="text-xs font-black text-primary">팀 이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />
          {name && !isNameValid ? (
            <span className="mt-1 block text-[11px] font-bold text-result-loss">팀 이름은 3자 이상 입력해주세요.</span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-xs font-black text-primary">웹 주소용 영문 아이디</span>
          <input
            value={slug}
            onChange={(event) => setSlug(normalizeClubSlugInput(event.target.value))}
            maxLength={50}
            placeholder="www.fcguppy.com/{team-id}"
            className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />
          <SlugFeedback status={slugStatus} />
        </label>

        <label className="block">
          <span className="text-xs font-black text-primary">팀 소개</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={200}
            rows={4}
            className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />
          {description && !isDescriptionValid ? (
            <span className="mt-1 block text-[11px] font-bold text-result-loss">팀 소개를 200자 이하로 입력해주세요.</span>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-black text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-action-disabled disabled:text-tertiary"
        >
          {isSubmitting ? '생성 중' : '팀 생성하기'}
        </button>
      </form>
    </Modal>
  );
}

function SlugFeedback({ status }: { status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' }) {
  if (status === 'idle') return null;
  if (status === 'checking') {
    return <span className="mt-1 block text-[11px] font-bold text-gray-400">주소를 확인하는 중입니다.</span>;
  }
  if (status === 'available') {
    return <span className="mt-1 block text-[11px] font-bold text-green-600">사용 가능한 주소입니다.</span>;
  }
  if (status === 'taken') {
    return <span className="mt-1 block text-[11px] font-bold text-result-loss">이미 사용 중인 주소입니다.</span>;
  }
  return <span className="mt-1 block text-[11px] font-bold text-result-loss">영문 소문자, 숫자, 하이픈으로 3자 이상 입력해주세요.</span>;
}

function getSlugStatus(
  slug: string,
  isFormatValid: boolean,
  slugCheck: { slug: string; status: 'checking' | 'available' | 'taken' } | null,
): 'idle' | 'checking' | 'available' | 'taken' | 'invalid' {
  if (!slug) return 'idle';
  if (!isFormatValid) return 'invalid';
  if (slugCheck?.slug === slug) return slugCheck.status;
  return 'checking';
}

function normalizeClubSlugInput(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function isValidClubSlug(value: string) {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(value);
}

function getJoinButtonLabel(status?: MembershipStatus) {
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
