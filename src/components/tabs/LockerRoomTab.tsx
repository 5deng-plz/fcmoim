'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, LoaderCircle, ShieldCheck, Share2, UserCheck, UserCog, UserX, Users, Medal } from 'lucide-react';
import Image from 'next/image';
import TeamEmblem from '@/components/brand/TeamEmblem';
import Modal from '@/components/ui/Modal';

import ConditionIcon from '@/components/ui/ConditionIcon';
import type { ConditionLevel } from '@/components/ui/ConditionIcon';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import PlayerAbilityPanel, { type PlayerAbilityPanelSeasonRecord } from '@/components/ui/PlayerAbilityPanel';
import {
  fetchApprovedMemberships,
  fetchClubSettings,
  fetchPendingMemberships,
  patchClubSettings,
  reviewMembership,
  updateMembershipRole,
  uploadClubLogo,
  withdrawMembership,
  type ApprovedMembership,
  type PendingMembershipReview,
} from '@/stores/membershipClient';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRecordsStore } from '@/stores/useRecordsStore';
import { useToastStore } from '@/stores/useToastStore';

export default function LockerRoomTab() {
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const { activeClubId, availableClubs, teamLogoUrl, teamName, userRole } = useAppStore();
  const records = useRecordsStore((state) => state.records);
  const recordsStatus = useRecordsStore((state) => state.recordsStatus);
  const loadRecords = useRecordsStore((state) => state.loadRecords);
  const { showToast } = useToastStore();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingMembers, setPendingMembers] = useState<PendingMembershipReview[]>([]);
  const [squadMembers, setSquadMembers] = useState<ApprovedMembership[]>([]);
  const [isLoadingSquad, setIsLoadingSquad] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [clubDescription, setClubDescription] = useState('');
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [isClubPublic, setIsClubPublic] = useState(true);
  const [isSavingClubSettings, setIsSavingClubSettings] = useState(false);
  const [isUploadingClubLogo, setIsUploadingClubLogo] = useState(false);
  const squadCount = squadMembers.length;
  const canReview = userRole === 'admin' || userRole === 'operator';
  const canAssignOperator = userRole === 'admin';
  const topMatchPointRanks = useMemo(() => buildTopMatchPointRanks(squadMembers), [squadMembers]);
  const seasonRecordByMembershipId = useMemo(() => {
    if (!Array.isArray(records?.rankingRows)) return new Map();
    return new Map(records.rankingRows.map((row) => [row.membershipId, row]));
  }, [records]);
  const sortedSquadMembers = useMemo(
    () => sortSquadMembers(squadMembers, topMatchPointRanks),
    [squadMembers, topMatchPointRanks],
  );
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [photoMember, setPhotoMember] = useState<ApprovedMembership | null>(null);
  const [memberActionModal, setMemberActionModal] = useState<MemberActionModalState>(null);
  const [withdrawConfirmName, setWithdrawConfirmName] = useState('');

  useEffect(() => {
    if (!activeClubId || recordsStatus !== 'idle') return;

    void loadRecords(activeClubId).catch((error) => {
      console.error('[FC Moim] Locker season records failed:', error);
    });
  }, [activeClubId, loadRecords, recordsStatus]);

  useEffect(() => {
    let isActive = true;

    if (memberProfile) {
      setIsLoadingSquad(true);
      fetchApprovedMemberships(activeClubId)
        .then((members) => {
          if (isActive) setSquadMembers(members);
        })
        .catch((error) => {
          console.error('[FC Moim] Approved memberships failed:', error);
          showToast('스쿼드 명단을 불러오지 못했습니다.');
        })
        .finally(() => {
          if (isActive) setIsLoadingSquad(false);
        });
    } else {
      setSquadMembers([]);
      setIsLoadingSquad(false);
    }

    return () => {
      isActive = false;
    };
  }, [activeClubId, memberProfile, showToast]);

  useEffect(() => {
    if (!canReview) return;

    let isActive = true;
    setIsLoadingPending(true);
    fetchPendingMemberships(activeClubId)
      .then((members) => {
        if (isActive) setPendingMembers(members);
      })
      .catch((error) => {
        console.error('[FC Moim] Pending memberships failed:', error);
        showToast('입단 대기 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (isActive) setIsLoadingPending(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeClubId, canReview, showToast]);

  useEffect(() => {
    if (!canReview) return;

    let isActive = true;
    fetchClubSettings(activeClubId)
      .then((club) => {
        if (!isActive) return;
        setClubDescription(club.description ?? '');
        setClubLogoUrl(club.logoUrl);
        setIsClubPublic(club.isPublic);
      })
      .catch((error) => {
        console.error('[FC Moim] Club settings load failed:', error);
        showToast('팀 설정을 불러오지 못했습니다.');
      });

    return () => {
      isActive = false;
    };
  }, [activeClubId, canReview, showToast]);

  useEffect(() => {
    setClubLogoUrl(teamLogoUrl);
  }, [teamLogoUrl]);

  const handleReview = async (membershipId: string, decision: 'approved' | 'rejected') => {
    try {
      setReviewingId(membershipId);
      await reviewMembership({ clubId: activeClubId, membershipId, decision });
      setPendingMembers((members) => members.filter((member) => member.id !== membershipId));
      showToast(decision === 'approved' ? '입단신청을 승인했어요.' : '입단신청을 반려했어요.');
    } catch (error) {
      console.error('[FC Moim] Membership review failed:', error);
      showToast(error instanceof Error ? error.message : '입단신청 심사를 처리하지 못했습니다.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleChangeRole = async (membershipId: string, role: 'operator' | 'member') => {
    try {
      setChangingRoleId(membershipId);
      const membership = await updateMembershipRole({ clubId: activeClubId, membershipId, role });
      setSquadMembers((members) =>
        members.map((member) => (member.id === membership.id ? membership : member)),
      );
      showToast(role === 'operator' ? '운영진 권한을 부여했어요.' : '운영진 권한을 회수했어요.');
    } catch (error) {
      console.error('[FC Moim] Membership role change failed:', error);
      showToast(error instanceof Error ? error.message : '멤버십 권한을 변경하지 못했습니다.');
    } finally {
      setChangingRoleId(null);
    }
  };

  const handleSaveClubSettings = async () => {
    try {
      setIsSavingClubSettings(true);
      const club = await patchClubSettings({
        clubId: activeClubId,
        description: clubDescription,
        isPublic: isClubPublic,
      });
      setClubDescription(club.description ?? '');
      setIsClubPublic(club.isPublic);
      showToast('팀 공개 설정을 저장했어요.');
    } catch (error) {
      console.error('[FC Moim] Club settings save failed:', error);
      showToast(error instanceof Error ? error.message : '팀 설정을 저장하지 못했습니다.');
    } finally {
      setIsSavingClubSettings(false);
    }
  };

  const handleClubLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    try {
      setIsUploadingClubLogo(true);
      const club = await uploadClubLogo({ clubId: activeClubId, file });
      setClubLogoUrl(club.logoUrl);
      useAppStore.setState({
        teamLogoUrl: club.logoUrl,
        availableClubs: availableClubs.map((item) => (
          item.clubId === activeClubId ? { ...item, logoUrl: club.logoUrl } : item
        )),
      });
      showToast('팀 로고를 업로드했어요.');
    } catch (error) {
      console.error('[FC Moim] Club logo upload failed:', error);
      showToast(error instanceof Error ? error.message : '팀 로고를 업로드하지 못했습니다.');
    } finally {
      setIsUploadingClubLogo(false);
    }
  };

  const handleWithdrawMembership = async (member: ApprovedMembership) => {
    try {
      setWithdrawingId(member.id);
      await withdrawMembership({ clubId: activeClubId, membershipId: member.id });
      setSquadMembers((members) => members.filter((item) => item.id !== member.id));
      showToast(`${member.nickname} 회원을 탈퇴처리했어요.`);
    } catch (error) {
      console.error('[FC Moim] Membership withdrawal failed:', error);
      showToast(error instanceof Error ? error.message : '회원 탈퇴처리를 완료하지 못했습니다.');
    } finally {
      setWithdrawingId(null);
    }
  };

  const handleConfirmMemberAction = async () => {
    if (!memberActionModal) return;

    if (memberActionModal.mode === 'withdraw') {
      await handleWithdrawMembership(memberActionModal.member);
    } else {
      await handleChangeRole(
        memberActionModal.member.id,
        memberActionModal.mode === 'grant-operator' ? 'operator' : 'member',
      );
    }
    setMemberActionModal(null);
    setWithdrawConfirmName('');
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-20">
      {/* ─── 스쿼드 ─── */}
      <div className="flex justify-between items-center mb-2 px-1">
        <h2 className="text-lg font-extrabold text-primary flex items-center gap-2">
          <Users size={20} className="text-brand-primary" /> 스쿼드
        </h2>
        <span className="text-[10px] font-bold text-secondary bg-surface-hover px-2.5 py-1.5 rounded-md">
          총 {squadCount}명
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="flex min-h-[40px] w-full items-center gap-2 bg-surface-bg px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-secondary border-b border-border">
          <div className="flex w-12 shrink-0 items-center justify-center gap-1">
            <span className="w-[14px] shrink-0" />
            <span className="text-brand-primary font-mono font-black italic text-[10px]">OVR</span>
          </div>
          <div className="w-[44px] shrink-0" />
          <div className="flex-1 text-left">이름</div>
          <div className="w-10 text-center">컨디션</div>
          <div className="w-[74px] text-right">경기 Point</div>
          <div className="w-[14px] shrink-0" />
        </div>
        {isLoadingSquad ? (
          <div className="px-4 py-10 text-center text-xs font-bold text-tertiary">
            스쿼드 명단을 불러오는 중입니다
          </div>
        ) : squadMembers.length > 0 ? (
          <div className="divide-y divide-border">
            {sortedSquadMembers.map((member) => (
              <div key={member.id}>
                <div className="relative flex h-[50px] min-h-[50px] w-full items-center gap-2 px-3 py-0 transition-colors hover:bg-surface-hover/50 active:bg-surface-hover">
                  <button
                    type="button"
                    onClick={() => setExpandedMemberId((current) => (current === member.id ? null : member.id))}
                    className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary"
                    aria-expanded={expandedMemberId === member.id}
                    aria-controls={`member-detail-${member.id}`}
                    aria-label={`${member.nickname} 상세 정보`}
                  />
                  <div className="pointer-events-none relative z-0 flex w-12 shrink-0 items-center justify-center gap-1 text-center">
                    <MatchPointAward rank={topMatchPointRanks.get(member.id)} />
                    <span className="text-brand-primary font-mono font-black italic text-sm">
                      {member.ovr}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoMember(member)}
                    className="relative z-10 shrink-0 rounded-full transition-transform active:scale-95"
                    aria-label={`${member.nickname} 프로필 사진 크게 보기`}
                  >
                    <RoleAvatar member={member} size={38} />
                  </button>
                  <div className="pointer-events-none relative z-0 flex min-w-0 flex-1 items-center gap-2 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-primary">{member.nickname}</p>
                    </div>
                    <div className="flex w-10 justify-center">
                      <ConditionIcon level={getDisplayCondition()} size={18} />
                    </div>
                    <div className="w-[74px] text-right">
                      <span className="inline-flex items-center rounded-full bg-feedback-success-bg px-2 py-0.5 text-[11px] font-black text-feedback-success border border-feedback-success-border/30">
                      {member.matchPoints.toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-tertiary transition-transform ${expandedMemberId === member.id ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                {expandedMemberId === member.id ? (
                  <MemberProfileAccordion
                    member={member}
                    seasonRecord={seasonRecordByMembershipId.get(member.id) ?? null}
                    canManageMembers={canAssignOperator}
                    isSelf={member.id === memberProfile?.id}
                    changingRoleId={changingRoleId}
                    withdrawingId={withdrawingId}
                    onRoleAction={(target, mode) => {
                      setWithdrawConfirmName('');
                      setMemberActionModal({ mode, member: target });
                    }}
                    onWithdrawAction={(target) => {
                      setWithdrawConfirmName('');
                      setMemberActionModal({ mode: 'withdraw', member: target });
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-bg text-tertiary">
              <Users size={22} />
            </div>
            <p className="text-sm font-bold text-primary">등록된 스쿼드가 없어요</p>
          </div>
        )}
      </div>

      {canReview ? (
        <section className="rounded-xl border border-border bg-surface-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
              <ShieldCheck size={20} className="text-brand-primary" />
              팀 관리
            </h2>
            <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${
              isClubPublic
                ? 'bg-feedback-success-bg text-feedback-success border border-feedback-success-border/20'
                : 'border border-border bg-surface-hover text-tertiary'
            }`}>
              {isClubPublic ? '공개' : '비공개'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-bg px-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-card">
                  <TeamEmblem teamName={teamName} logoUrl={clubLogoUrl} size={56} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-primary">팀 로고</p>
                  <p className="mt-0.5 text-xs font-medium text-tertiary">PNG, JPG, WEBP · 2MB 이하</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isUploadingClubLogo}
                onClick={() => logoInputRef.current?.click()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-white transition-all hover:bg-brand-primary-hover active:scale-95 disabled:opacity-50"
                aria-label="팀 로고 업로드"
                title="팀 로고 업로드"
              >
                {isUploadingClubLogo ? <LoaderCircle size={18} className="animate-spin" /> : <Camera size={18} />}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleClubLogoChange}
                disabled={isUploadingClubLogo}
              />
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-secondary">팀 소개</span>
              <textarea
                value={clubDescription}
                onChange={(event) => setClubDescription(event.target.value)}
                className="min-h-24 w-full resize-none rounded-xl border border-border bg-surface-bg px-3 py-3 text-sm font-medium leading-relaxed text-primary outline-none transition-colors focus:border-brand-primary focus:bg-surface-card"
                maxLength={500}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl bg-surface-bg px-3 py-3">
              <span className="text-sm font-bold text-primary">팀 둘러보기 공개</span>
              <input
                type="checkbox"
                checked={isClubPublic}
                onChange={(event) => setIsClubPublic(event.target.checked)}
                className="h-5 w-5 accent-brand-primary"
              />
            </label>

            <button
              type="button"
              disabled={isSavingClubSettings}
              onClick={() => void handleSaveClubSettings()}
              className="w-full rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white transition-all hover:bg-brand-primary-hover active:scale-[0.98] disabled:opacity-50"
            >
              {isSavingClubSettings ? '저장 중' : '팀 설정 저장'}
            </button>

            <div className="rounded-xl bg-surface-bg p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-primary">입단 대기</h3>
                <span className="rounded-md bg-surface-card px-2.5 py-1 text-[10px] font-bold text-brand-primary">
                  {pendingMembers.length}명
                </span>
              </div>

              {isLoadingPending ? (
                <p className="py-6 text-center text-xs font-bold text-tertiary">신청자를 확인하는 중입니다</p>
              ) : pendingMembers.length > 0 ? (
                <div className="space-y-3">
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="rounded-xl bg-surface-card border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-primary">{member.nickname}</p>
                          <p className="mt-1 text-xs font-bold text-secondary">
                            {formatBody(member)} · {formatFoot(member.preferredFoot)}
                          </p>
                          <p className="mt-1 text-[11px] font-medium text-tertiary">
                            {new Date(member.createdAt).toLocaleDateString('ko-KR')} 신청
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            disabled={reviewingId === member.id}
                            onClick={() => void handleReview(member.id, 'approved')}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white transition-all hover:bg-brand-primary-hover active:scale-95 disabled:opacity-50"
                            aria-label={`${member.nickname} 승인`}
                            title="승인"
                          >
                            <UserCheck size={17} />
                          </button>
                          <button
                            type="button"
                            disabled={reviewingId === member.id}
                            onClick={() => void handleReview(member.id, 'rejected')}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-hover text-secondary transition-all hover:bg-border/30 active:scale-95 disabled:opacity-50"
                            aria-label={`${member.nickname} 반려`}
                            title="반려"
                          >
                            <UserX size={17} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-surface-card px-4 py-6 text-center text-xs font-bold text-tertiary border border-border">
                  대기 중인 입단신청이 없어요
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}
      <Modal
        title={getMemberActionModalTitle(memberActionModal)}
        isOpen={memberActionModal !== null}
        onClose={() => {
          setMemberActionModal(null);
          setWithdrawConfirmName('');
        }}
        presentation="dialog"
      >
        {memberActionModal ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-surface-bg p-3">
              <RoleAvatar member={memberActionModal.member} size={48} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-primary">{memberActionModal.member.nickname}</p>
                <p className="text-xs font-bold text-tertiary">
                  {getMemberActionModalDescription(memberActionModal)}
                </p>
              </div>
            </div>
            {memberActionModal.mode === 'withdraw' ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-feedback-error">
                  확인을 위해 회원 이름을 입력해주세요
                </span>
                <input
                  type="text"
                  value={withdrawConfirmName}
                  onChange={(event) => setWithdrawConfirmName(event.target.value)}
                  placeholder={memberActionModal.member.nickname}
                  className="w-full rounded-xl border border-feedback-error-border bg-feedback-error-bg px-3 py-2.5 text-sm font-bold text-primary outline-none transition-colors focus:border-feedback-error focus:bg-surface-card"
                  aria-label="탈퇴 처리 회원 이름 확인"
                />
              </label>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMemberActionModal(null)}
                className="rounded-xl bg-surface-hover px-4 py-3 text-sm font-semibold text-secondary transition-all hover:bg-border/30 active:scale-95"
              >
                취소
              </button>
              <button
                type="button"
                disabled={
                  isMemberActionBusy(memberActionModal, changingRoleId, withdrawingId) ||
                  (memberActionModal.mode === 'withdraw' && withdrawConfirmName !== memberActionModal.member.nickname)
                }
                onClick={() => void handleConfirmMemberAction()}
                className={`${getMemberActionConfirmClass(memberActionModal)} rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-action-disabled disabled:text-tertiary`}
              >
                {getMemberActionConfirmLabel(memberActionModal)}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
      <Modal
        title={photoMember?.nickname ?? '프로필 사진'}
        isOpen={photoMember !== null}
        onClose={() => setPhotoMember(null)}
        presentation="dialog"
      >
        {photoMember ? (
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface-bg">
            <Image
              src={photoMember.photoUrl || avatarSrcFor(photoMember)}
              alt={photoMember.nickname}
              fill
              sizes="min(640px, 92vw)"
              loading="eager"
              priority
              className="object-contain"
              unoptimized
            />
          </div>
        ) : null}
      </Modal>

    </div>
  );
}

type MemberActionMode = 'grant-operator' | 'revoke-operator' | 'withdraw';

type MemberActionModalState =
  | { mode: MemberActionMode; member: ApprovedMembership }
  | null;

function avatarSrcFor(member: ApprovedMembership) {
  return getFallbackAvatar(member.nickname || member.id);
}


function formatBody(member: PendingMembershipReview) {
  const height = member.heightCm ? `${member.heightCm}cm` : '-';
  const weight = member.weightKg ? `${member.weightKg}kg` : '-';
  return `${height} / ${weight}`;
}

function formatFoot(foot: PendingMembershipReview['preferredFoot']) {
  if (foot === 'left') return '왼발';
  if (foot === 'both') return '양발';
  return '오른발';
}

function buildTopMatchPointRanks(members: ApprovedMembership[]) {
  return new Map(
    [...members]
      .sort((left, right) => (
        right.matchPoints - left.matchPoints ||
        left.nickname.localeCompare(right.nickname, 'ko-KR') ||
        left.id.localeCompare(right.id)
      ))
      .slice(0, 3)
      .map((member, index) => [member.id, index + 1] as const),
  );
}

function sortSquadMembers(members: ApprovedMembership[], rankMap: Map<string, number>) {
  return [...members].sort((left, right) => {
    const leftRank = rankMap.get(left.id);
    const rightRank = rankMap.get(right.id);
    const rankOrder =
      (leftRank ?? 99) - (rightRank ?? 99) ||
      (leftRank ? -1 : 0) ||
      (rightRank ? 1 : 0);

    return (
      rankOrder ||
      right.matchPoints - left.matchPoints ||
      right.ovr - left.ovr ||
      left.nickname.localeCompare(right.nickname, 'ko-KR') ||
      left.id.localeCompare(right.id)
    );
  });
}

function getDisplayCondition(): ConditionLevel {
  return 'normal';
}

function MemberProfileAccordion({
  member,
  seasonRecord,
  canManageMembers,
  isSelf,
  changingRoleId,
  withdrawingId,
  onRoleAction,
  onWithdrawAction,
}: {
  member: ApprovedMembership;
  seasonRecord: PlayerAbilityPanelSeasonRecord | null;
  canManageMembers: boolean;
  isSelf: boolean;
  changingRoleId: string | null;
  withdrawingId: string | null;
  onRoleAction: (member: ApprovedMembership, mode: Extract<MemberActionMode, 'grant-operator' | 'revoke-operator'>) => void;
  onWithdrawAction: (member: ApprovedMembership) => void;
}) {
  const canChangeRole = canManageMembers && member.role !== 'admin';
  const canWithdraw = canManageMembers && member.role !== 'admin' && !isSelf;
  const roleMode = member.role === 'operator' ? 'revoke-operator' : 'grant-operator';

  return (
    <div id={`member-detail-${member.id}`} className="border-t border-border bg-surface-bg/30 px-4 py-4">
      <PlayerAbilityPanel
        stats={member.stats}
        ovr={member.ovr}
        preferredFoot={member.preferredFoot}
        position={member.position === 'FW' || member.position === 'MF' || member.position === 'DF' || member.position === 'GK' ? member.position : undefined}
        selectedTraitId={member.selectedTraitId}
        seasonRecord={seasonRecord}
        birthDate={member.birthDate}
        heightCm={member.heightCm}
        weightKg={member.weightKg}
      >

        {canChangeRole || canWithdraw ? (
          <div className="grid grid-cols-2 gap-2">
            {canChangeRole ? (
              <button
                type="button"
                disabled={changingRoleId === member.id}
                onClick={() => onRoleAction(member, roleMode)}
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50 ${
                  roleMode === 'grant-operator'
                    ? 'bg-brand-primary hover:bg-brand-primary-hover'
                    : 'bg-feedback-warning hover:brightness-110'
                }`}
              >
                <UserCog size={15} />
                {roleMode === 'grant-operator' ? '운영진 권한 부여' : '운영진 권한 회수'}
              </button>
            ) : null}
            {canWithdraw ? (
              <button
                type="button"
                disabled={withdrawingId === member.id}
                onClick={() => onWithdrawAction(member)}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-feedback-error px-3 py-2 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                <UserX size={15} />
                탈퇴 처리
              </button>
            ) : null}
          </div>
        ) : null}
      </PlayerAbilityPanel>
    </div>
  );
}



function getMemberActionModalTitle(modal: MemberActionModalState) {
  if (!modal) return '팀원 관리';
  if (modal.mode === 'withdraw') return '회원 탈퇴처리';
  return modal.mode === 'grant-operator' ? '운영진 권한 부여' : '운영진 권한 회수';
}

function getMemberActionModalDescription(modal: Exclude<MemberActionModalState, null>) {
  if (modal.mode === 'withdraw') return '이 회원을 탈퇴처리합니다';
  return modal.mode === 'grant-operator' ? '운영진 권한을 부여합니다' : '운영진 권한을 회수합니다';
}

function getMemberActionConfirmLabel(modal: Exclude<MemberActionModalState, null>) {
  if (modal.mode === 'withdraw') return '탈퇴처리';
  return modal.mode === 'grant-operator' ? '부여' : '회수';
}

function getMemberActionConfirmClass(modal: Exclude<MemberActionModalState, null>) {
  if (modal.mode === 'withdraw') return 'bg-feedback-error hover:brightness-110';
  if (modal.mode === 'grant-operator') return 'bg-brand-primary hover:bg-brand-primary-hover';
  return 'bg-feedback-warning hover:brightness-110';
}

function isMemberActionBusy(
  modal: Exclude<MemberActionModalState, null>,
  changingRoleId: string | null,
  withdrawingId: string | null,
) {
  if (modal.mode === 'withdraw') return withdrawingId === modal.member.id;
  return changingRoleId === modal.member.id;
}

function RoleAvatar({ member, size }: { member: ApprovedMembership; size: number }) {
  return (
    <span className="relative inline-flex shrink-0">
      <Image
        src={member.photoUrl || avatarSrcFor(member)}
        alt={member.nickname}
        width={size}
        height={size}
        sizes={`${size}px`}
        loading="eager"
        priority
        className="rounded-full bg-surface-hover object-cover"
        style={{ width: size, height: size }}
        unoptimized
      />
      <RoleMark role={member.role} />
    </span>
  );
}

function RoleMark({ role }: { role: ApprovedMembership['role'] }) {
  if (role === 'member') return null;

  const Icon = role === 'admin' ? ShieldCheck : UserCog;
  const label = role === 'admin' ? '관리자 아이콘' : '운영진 아이콘';

  return (
    <span
      className="absolute -left-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface-elevated text-brand-primary shadow-sm ring-1 ring-brand-primary/20"
      aria-label={label}
    >
      <Icon size={10} aria-hidden="true" />
    </span>
  );
}

function MatchPointAward({ rank }: { rank?: number }) {
  if (!rank) return <span className="h-[14px] w-[14px]" aria-hidden="true" />;

  if (rank === 1) {
    return <Medal size={16} className="text-tier-gold" />;
  }
  if (rank === 2) {
    return <Medal size={16} className="text-tier-silver" />;
  }
  if (rank === 3) {
    return <Medal size={16} className="text-tier-bronze" />;
  }

  return <span className="h-[14px] w-[14px]" aria-hidden="true" />;
}
