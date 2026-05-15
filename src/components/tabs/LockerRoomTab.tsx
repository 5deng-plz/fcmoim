'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus, ShieldCheck, UserCheck, UserCog, UserX, Users, Medal } from 'lucide-react';
import Image from 'next/image';
import CardMarket from '@/components/features/CardMarket';
import Modal from '@/components/ui/Modal';

import ConditionIcon from '@/components/ui/ConditionIcon';
import type { ConditionLevel } from '@/components/ui/ConditionIcon';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import PlayerAbilityPanel from '@/components/ui/PlayerAbilityPanel';
import {
  fetchApprovedMemberships,
  fetchPendingMemberships,
  reviewMembership,
  updateMembershipRole,
  type ApprovedMembership,
  type PendingMembershipReview,
} from '@/stores/membershipClient';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';

export default function LockerRoomTab() {
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const { activeClubId, userRole } = useAppStore();
  const { showToast } = useToastStore();
  const [pendingMembers, setPendingMembers] = useState<PendingMembershipReview[]>([]);
  const [squadMembers, setSquadMembers] = useState<ApprovedMembership[]>([]);
  const [isLoadingSquad, setIsLoadingSquad] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const squadCount = squadMembers.length;
  const canReview = userRole === 'admin' || userRole === 'operator';
  const canAssignOperator = userRole === 'admin';
  const topMatchPointRanks = useMemo(() => buildTopMatchPointRanks(squadMembers), [squadMembers]);
  const adminMember = useMemo(() => squadMembers.find((member) => member.role === 'admin'), [squadMembers]);
  const operatorMembers = useMemo(() => squadMembers.filter((member) => member.role === 'operator'), [squadMembers]);
  const roleGrantCandidates = useMemo(() => squadMembers.filter((member) => member.role === 'member'), [squadMembers]);
  const sortedSquadMembers = useMemo(
    () => sortSquadMembers(squadMembers, topMatchPointRanks),
    [squadMembers, topMatchPointRanks],
  );
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [photoMember, setPhotoMember] = useState<ApprovedMembership | null>(null);
  const [roleModal, setRoleModal] = useState<RoleModalState>(null);

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

  const handleConfirmRoleChange = async () => {
    if (!roleModal || roleModal.mode === 'select') return;

    await handleChangeRole(roleModal.member.id, roleModal.mode === 'grant' ? 'operator' : 'member');
    setRoleModal(null);
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-20">
      {/* ─── 스쿼드 ─── */}
      <div className="flex justify-between items-center mb-2 px-1">
        <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
          <Users size={20} className="text-green-600" /> 스쿼드
        </h2>
        <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2.5 py-1.5 rounded-md">
          총 {squadCount}명
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="flex w-full items-center gap-2 px-3 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="flex w-10 shrink-0 items-center justify-center gap-1">
            <span className="w-[14px] shrink-0" />
            <span className="text-fcgreen-600">OVR</span>
          </div>
          <div className="w-[44px] shrink-0" />
          <div className="flex-1 text-left">이름</div>
          <div className="w-10 text-center">컨디션</div>
          <div className="w-14 text-right">경기P</div>
          <div className="w-[14px] shrink-0" />
        </div>
        {isLoadingSquad ? (
          <div className="px-4 py-10 text-center text-xs font-bold text-gray-400">
            스쿼드 명단을 불러오는 중입니다
          </div>
        ) : squadMembers.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {sortedSquadMembers.map((member) => (
              <div key={member.id}>
                <div className="relative flex w-full items-center gap-2 px-3 py-4 transition-colors hover:bg-gray-50/50 active:bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setExpandedMemberId((current) => (current === member.id ? null : member.id))}
                    className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-500"
                    aria-expanded={expandedMemberId === member.id}
                    aria-controls={`member-detail-${member.id}`}
                    aria-label={`${member.nickname} 상세 정보`}
                  />
                  <div className="pointer-events-none relative z-0 flex w-10 shrink-0 items-center justify-center gap-1 text-center">
                    <MatchPointAward rank={topMatchPointRanks.get(member.id)} />
                    <span className="text-sm font-extrabold text-fcgreen-600">{member.ovr}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoMember(member)}
                    className="relative z-10 shrink-0 rounded-full transition-transform active:scale-95"
                    aria-label={`${member.nickname} 프로필 사진 크게 보기`}
                  >
                    <RoleAvatar member={member} size={44} />
                  </button>
                  <div className="pointer-events-none relative z-0 flex min-w-0 flex-1 items-center gap-2 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900">{member.nickname}</p>
                    </div>
                    <div className="flex w-10 justify-center">
                      <ConditionIcon level={getDisplayCondition(member)} size={18} />
                    </div>
                    <div className="w-14 text-right text-[11px] font-bold text-gray-700">
                      {member.matchPoints.toLocaleString('ko-KR')}
                    </div>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-gray-400 transition-transform ${expandedMemberId === member.id ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                {expandedMemberId === member.id ? (
                  <MemberProfileAccordion member={member} />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
              <Users size={22} />
            </div>
            <p className="text-sm font-bold text-gray-700">등록된 스쿼드가 없어요</p>
          </div>
        )}
      </div>

      {/* ─── 상점 ─── */}
      <CardMarket />

      {canReview ? (
        <section className="rounded-xl border border-green-100 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
              <ShieldCheck size={20} className="text-green-600" />
              입단 대기
            </h2>
            <span className="rounded-md bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">
              {pendingMembers.length}명
            </span>
          </div>

          {isLoadingPending ? (
            <p className="py-6 text-center text-xs font-bold text-gray-400">신청자를 확인하는 중입니다</p>
          ) : pendingMembers.length > 0 ? (
            <div className="space-y-3">
              {pendingMembers.map((member) => (
                <div key={member.id} className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{member.nickname}</p>
                      <p className="mt-1 text-xs font-bold text-gray-500">
                        {member.position || 'MF'} · {formatBody(member)} · {formatFoot(member.preferredFoot)}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-gray-400">
                        {new Date(member.createdAt).toLocaleDateString('ko-KR')} 신청
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={reviewingId === member.id}
                        onClick={() => void handleReview(member.id, 'approved')}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white transition-all hover:bg-green-700 active:scale-95 disabled:opacity-50"
                        aria-label={`${member.nickname} 승인`}
                        title="승인"
                      >
                        <UserCheck size={17} />
                      </button>
                      <button
                        type="button"
                        disabled={reviewingId === member.id}
                        onClick={() => void handleReview(member.id, 'rejected')}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-200 text-gray-600 transition-all hover:bg-gray-300 active:scale-95 disabled:opacity-50"
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
            <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-xs font-bold text-gray-400">
              대기 중인 입단신청이 없어요
            </p>
          )}
        </section>
      ) : null}

      {canAssignOperator ? (
        <section className="rounded-xl border border-green-100 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
              <UserCog size={20} className="text-green-600" />
              권한 관리
            </h2>
          </div>

          {isLoadingSquad ? (
            <p className="py-6 text-center text-xs font-bold text-gray-400">팀 권한을 확인하는 중입니다</p>
          ) : squadMembers.length > 0 ? (
            <RoleSlotRow
              admin={adminMember ?? null}
              operators={buildOperatorSlots(operatorMembers)}
              changingRoleId={changingRoleId}
              onEmptyClick={() => setRoleModal({ mode: 'select' })}
              onMemberClick={(member) => setRoleModal({ mode: 'revoke', member })}
            />
          ) : (
            <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-xs font-bold text-gray-400">
              관리할 팀원이 없어요
            </p>
          )}
        </section>
      ) : null}
      <Modal
        title={getRoleModalTitle(roleModal)}
        isOpen={roleModal !== null}
        onClose={() => setRoleModal(null)}
        presentation="dialog"
      >
        {roleModal?.mode === 'select' ? (
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-600">운영진으로 지정할 팀원을 선택하세요.</p>
            {roleGrantCandidates.length > 0 ? (
              <div className="space-y-2">
                {roleGrantCandidates.map((member) => (
                  <button
                    key={`grant-${member.id}`}
                    type="button"
                    onClick={() => setRoleModal({ mode: 'grant', member })}
                    className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-3 text-left transition-all hover:bg-green-50 active:scale-[0.99]"
                  >
                    <RoleAvatar member={member} size={44} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{member.nickname}</p>
                      <p className="text-xs font-bold text-gray-400">
                        {member.position || 'MF'} · {formatRole(member.role)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-xs font-bold text-gray-400">
                운영진으로 지정할 수 있는 회원이 없어요
              </p>
            )}
          </div>
        ) : roleModal ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <RoleAvatar member={roleModal.member} size={48} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{roleModal.member.nickname}</p>
                <p className="text-xs font-bold text-gray-400">
                  {roleModal.mode === 'grant' ? '운영진 권한을 부여합니다' : '운영진 권한을 회수합니다'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRoleModal(null)}
                className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-200 active:scale-95"
              >
                취소
              </button>
              <button
                type="button"
                disabled={changingRoleId === roleModal.member.id}
                onClick={() => void handleConfirmRoleChange()}
                className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-green-700 active:scale-95 disabled:opacity-50"
              >
                {roleModal.mode === 'grant' ? '부여' : '회수'}
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
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-50">
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

type RoleModalState =
  | { mode: 'select' }
  | { mode: 'grant'; member: ApprovedMembership }
  | { mode: 'revoke'; member: ApprovedMembership }
  | null;

function avatarSrcFor(member: ApprovedMembership) {
  return getFallbackAvatar(member.nickname || member.id);
}

function formatRole(role: ApprovedMembership['role']) {
  if (role === 'admin') return '관리자';
  if (role === 'operator') return '운영진';
  return '회원';
}

function formatBody(member: PendingMembershipReview) {
  const height = member.heightCm ? `${member.heightCm}cm` : '키 미입력';
  const weight = member.weightKg ? `${member.weightKg}kg` : '몸무게 미입력';
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

function getDisplayCondition(member: ApprovedMembership): ConditionLevel {
  if (member.matchPoints >= 1800) return 'best';
  if (member.matchPoints >= 1300) return 'good';
  if (member.matchPoints >= 800) return 'normal';
  if (member.matchPoints >= 400) return 'poor';
  return 'worst';
}

function MemberProfileAccordion({ member }: { member: ApprovedMembership }) {
  return (
    <div id={`member-detail-${member.id}`} className="border-t border-green-100 bg-green-50/55 px-4 py-4">
      <PlayerAbilityPanel
        stats={member.stats}
        ovr={member.ovr}
        preferredFoot={member.preferredFoot}
        birthDate={member.birthDate}
        heightCm={member.heightCm}
        weightKg={member.weightKg}
      />
    </div>
  );
}

function buildOperatorSlots(members: ApprovedMembership[]) {
  return Array.from({ length: 3 }, (_, index) => members[index] ?? null);
}

function getRoleModalTitle(roleModal: RoleModalState) {
  if (!roleModal) return '권한 관리';
  if (roleModal.mode === 'select') return '운영진 선택';
  return roleModal.mode === 'grant' ? '운영진 부여' : '운영진 회수';
}

function RoleSlotRow({
  admin,
  operators,
  changingRoleId,
  onEmptyClick,
  onMemberClick,
}: {
  admin: ApprovedMembership | null;
  operators: Array<ApprovedMembership | null>;
  changingRoleId: string | null;
  onEmptyClick: () => void;
  onMemberClick: (member: ApprovedMembership) => void;
}) {
  const slots = [
    { label: '관리자', member: admin, emptyLabel: '비어 있음', onClick: undefined },
    ...operators.map((member, index) => ({
      label: `운영진${index + 1}`,
      member,
      emptyLabel: '추가',
      onClick: member ? () => onMemberClick(member) : onEmptyClick,
    })),
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((slot, index) => (
        <RoleSlot
          key={slot.member?.id ?? `role-slot-${index}`}
          label={slot.label}
          member={slot.member}
          disabled={slot.member ? changingRoleId === slot.member.id : false}
          emptyLabel={slot.emptyLabel}
          onClick={slot.onClick}
        />
      ))}
    </div>
  );
}

function RoleSlot({
  label,
  member,
  disabled,
  emptyLabel,
  onClick,
}: {
  label: string;
  member: ApprovedMembership | null;
  disabled: boolean;
  emptyLabel: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      {member ? (
        <RoleAvatar member={member} size={42} />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400">
          <Plus size={18} />
        </span>
      )}
      <span className="mt-1.5 text-[9px] font-semibold text-gray-400">{label}</span>
      <span className="mt-0.5 max-w-full truncate text-[10px] font-bold text-gray-900">
        {member?.nickname ?? emptyLabel}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div className="flex min-w-0 flex-col items-center rounded-xl bg-gray-50 px-1.5 py-2.5">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-w-0 flex-col items-center rounded-xl bg-gray-50 px-1.5 py-2.5 transition-all hover:bg-green-50 active:scale-95 disabled:opacity-50"
    >
      {content}
    </button>
  );
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
        className="rounded-full bg-gray-100 object-cover"
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
      className="absolute -left-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-green-600 shadow-sm ring-1 ring-green-100"
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
