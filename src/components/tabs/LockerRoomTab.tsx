'use client';

import { Users } from 'lucide-react';
import CardMarket from '@/components/features/CardMarket';

export default function LockerRoomTab() {
  return (
    <div className="space-y-4 animate-fadeIn pb-20">
      {/* ─── 상점 ─── */}
      <CardMarket />

      {/* ─── 스쿼드 ─── */}
      <div className="flex justify-between items-center mb-2 px-1">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <Users size={20} className="text-green-600" /> 스쿼드
        </h2>
        <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2.5 py-1.5 rounded-md">
          총 0명
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="w-10 text-center">OVR</div>
          <div className="flex-1 ml-3">선수</div>
          <div className="w-14 text-center">컨디션</div>
          <div className="w-14 text-center">경기P</div>
        </div>
        <div className="px-4 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <Users size={22} />
          </div>
          <p className="text-sm font-bold text-gray-700">등록된 스쿼드가 없어요</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-gray-400">
            승인된 회원 프로필이 준비되면 이곳에 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
