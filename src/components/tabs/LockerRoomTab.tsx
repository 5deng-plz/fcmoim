'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Users, Medal, ShieldCheck, UserCog } from 'lucide-react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';

import ConditionIcon from '@/components/ui/ConditionIcon';
import type { ConditionLevel } from '@/components/ui/ConditionIcon';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import PlayerAbilityPanel, { type PlayerAbilityPanelSeasonRecord } from '@/components/ui/PlayerAbilityPanel';
import {
  fetchApprovedMemberships,
  type ApprovedMembership,
} from '@/stores/membershipClient';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRecordsStore } from '@/stores/useRecordsStore';
import { useToastStore } from '@/stores/useToastStore';

export default function LockerRoomTab() {
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const { activeClubId } = useAppStore();
  const records = useRecordsStore((state) => state.records);
  const recordsStatus = useRecordsStore((state) => state.recordsStatus);
  const loadRecords = useRecordsStore((state) => state.loadRecords);
  const { showToast } = useToastStore();
  const [squadMembers, setSquadMembers] = useState<ApprovedMembership[]>([]);
  const [isLoadingSquad, setIsLoadingSquad] = useState(false);
  const squadCount = squadMembers.length;

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
}: {
  member: ApprovedMembership;
  seasonRecord: PlayerAbilityPanelSeasonRecord | null;
}) {
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
      />
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
