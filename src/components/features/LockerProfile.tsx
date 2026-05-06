'use client';

import { Camera, Coins, LoaderCircle, UserCircle2 } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, type ChangeEvent } from 'react';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';

export default function LockerProfile() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { activeClubId } = useAppStore();
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const saveMemberPhoto = useAuthStore((state) => state.saveMemberPhoto);
  const { showToast } = useToastStore();
  const [isUploading, setIsUploading] = useState(false);

  const displayName = memberProfile?.name || '프로필 준비 중';
  const hasCustomPhoto = Boolean(memberProfile?.photoUrl);
  const avatarSrc = memberProfile?.photoUrl || getFallbackAvatar(memberProfile?.name || 'member-profile');
  const positionText = memberProfile
    ? [memberProfile.mainPosition, memberProfile.subPosition].filter(Boolean).join(' / ')
    : '-';
  const physicalText = memberProfile?.height ? `${memberProfile.height}cm` : '-';
  const preferredFoot = memberProfile?.preferredFoot || '-';
  const ovr = memberProfile?.ovr ?? 0;
  const points = memberProfile?.matchPoints ?? 100;

  const handleUploadBannerClick = () => {
    if (!activeClubId || isUploading) return;
    fileInputRef.current?.click();
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

  return (
    <section className="overflow-hidden rounded-[26px] border border-green-100 bg-[linear-gradient(180deg,#f6fff8_0%,#ffffff_44%,#fbfdfb_100%)] p-5 shadow-[0_18px_48px_rgba(22,101,52,0.12)]">
      <div className="flex gap-4">
        <div className="shrink-0">
          <button
            type="button"
            onClick={handleUploadBannerClick}
            disabled={!activeClubId || isUploading}
            className="group relative block h-32 w-24 overflow-hidden rounded-[22px] border border-white/80 bg-emerald-100 shadow-[inset_0_0_0_1px_rgba(22,163,74,0.12),0_12px_28px_rgba(22,163,74,0.16)]"
          >
            <Image
              src={avatarSrc}
              alt={displayName}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.84)_100%)] px-2 pb-3 pt-7 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
              <div className="rounded-full bg-white/94 px-2.5 py-1 text-[11px] font-bold text-gray-900 shadow-sm">
                {isUploading ? '업로드 중...' : hasCustomPhoto ? '사진 변경' : '사진 업로드'}
              </div>
            </div>
            {isUploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/72">
                <LoaderCircle size={20} className="animate-spin text-green-600" />
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
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                <Camera size={12} />
                {hasCustomPhoto ? '프로필 준비 완료' : '사진을 등록하면 카드가 더 살아나요'}
              </p>
              <h2 className="truncate text-[31px] font-black leading-none tracking-tight text-gray-950">
                {displayName}
              </h2>
              <p className="mt-2 text-sm font-semibold text-gray-500">
                {physicalText} · {positionText} · {preferredFoot}
              </p>
              <p className="mt-1 text-sm font-bold text-green-700">
                OVR {ovr}
              </p>
            </div>

            <div className="rounded-2xl border border-green-100 bg-white/90 px-3 py-2 text-right shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-700/70">
                Match Points
              </p>
              <p className="mt-1 flex items-center justify-end gap-1.5 text-[30px] font-black leading-none text-green-700">
                <Coins size={19} /> {points.toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-green-100 bg-white/88 px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
          Equipped Badges
        </p>
        <div className="rounded-2xl border border-dashed border-green-100 bg-[linear-gradient(180deg,#fbfffc_0%,#f5faf6_100%)] px-4 py-6 text-center">
          <UserCircle2 size={28} className="mx-auto mb-2 text-green-300" />
          <p className="text-sm font-bold text-gray-600">아직 장착한 뱃지가 없어요</p>
        </div>
      </div>
    </section>
  );
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
