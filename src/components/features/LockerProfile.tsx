'use client';

import { Coins, LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, type ChangeEvent } from 'react';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import PlayerAbilityPanel from '@/components/ui/PlayerAbilityPanel';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { DEFAULT_STATS } from '@/types';

import PreferredFootIcon from '@/components/ui/PreferredFootIcon';
import { calculateOvr } from '@/components/ui/PlayerAbilityPanel';

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
  const preferredFoot = memberProfile?.preferredFoot || '-';
  const stats = memberProfile?.stats ?? DEFAULT_STATS;
  const ovr = memberProfile?.ovr ?? calculateOvr(stats);
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
    <section className="card relative overflow-hidden bg-gradient-to-br from-green-50 to-white shadow-sm shadow-gray-200/50">
      {/* Decorative background accent */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-green-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-green-200/30 blur-3xl" />

      <div className="relative z-10 px-5 pt-5">
        <div className="flex items-start justify-between">
          {/* Left: OVR and Footprint */}
          <div className="flex w-16 shrink-0 flex-col items-center justify-start pt-3">
            <span className="rounded bg-fcgreen-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              OVR
            </span>
            <strong className="mt-1 text-5xl font-black tracking-tighter text-fcgreen-800">
              {ovr}
            </strong>
            <div className="mt-2 flex h-8 items-center justify-center">
              <PreferredFootIcon preferredFoot={preferredFoot} />
            </div>
          </div>

          {/* Right: Photo */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleUploadBannerClick}
              disabled={!activeClubId || isUploading}
              className="group relative block h-[152px] w-[112px] overflow-hidden rounded-xl border border-white/60 bg-white shadow-md transition-transform hover:scale-[1.02] active:scale-95"
            >
              <Image
                src={avatarSrc}
                alt={displayName}
                fill
                sizes="112px"
                loading="eager"
                priority
                className="object-cover"
                unoptimized
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-2 pb-3 pt-7 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
                <div className="rounded-full bg-white/94 px-2.5 py-1 text-center text-[11px] font-bold text-gray-900 shadow-sm">
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
        </div>

        {/* Name and Match Points */}
        <div className="mt-3 flex flex-col items-end">
          <h2 className="text-[32px] font-black tracking-tight text-gray-900">
            {displayName}
          </h2>
          <div className="mt-1 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 shadow-sm backdrop-blur-sm">
            <Coins size={15} className="text-fcgreen-600" />
            <span className="text-xs font-extrabold text-fcgreen-700">
              {points.toLocaleString('ko-KR')} MP
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-2 pb-2">
        <PlayerAbilityPanel
          stats={stats}
          ovr={ovr}
          preferredFoot={preferredFoot}
          birthDate={memberProfile?.birth}
          heightCm={memberProfile?.height}
          weightKg={memberProfile?.weight}
          layout="stats-only"
          className="bg-transparent border-none shadow-none"
        />
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
