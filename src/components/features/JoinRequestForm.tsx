'use client';

import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, ReactNode } from 'react';
import Image from 'next/image';
import { ArrowLeft, Camera, Clock, LoaderCircle, Send } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useToastStore';
import { buildJoinProfileRequest, submitJoinRequest, withdrawMembership, fetchMembershipSnapshot, fetchClubMemberships, type ApiMembership } from '@/stores/membershipClient';
import type { Position, UserStats } from '@/types';
import Modal from '@/components/ui/Modal';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import PlayerAbilityPanel from '@/components/ui/PlayerAbilityPanel';
import type { ProfileField } from '@/components/ui/PlayerAbilityPanel';
import { DEFAULT_STATS } from '@/types';
import type { MembershipStatus } from '@/types/domain';

const PREFERRED_FOOT_OPTIONS = ['왼발', '양발', '오른발'] as const;
const POSITION_OPTIONS: Position[] = ['FW', 'MF', 'DF', 'GK'];

type JoinRequestFormProps = {
  showHeader?: boolean;
  mode?: 'primary' | 'secondary';
  targetStatus?: Extract<MembershipStatus, 'pending'> | 'new';
  onSecondaryClose?: () => void;
};

export default function JoinRequestForm({
  showHeader = true,
  mode = 'primary',
  targetStatus,
  onSecondaryClose,
}: JoinRequestFormProps) {
  const ownedStatPoints = 40;
  const maxStatsSum = 360 + ownedStatPoints;
  const {
    isAuthenticated,
    selectedJoinClubId,
    clearJoinIntent,
    setAuthView,
    userStatus,
    setUserStatus,
    setShowJoinForm,
    setAvailableClubs,
  } = useAppStore();
  const { showToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [membershipData, setMembershipData] = useState<ApiMembership | null>(null);
  
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const [editingField, setEditingField] = useState<ProfileField | null>(null);
  const [editValue, setEditValue] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    mainPosition: 'MF' as Position,
    height: '',
    weight: '',
    preferredFoot: '오른발' as '왼발' | '오른발' | '양발',
    birthDate: '',
    residence: '',
    photoUrl: null as string | null,
  });

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [editingStat, setEditingStat] = useState<{ key: keyof UserStats; label: string; value: number } | null>(null);
  const [editingStatValue, setEditingStatValue] = useState<string>('');
  const [originalStats, setOriginalStats] = useState<UserStats | null>(null);

  const isSecondary = mode === 'secondary';
  const isPending = userStatus === 'pending' || targetStatus === 'pending';

  // 1) 승인 대기 중(pending)인 경우 기존 신청 정보 불러오기
  useEffect(() => {
    if (isAuthenticated && isPending) {
      fetchMembershipSnapshot(selectedJoinClubId)
        .then((snapshot) => {
          if (snapshot.membership) {
            setMembershipData(snapshot.membership);
            setFormData({
              name: snapshot.membership.nickname || '',
              mainPosition: (snapshot.membership.position as Position) || 'MF',
              height: snapshot.membership.heightCm?.toString() || '',
              weight: snapshot.membership.weightKg?.toString() || '',
              preferredFoot: snapshot.membership.preferredFoot === 'left' ? '왼발' :
                             snapshot.membership.preferredFoot === 'both' ? '양발' : '오른발',
              birthDate: snapshot.membership.birthDate ? snapshot.membership.birthDate.slice(0, 10) : '',
              residence: snapshot.membership.residence || '',
              photoUrl: snapshot.membership.photoUrl,
            });
            if (snapshot.membership.stats) {
              setStats(snapshot.membership.stats);
            }
            if (snapshot.membership.photoUrl) {
              setPhotoUrl(snapshot.membership.photoUrl);
            }
          }
        })
        .catch((err) => {
          console.error('[FC Moim] Failed to load pending membership:', err);
        });
    }
  }, [isAuthenticated, isPending, selectedJoinClubId]);

  // 2) 이미지 업로드 & 크롭/변환
  const handleUploadClick = () => {
    if (isPending || isUploading) return;
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있어요.');
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await createProfilePhotoDataUrl(file);
      setPhotoUrl(dataUrl);
      setFormData((prev) => ({ ...prev, photoUrl: dataUrl }));
      showToast('사진이 등록되었습니다.');
    } catch (error) {
      console.error('[FC Moim] Photo processing failed:', error);
      showToast('사진 처리에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormControlFocus = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleFormControlBlur = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      if (typeof window.scrollTo === 'function' && !window.scrollTo.toString().includes('notImplemented')) {
        window.scrollTo(0, window.scrollY);
      }
    }
  };

  // 3) 가입 신청 제출 흐름
  const handleSubmitClick = () => {
    if (!formData.name.trim()) {
      showToast('이름을 입력해주세요.');
      return;
    }

    if (!isAuthenticated) {
      setShowJoinForm(false);
      setAuthView('login');
      showToast('입단을 위해 로그인이 먼저 필요합니다. 로그인해주세요.');
      return;
    }

    setIsSubmitModalOpen(true);
  };

  const handleRadarAxisClick = (key: keyof UserStats, label: string, currentValue: number) => {
    if (isPending) return;
    setOriginalStats({ ...stats });
    setEditingStat({ key, label, value: currentValue });
    setEditingStatValue(currentValue.toString());
  };

  const handleEditingStatValueChange = (newValString: string) => {
    setEditingStatValue(newValString);
    if (!editingStat) return;

    const parsedVal = parseInt(newValString.trim(), 10);
    if (isNaN(parsedVal)) {
      setStats((prev) => ({
        ...prev,
        [editingStat.key]: 0,
      }));
      return;
    }

    let val = parsedVal;
    if (val < 0) val = 0;
    if (val > 99) val = 99;

    const otherStatsSum = Object.entries(stats)
      .filter(([k]) => k !== editingStat.key)
      .reduce((sum, [, v]) => sum + (v as number), 0);

    if (otherStatsSum + val > maxStatsSum) {
      const clampedVal = maxStatsSum - otherStatsSum;
      setEditingStatValue(clampedVal.toString());
      setStats((prev) => ({
        ...prev,
        [editingStat.key]: clampedVal,
      }));
      showToast(`능력치 총합은 ${maxStatsSum}점을 초과할 수 없습니다.`);
    } else {
      if (val !== parsedVal) {
        setEditingStatValue(val.toString());
      }
      setStats((prev) => ({
        ...prev,
        [editingStat.key]: val,
      }));
    }
  };

  const handleSaveStat = () => {
    if (!editingStat) return;
    const val = parseInt(editingStatValue.trim(), 10);
    if (isNaN(val) || val < 0 || val > 99) {
      showToast('능력치는 0 이상 99 이하의 숫자여야 합니다.');
      return;
    }

    const otherStatsSum = Object.entries(stats)
      .filter(([k]) => k !== editingStat.key)
      .reduce((sum, [, v]) => sum + (v as number), 0);

    if (otherStatsSum + val > maxStatsSum) {
      showToast(`능력치 총합은 ${maxStatsSum}점을 초과할 수 없습니다.`);
      return;
    }

    setEditingStat(null);
    setOriginalStats(null);
    showToast(`${editingStat.label} 능력치를 ${val}점으로 설정했습니다.`);
  };

  const handleCancelSaveStat = () => {
    if (originalStats) {
      setStats(originalStats);
    }
    setEditingStat(null);
    setOriginalStats(null);
  };

  const handleActualSubmit = async () => {
    const profile = buildJoinProfileRequest(formData, stats);

    try {
      setIsSubmitting(true);
      const result = await submitJoinRequest(profile, selectedJoinClubId);
      setMembershipData(result);
      const memberships = await fetchClubMemberships().catch(() => null);
      if (memberships) {
        setAvailableClubs(memberships);
      }
      if (isSecondary) {
        onSecondaryClose?.();
      } else {
        clearJoinIntent();
        setUserStatus('pending');
      }
      showToast('입단신청이 접수되었어요. 운영진 승인을 기다려주세요.');
    } catch (error) {
      console.error('[FC Moim] Join request failed:', error);
      showToast(error instanceof Error ? error.message : '입단신청을 제출하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4) 가입 신청 취소 흐름
  const handleCancelClick = () => {
    setIsCancelModalOpen(true);
  };

  const handleActualCancel = async () => {
    const membershipId = membershipData?.id;
    if (!membershipId) {
      showToast('취소할 신청 정보가 없습니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      await withdrawMembership({
        clubId: selectedJoinClubId,
        membershipId,
      });
      setMembershipData(null);
      const memberships = await fetchClubMemberships().catch(() => null);
      if (memberships) {
        setAvailableClubs(memberships);
      }
      if (isSecondary) {
        onSecondaryClose?.();
      } else {
        clearJoinIntent();
        setUserStatus('guest');
        setShowJoinForm(true); // 입력 폼을 활성화 상태로 유지
      }
      showToast('입단신청이 취소되었습니다.');
    } catch (error) {
      console.error('[FC Moim] Cancel join request failed:', error);
      showToast(error instanceof Error ? error.message : '입단신청을 취소하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5) 마이페이지 스타일 카드 수정 연동
  const handleProfileCardClick = (field: ProfileField) => {
    setEditingField(field);
    setEditValue(getProfileEditValue(field, formData));
  };

  const handleSaveProfileField = async () => {
    if (!editingField) return;
    
    // 유효성 체크
    if (editingField === 'height') {
      const height = parseInt(editValue.trim(), 10);
      if (editValue.trim() && (isNaN(height) || height < 100 || height > 230)) {
        showToast('키는 100cm 이상 230cm 이하로 입력해주세요.');
        return;
      }
    }
    if (editingField === 'weight') {
      const weight = parseInt(editValue.trim(), 10);
      if (editValue.trim() && (isNaN(weight) || weight < 30 || weight > 180)) {
        showToast('몸무게는 30kg 이상 180kg 이하로 입력해주세요.');
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [editingField === 'birth' ? 'birthDate' : editingField]: editValue,
    }));
    setEditingField(null);
  };

  return (
    <div
      className="space-y-6 animate-fadeIn pb-20"
      onFocusCapture={handleFormControlFocus}
      onBlurCapture={handleFormControlBlur}
    >
      {showHeader ? (
        <div className="flex items-center gap-3 pb-3 border-b border-border/40">
          <button
            type="button"
            onClick={() => {
              if (isSecondary) {
                onSecondaryClose?.();
                return;
              }
              setShowJoinForm(false);
              if (isPending) {
                setUserStatus('guest');
              }
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-card hover:bg-surface-hover border border-border/10 text-primary transition-all active:scale-95"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-primary tracking-tight">입단신청</h1>
          </div>
        </div>
      ) : null}

      {/* Locker Profile 카드 리재사용 디자인 */}
      <section className="overflow-hidden rounded-3xl border border-glass-border bg-glass-bg/80 shadow-md shadow-brand-primary/5 backdrop-blur-xl">
        <div className="flex items-center gap-3 bg-glass-bg/60 px-4 py-4 profile-card-header">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isPending || isUploading}
              className="group relative block h-20 w-20 overflow-hidden rounded-full bg-surface-bg shadow-sm transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-default"
              aria-label="프로필 사진 변경"
            >
              <Image
                src={photoUrl || getFallbackAvatar(formData.name || 'member')}
                alt="프로필 사진"
                fill
                sizes="80px"
                loading="eager"
                priority
                className={
                  photoUrl
                    ? 'rounded-full object-cover animate-fadeIn'
                    : 'rounded-full bg-surface-elevated object-contain p-1.5'
                }
                unoptimized
              />
              {!isPending && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                  <Camera size={16} />
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-card/70">
                  <LoaderCircle size={16} className="animate-spin text-brand-primary" />
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
              disabled={isPending}
            />
          </div>

          <div className="min-w-0 flex-1 text-left">
            {isPending ? (
              <h2 className="truncate text-2xl font-black tracking-tight text-primary">
                {formData.name}
              </h2>
            ) : (
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="이름 입력 *"
                className="w-full rounded-xl border border-glass-border bg-glass-bg/60 px-3 py-2 text-2xl font-black tracking-tight text-primary placeholder:text-tertiary focus:border-brand-primary focus:outline-none"
              />
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 text-right">
            <div className="px-2 py-0.5">
              <span className="rounded bg-highlight-amber px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                경기 Point
              </span>
              <strong className="mt-0.5 block text-base font-black leading-none text-primary">
                {(membershipData?.matchPoints ?? 100).toLocaleString('ko-KR')}
              </strong>
            </div>
            <div className="px-2 py-0.5">
              <span className="rounded bg-brand-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                스탯 Point
              </span>
              <strong className="mt-0.5 block text-base font-black leading-none text-primary">
                {Math.max(0, maxStatsSum - Object.values(stats).reduce((a, b) => a + b, 0))}
              </strong>
            </div>
          </div>
        </div>

        {/* 마이페이지 정보 수정 필드 컴포넌트 그대로 재사용 */}
        <div className="space-y-4 border-t border-brand-primary/10 bg-glass-bg/60 px-3 py-3 profile-card-body">
          <PlayerAbilityPanel
            stats={stats}
            ovr={Math.round(Object.values(stats).reduce((a, b) => a + b, 0) / 6)}
            preferredFoot={formData.preferredFoot}
            surface="flat"
            birthDate={formData.birthDate ? new Date(formData.birthDate) : null}
            residence={formData.residence}
            heightCm={formData.height ? parseInt(formData.height, 10) : null}
            weightKg={formData.weight ? parseInt(formData.weight, 10) : null}
            onProfileItemClick={isPending ? undefined : handleProfileCardClick}
            editingField={editingField}
            editValue={editValue}
            onEditValueChange={setEditValue}
            onCancelEdit={() => setEditingField(null)}
            onSave={handleSaveProfileField}
            isSaving={false}
            onRadarAxisClick={isPending ? undefined : handleRadarAxisClick}
            editingStat={editingStat}
            editingStatValue={editingStatValue}
            onEditingStatValueChange={handleEditingStatValueChange}
            onSaveStat={handleSaveStat}
            onCancelSaveStat={handleCancelSaveStat}
          />
          {!isPending ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SegmentedField label="주발" ariaLabel="주발 선택">
                {PREFERRED_FOOT_OPTIONS.map((foot) => (
                  <button
                    key={foot}
                    type="button"
                    role="radio"
                    aria-checked={formData.preferredFoot === foot}
                    onClick={() => setFormData((prev) => ({ ...prev, preferredFoot: foot }))}
                    className={getSegmentButtonClass(formData.preferredFoot === foot)}
                  >
                    {foot}
                  </button>
                ))}
              </SegmentedField>
              <SegmentedField label="포지션" ariaLabel="포지션 선택">
                {POSITION_OPTIONS.map((position) => (
                  <button
                    key={position}
                    type="button"
                    role="radio"
                    aria-checked={formData.mainPosition === position}
                    onClick={() => setFormData((prev) => ({ ...prev, mainPosition: position }))}
                    className={getSegmentButtonClass(formData.mainPosition === position)}
                  >
                    {position}
                  </button>
                ))}
              </SegmentedField>
            </div>
          ) : null}
        </div>
      </section>

      {/* 가입신청 / 대기 액션 버튼 */}
      <div className="pt-2">
        {isPending ? (
          <button
            type="button"
            onClick={handleCancelClick}
            disabled={isSubmitting}
            className="w-full bg-highlight-amber text-white font-bold py-3.5 px-5 rounded-xl text-sm hover:brightness-105 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Clock size={16} className="animate-pulse" />
            )}
            운영진 승인을 기다려주세요.
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={isSubmitting}
            className="w-full bg-brand-primary text-white font-bold py-3.5 px-5 rounded-xl text-sm hover:bg-brand-primary-hover active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            입단신청
          </button>
        )}
      </div>

      {/* 둘러보기로 돌아가기 (대기중 상태 한정 하단 노출) */}
      {isPending && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              if (isSecondary) {
                onSecondaryClose?.();
                return;
              }
              setShowJoinForm(false);
              setUserStatus('guest');
            }}
            className="text-xs font-semibold text-tertiary hover:text-secondary transition-colors"
          >
            둘러보기로 돌아가기
          </button>
        </div>
      )}

      {/* 제출 확인 모달 */}
      <Modal
        title="입단신청 확인"
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        presentation="dialog"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary font-bold leading-relaxed">
            입력하신 프로필 정보로 입단신청을 제출할까요?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
              className="flex-1 bg-surface-bg hover:bg-surface-hover active:scale-95 text-secondary font-black py-3 rounded-xl text-sm transition-all border border-border"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSubmitModalOpen(false);
                void handleActualSubmit();
              }}
              className="flex-1 bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white font-black py-3 rounded-xl text-sm transition-all"
            >
              신청하기
            </button>
          </div>
        </div>
      </Modal>

      {/* 신청 취소 모달 */}
      <Modal
        title="입단신청 취소"
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        presentation="dialog"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary font-bold leading-relaxed">
            보내신 입단신청을 취소하시겠습니까?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="flex-1 bg-surface-bg hover:bg-surface-hover active:scale-95 text-secondary font-black py-3 rounded-xl text-sm transition-all border border-border"
            >
              아니오
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCancelModalOpen(false);
                void handleActualCancel();
              }}
              className="flex-1 bg-red-team hover:brightness-110 active:scale-95 text-white font-black py-3 rounded-xl text-sm transition-all"
            >
              예, 취소합니다
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

function SegmentedField({
  label,
  ariaLabel,
  children,
}: {
  label: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-glass-border bg-glass-bg/60 p-3 backdrop-blur-sm">
      <span className="block text-[11px] font-black text-secondary">{label}</span>
      <div className="mt-2 grid grid-flow-col auto-cols-fr gap-1 rounded-xl bg-surface-bg/70 p-1" role="radiogroup" aria-label={ariaLabel}>
        {children}
      </div>
    </div>
  );
}

function getSegmentButtonClass(isActive: boolean) {
  return [
    'min-h-10 rounded-lg px-2 text-xs font-black transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40',
    isActive
      ? 'bg-brand-primary text-white shadow-sm'
      : 'text-secondary hover:bg-glass-bg-hover',
  ].join(' ');
}

// ─── 헬퍼 함수: 정보 수정 파싱 매핑 ───
function getProfileEditValue(field: ProfileField, data: { height: string; weight: string; birthDate: string; residence: string }) {
  if (field === 'height') return data.height;
  if (field === 'weight') return data.weight;
  if (field === 'birth') return data.birthDate;
  return data.residence;
}

// ─── 헬퍼 함수: 프로필 이미지 크롭 및 Base64 변환 ───
async function createProfilePhotoDataUrl(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const size = 512;

    if (!context) {
      throw new Error('Canvas context unavailable');
    }

    canvas.width = size;
    canvas.height = size;

    const sourceSize = Math.min(image.width, image.height);
    const sourceX = (image.width - sourceSize) / 2;
    const sourceY = (image.height - sourceSize) / 2;

    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image loading failed'));
    image.src = src;
  });
}
