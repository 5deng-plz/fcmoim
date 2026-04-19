'use client';

import { Users } from 'lucide-react';
import MemberRow from '@/components/features/MemberRow';
import CardMarket from '@/components/features/CardMarket';
import type { Position } from '@/types';

const members = [
  {
    id: 1, name: '손흥민', mainPos: 'FW', subPos: 'MF', ovr: 72, cond: 'up' as const,
    goal: 5, asst: 2, photo: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=150&fit=crop',
    radar: [88, 85, 80, 50, 75, 89], heatmap: 'FW' as Position,
    traits: ['유리멘탈', '저질체력', '5연패'],
    badges: [
      { name: '마수걸이', color: 'amber' },
      { name: 'MOM x3', color: 'sky' },
      { name: '개근상', color: 'emerald' },
    ],
  },
  {
    id: 2, name: '이강인', mainPos: 'MF', subPos: 'FW', ovr: 68, cond: 'up' as const,
    goal: 1, asst: 5, photo: 'https://images.unsplash.com/photo-1518605368461-1e1e38ce1042?w=150&fit=crop',
    radar: [78, 80, 92, 60, 68, 90], heatmap: 'MF' as Position,
    traits: ['철의 폐활량', '패스 마스터', '왼발만'],
    badges: [
      { name: '어시왕', color: 'sky' },
      { name: '출전 10회', color: 'emerald' },
      { name: '친선 MVP', color: 'amber' },
    ],
  },
];

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
          총 24명
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          <div className="w-10 text-center">OVR</div>
          <div className="flex-1 ml-3">선수</div>
          <div className="w-14 text-center">컨디션</div>
          <div className="w-14 text-center">경기P</div>
        </div>
        <div className="divide-y divide-gray-50">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
