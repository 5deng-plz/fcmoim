import { Zap, Target, Plus, Coins, Trophy, Star, Shield, Flame, Crown } from 'lucide-react';
import Image from 'next/image';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';

export default function LockerProfile() {
  return (
    <section className="bg-slate-900 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full blur-[60px] opacity-20"></div>
      <div className="flex gap-4 mb-5">
        <div className="w-24 h-32 bg-[#1e293b] rounded-lg overflow-hidden border-2 border-[#334155] relative shadow-lg shrink-0">
          <Image src={getFallbackAvatar('member-profile')} alt="Profile" fill className="object-cover" unoptimized />
        </div>
        <div className="flex flex-col justify-center">
          <h2 className="text-2xl font-black">손흥민</h2>
          <p className="text-sm text-slate-400 font-medium mt-1">
            183cm • FW/MF • 양발
          </p>
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            OVR 72
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
            Match Points
          </p>
          <p className="text-2xl font-black text-blue-400 flex items-center gap-1 justify-end">
            <Coins size={20} /> 1,250
          </p>
        </div>
      </div>
      <div>
        <p className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Equipped Badges
        </p>
        <div className="flex gap-2">
          {/* 업적형 뱃지 1: 첫 골 */}
          <div className="flex-1 h-20 rounded-xl bg-[#0f172a] p-2 flex flex-col justify-center items-center border border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)] relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 flex items-center justify-center mb-1 shadow-inner">
              <Target size={14} className="text-white drop-shadow-md" />
            </div>
            <span className="text-[10px] font-black text-amber-400">마수걸이</span>
          </div>
          
          {/* 업적형 뱃지 2: MOM 3회 */}
          <div className="flex-1 h-20 rounded-xl bg-[#0f172a] p-2 flex flex-col justify-center items-center border border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-300 to-blue-600 flex items-center justify-center mb-1 shadow-inner">
              <Zap size={14} className="text-white drop-shadow-md" />
            </div>
            <span className="text-[10px] font-black text-sky-400">MOM x3</span>
          </div>
          
          {/* 업적형 뱃지 3: 출석 */}
          <div className="flex-1 h-20 rounded-xl bg-[#0f172a] p-2 flex flex-col justify-center items-center border border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-300 to-green-600 flex items-center justify-center mb-1 shadow-inner">
              <Plus size={14} className="text-white drop-shadow-md" />
            </div>
            <span className="text-[10px] font-black text-emerald-400">개근상</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-800">
        <p className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Locked Achievements <span className="ml-1 text-[#facc15]">Goal</span>
        </p>
        <div className="grid grid-cols-4 gap-2 opacity-30">
          {[
            { Icon: Trophy, label: '리그 우승' },
            { Icon: Star, label: 'MVP 선정' },
            { Icon: Target, label: '득점왕' },
            { Icon: Zap, label: '어시스트왕' },
            { Icon: Shield, label: '클린시트' },
            { Icon: Flame, label: '연속 출전' },
            { Icon: Crown, label: '팀 리더' },
            { Icon: Coins, label: '기부왕' },
          ].map((item, idx) => (
            <div key={idx} className="aspect-square rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center group relative cursor-help">
              <item.Icon size={16} className="text-slate-400 mb-1" />
              <span className="text-[7px] font-bold text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-slate-500 mt-3 text-center font-medium">
          미션 달성 시 새로운 기능과 뱃지가 해금됩니다! 🚀
        </p>
      </div>
    </section>
  );
}
