import { Coins, UserCircle } from 'lucide-react';
import Image from 'next/image';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import { useAuthStore } from '@/stores/useAuthStore';

export default function LockerProfile() {
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const displayName = memberProfile?.name || '프로필 준비 중';
  const positionText = memberProfile
    ? [memberProfile.mainPosition, memberProfile.subPosition].filter(Boolean).join('/')
    : '-';
  const physicalText = memberProfile?.height ? `${memberProfile.height}cm` : '-';
  const preferredFoot = memberProfile?.preferredFoot || '-';
  const ovr = memberProfile?.ovr ?? 0;
  const points = memberProfile?.matchPoints ?? 0;

  return (
    <section className="bg-slate-900 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden">
      <div className="flex gap-4 mb-5">
        <div className="w-24 h-32 bg-[#1e293b] rounded-lg overflow-hidden border-2 border-[#334155] relative shadow-lg shrink-0">
          <Image src={getFallbackAvatar('member-profile')} alt="Profile" fill className="object-cover" unoptimized />
        </div>
        <div className="flex flex-col justify-center">
          <h2 className="text-2xl font-black">{displayName}</h2>
          <p className="text-sm text-slate-400 font-medium mt-1">
            {physicalText} · {positionText} · {preferredFoot}
          </p>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            OVR {ovr}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
            Match Points
          </p>
          <p className="text-2xl font-black text-blue-400 flex items-center gap-1 justify-end">
            <Coins size={20} /> {points.toLocaleString('ko-KR')}
          </p>
        </div>
      </div>
      <div>
        <p className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Equipped Badges
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-6 text-center">
          <UserCircle size={28} className="mx-auto mb-2 text-slate-500" />
          <p className="text-xs font-bold text-slate-400">
            아직 장착한 뱃지가 없어요
          </p>
        </div>
      </div>
    </section>
  );
}
