'use client';

import { LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, type ChangeEvent } from 'react';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import Modal from '@/components/ui/Modal';
import PlayerAbilityPanel, { type ProfileField } from '@/components/ui/PlayerAbilityPanel';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { fetchMatchPointLedger, type MatchPointLedgerEntry } from '@/stores/membershipClient';
import { DEFAULT_STATS, type UserStats } from '@/types';
import { calculateOvr } from '@/components/ui/PlayerAbilityPanel';

export default function LockerProfile() {
  const ownedStatPoints = 40;
  const maxStatsSum = 360 + ownedStatPoints;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { activeClubId } = useAppStore();
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const saveMemberPhoto = useAuthStore((state) => state.saveMemberPhoto);
  const saveMemberProfile = useAuthStore((state) => state.saveMemberProfile);
  const { showToast } = useToastStore();
  const [isUploading, setIsUploading] = useState(false);
  const [editingField, setEditingField] = useState<ProfileField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isPointHistoryOpen, setIsPointHistoryOpen] = useState(false);
  const [pointLedger, setPointLedger] = useState<MatchPointLedgerEntry[]>([]);
  const [pointLedgerStatus, setPointLedgerStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [tempStats, setTempStats] = useState<UserStats | null>(null);
  const [editingStat, setEditingStat] = useState<{ key: keyof UserStats; label: string; value: number } | null>(null);
  const [editingStatValue, setEditingStatValue] = useState('');
  const [editingStatSnapshot, setEditingStatSnapshot] = useState<UserStats | null>(null);
  const [isSavingStats, setIsSavingStats] = useState(false);

  const displayName = memberProfile?.name || '프로필 준비 중';
  const hasCustomPhoto = Boolean(memberProfile?.photoUrl);
  const avatarSrc = memberProfile?.photoUrl || getFallbackAvatar(memberProfile?.name || 'member-profile');
  const preferredFoot = memberProfile?.preferredFoot || '-';
  const baseStats = memberProfile?.stats ?? DEFAULT_STATS;
  const stats = tempStats ?? baseStats;
  const ovr = calculateOvr(stats);
  const remainingStatPoints = Math.max(0, maxStatsSum - sumStats(stats));
  const isStatsDirty = tempStats !== null && !areStatsEqual(tempStats, baseStats);
  const points = memberProfile?.matchPoints ?? 100;

  const handleUploadBannerClick = () => {
    if (!activeClubId || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleOpenPointHistory = async () => {
    setIsPointHistoryOpen(true);
    if (!activeClubId || pointLedgerStatus === 'loading') return;

    setPointLedgerStatus('loading');
    try {
      setPointLedger(await fetchMatchPointLedger(activeClubId));
      setPointLedgerStatus('ready');
    } catch (error) {
      console.error('[FC Moim] Match point ledger load failed:', error);
      setPointLedger([]);
      setPointLedgerStatus('error');
    }
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
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
      await saveMemberPhoto(activeClubId, dataUrl);
      showToast(hasCustomPhoto ? '프로필 사진을 변경했어요.' : '프로필 사진을 등록했어요.');
    } catch (error) {
      console.error('[FC Moim] Profile photo upload failed:', error);
      showToast('프로필 사진을 저장하지 못했어요.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileCardClick = (field: ProfileField) => {
    setEditingField(field);
    setEditValue(getProfileEditValue(field, memberProfile));
  };

  const handleSaveProfileField = async () => {
    if (!activeClubId || !editingField) return;
    const validationMessage = validateProfileEditValue(editingField, editValue);
    if (validationMessage) {
      showToast(validationMessage);
      return;
    }

    try {
      setIsSavingProfile(true);
      await saveMemberProfile({
        clubId: activeClubId,
        ...buildProfilePatch(editingField, editValue),
      });
      setEditingField(null);
      showToast('프로필 정보를 저장했어요.');
    } catch (error) {
      console.error('[FC Moim] Profile update failed:', error);
      showToast(error instanceof Error ? error.message : '프로필 정보를 저장하지 못했어요.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const updateDraftStat = (key: keyof UserStats, nextValue: number, showLimitToast = false) => {
    setTempStats((prev) => {
      const currentStats = prev ?? baseStats;
      const clampedValue = clampStatValue(nextValue);
      const allowedValue = getAllowedStatValue(currentStats, key, clampedValue, maxStatsSum);

      if (showLimitToast && allowedValue !== clampedValue) {
        showToast(`능력치 총합은 ${maxStatsSum}점을 초과할 수 없습니다.`);
      }

      return {
        ...currentStats,
        [key]: allowedValue,
      };
    });
  };

  const handleRadarAxisClick = (key: keyof UserStats, label: string, currentValue: number) => {
    setEditingStatSnapshot(stats);
    setEditingStat({ key, label, value: currentValue });
    setEditingStatValue(currentValue.toString());
  };

  const handleEditingStatValueChange = (newValue: string) => {
    if (!editingStat) return;

    const parsedValue = Number.parseInt(newValue.trim(), 10);
    if (Number.isNaN(parsedValue)) {
      setEditingStatValue(newValue);
      updateDraftStat(editingStat.key, 0, true);
      return;
    }

    const clampedValue = clampStatValue(parsedValue);
    const allowedValue = getAllowedStatValue(stats, editingStat.key, clampedValue, maxStatsSum);

    if (allowedValue !== clampedValue) {
      setEditingStatValue(allowedValue.toString());
      showToast(`능력치 총합은 ${maxStatsSum}점을 초과할 수 없습니다.`);
    } else {
      setEditingStatValue(clampedValue === parsedValue ? newValue : clampedValue.toString());
    }

    updateDraftStat(editingStat.key, allowedValue);
  };

  const handleSaveStat = () => {
    if (!editingStat) return;
    const parsedValue = Number.parseInt(editingStatValue.trim(), 10);

    if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 99) {
      showToast('능력치는 0 이상 99 이하의 숫자여야 합니다.');
      return;
    }

    const otherStatsSum = Object.entries(stats)
      .filter(([statKey]) => statKey !== editingStat.key)
      .reduce((sum, [, value]) => sum + value, 0);

    if (otherStatsSum + parsedValue > maxStatsSum) {
      showToast(`능력치 총합은 ${maxStatsSum}점을 초과할 수 없습니다.`);
      return;
    }

    setEditingStat(null);
    setEditingStatSnapshot(null);
  };

  const handleCancelSaveStat = () => {
    setTempStats(editingStatSnapshot);
    setEditingStat(null);
    setEditingStatSnapshot(null);
  };

  const handleStatDrag = (key: keyof UserStats, value: number) => {
    updateDraftStat(key, value);
  };

  const handleCancelStats = () => {
    setTempStats(null);
    setEditingStat(null);
    setEditingStatSnapshot(null);
    setEditingStatValue('');
  };

  const handleSaveStats = async () => {
    if (!activeClubId || !tempStats || !isStatsDirty) return;
    const nextOvr = calculateOvr(tempStats);

    try {
      setIsSavingStats(true);
      await saveMemberProfile({
        clubId: activeClubId,
        stats: tempStats,
        ovr: nextOvr,
      });
      setTempStats(null);
      setEditingStat(null);
      setEditingStatSnapshot(null);
      setEditingStatValue('');
      showToast('능력치를 저장했어요.');
    } catch (error) {
      console.error('[FC Moim] Profile stats update failed:', error);
      showToast(error instanceof Error ? error.message : '능력치를 저장하지 못했어요.');
    } finally {
      setIsSavingStats(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-border-subtle bg-surface-card shadow-md shadow-brand-primary/5">
      <div className="flex items-center gap-3 bg-surface-elevated px-4 py-4 profile-card-header">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={handleUploadBannerClick}
            disabled={!activeClubId || isUploading}
            className="group relative block h-20 w-20 overflow-hidden rounded-full bg-surface-bg shadow-sm transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Image
              src={avatarSrc}
              alt={`${displayName} 사진 변경`}
              fill
              sizes="80px"
              loading="eager"
              priority
              className={
                hasCustomPhoto
                  ? 'rounded-full object-cover'
                  : 'rounded-full bg-surface-elevated object-contain p-1.5'
              }
              unoptimized
            />
            <div className="pointer-events-none absolute inset-x-1 bottom-1 rounded-full bg-surface-card/90 px-1.5 py-1 text-center text-[9px] font-bold text-secondary shadow-sm opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
              {isUploading ? '업로드 중' : hasCustomPhoto ? '사진 변경' : '사진 업로드'}
            </div>
            {isUploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-card/72">
                <LoaderCircle size={20} className="animate-spin text-brand-primary" />
              </div>
            ) : null}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePhotoChange}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-black tracking-tight text-primary">
            {displayName}
          </h2>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0 text-right animate-fadeIn">
          <button
            type="button"
            onClick={() => void handleOpenPointHistory()}
            className="rounded-xl px-2 py-0.5 transition-all hover:bg-surface-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            aria-label="경기 Point 내역 보기"
          >
            <span className="rounded bg-highlight-amber px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
              경기 Point
            </span>
            <strong className="mt-0.5 block text-base font-black leading-none text-primary">
              {points.toLocaleString('ko-KR')}
            </strong>
          </button>
          <div className="px-2 py-0.5">
            <span className="rounded bg-brand-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
              스탯 Point
            </span>
            <strong className="mt-0.5 block text-base font-black leading-none text-primary">
              {remainingStatPoints}
            </strong>
          </div>
        </div>
      </div>

      <div className="border-t border-brand-primary/10 bg-surface-card px-3 py-2 profile-card-body">
        <PlayerAbilityPanel
          stats={stats}
          ovr={ovr}
          preferredFoot={preferredFoot}
          surface="flat"
          birthDate={memberProfile?.birth}
          residence={memberProfile?.residence}
          heightCm={memberProfile?.height}
          weightKg={memberProfile?.weight}
          onProfileItemClick={handleProfileCardClick}
          editingField={editingField}
          editValue={editValue}
          onEditValueChange={setEditValue}
          onCancelEdit={() => setEditingField(null)}
          onSave={handleSaveProfileField}
          isSaving={isSavingProfile}
          onRadarAxisClick={handleRadarAxisClick}
          editingStat={editingStat}
          editingStatValue={editingStatValue}
          onEditingStatValueChange={handleEditingStatValueChange}
          onSaveStat={handleSaveStat}
          onCancelSaveStat={handleCancelSaveStat}
          isDraggable
          onStatDrag={handleStatDrag}
        />
        {isStatsDirty ? (
          <div className="mt-2.5 flex items-center justify-between gap-3 rounded-2xl border border-glass-border bg-glass-bg/80 px-3 py-2.5 shadow-glass-shadow backdrop-blur-md">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-brand-primary">Stat Point</p>
              <p className="mt-0.5 text-xs font-bold text-secondary">
                잔여 {remainingStatPoints}P · OVR {ovr}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleCancelStats}
                disabled={isSavingStats}
                className="rounded-xl border border-border bg-surface-card px-3 py-2 text-xs font-black text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                스탯 변경 취소
              </button>
              <button
                type="button"
                onClick={() => void handleSaveStats()}
                disabled={!activeClubId || isSavingStats}
                className="rounded-xl bg-brand-primary px-3 py-2 text-xs font-black text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingStats ? '저장 중' : '스탯 저장'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        title="경기 Point 내역"
        isOpen={isPointHistoryOpen}
        onClose={() => setIsPointHistoryOpen(false)}
        presentation="dialog"
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-highlight-amber/20 bg-highlight-amber-bg px-4 py-3">
            <p className="text-[11px] font-black text-highlight-amber">현재 보유</p>
            <p className="mt-1 text-2xl font-black leading-none text-primary">{points.toLocaleString('ko-KR')} P</p>
          </div>
          <div className="space-y-2">
            {pointLedgerStatus === 'loading' ? (
              <div className="rounded-xl border border-border bg-surface-card px-3 py-4 text-center text-xs font-bold text-secondary">
                경기 Point 내역을 불러오는 중입니다
              </div>
            ) : null}
            {pointLedgerStatus === 'error' ? (
              <div className="rounded-xl border border-feedback-error-border bg-feedback-error-bg px-3 py-3 text-xs font-bold text-feedback-error">
                경기 Point 내역을 불러오지 못했어요.
              </div>
            ) : null}
            {(pointLedger.length > 0 ? pointLedger.map(mapLedgerToPointHistory) : buildPointHistory(points)).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-card px-3 py-2.5 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-primary">{entry.title}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-tertiary">{entry.date}</p>
                </div>
                <span className={`shrink-0 text-sm font-black ${entry.amount >= 0 ? 'text-brand-primary' : 'text-feedback-error'}`}>
                  {entry.amount >= 0 ? '+' : ''}{entry.amount.toLocaleString('ko-KR')} P
                </span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </section>
  );
}

function buildPointHistory(points: number) {
  const earned = Math.max(0, points - 100);
  return [
    ...(earned > 0 ? [{
      id: 'earned',
      title: '경기 참여 및 결과 반영',
      amount: earned,
      date: '최근 경기 기준',
    }] : []),
    {
      id: 'initial',
      title: '시즌 기본 지급',
      amount: 100,
      date: '가입 시점',
    },
  ];
}

function mapLedgerToPointHistory(entry: MatchPointLedgerEntry) {
  return {
    id: entry.id,
    title: formatPointReason(entry.reason),
    amount: entry.amount,
    date: formatPointLedgerDate(entry.createdAt),
  };
}

function formatPointReason(reason: string) {
  if (reason === 'match_result') return '경기 결과 반영';
  if (reason === 'match_attendance') return '경기 참석 적립';
  if (reason === 'shop_purchase') return '라커룸 상점 사용';
  return reason || '경기 Point 변동';
}

function formatPointLedgerDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '날짜 미상';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function sumStats(stats: UserStats) {
  return Object.values(stats).reduce((sum, value) => sum + value, 0);
}

function clampStatValue(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99, Math.round(value)));
}

function getAllowedStatValue(stats: UserStats, key: keyof UserStats, value: number, maxStatsSum: number) {
  const otherStatsSum = Object.entries(stats)
    .filter(([statKey]) => statKey !== key)
    .reduce((sum, [, statValue]) => sum + statValue, 0);

  return Math.max(0, Math.min(value, maxStatsSum - otherStatsSum));
}

function areStatsEqual(left: UserStats, right: UserStats) {
  return (
    left.attack === right.attack &&
    left.defense === right.defense &&
    left.stamina === right.stamina &&
    left.mentality === right.mentality &&
    left.speed === right.speed &&
    left.manner === right.manner
  );
}

function getProfileEditValue(field: ProfileField, profile: ReturnType<typeof useAuthStore.getState>['memberProfile']) {
  if (!profile) return '';
  if (field === 'height') return profile.height?.toString() ?? '';
  if (field === 'weight') return profile.weight?.toString() ?? '';
  if (field === 'birth') return profile.birth ? profile.birth.toISOString().slice(0, 10) : '1990-09-09';
  return profile.residence ?? '';
}

function buildProfilePatch(field: ProfileField, value: string) {
  const trimmed = value.trim();
  if (field === 'height') return { heightCm: trimmed ? Number.parseInt(trimmed, 10) : null };
  if (field === 'weight') return { weightKg: trimmed ? Number.parseInt(trimmed, 10) : null };
  if (field === 'birth') return { birthDate: trimmed || null };
  return { residence: trimmed || null };
}



function validateProfileEditValue(field: ProfileField, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (field === 'height') {
    const height = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(height) || height < 100 || height > 230) {
      return '키는 100cm 이상 230cm 이하로 입력해주세요.';
    }
  }

  if (field === 'weight') {
    const weight = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(weight) || weight < 30 || weight > 180) {
      return '몸무게는 30kg 이상 180kg 이하로 입력해주세요.';
    }
  }

  return null;
}

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
