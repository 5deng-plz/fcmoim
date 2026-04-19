'use client';

import { TrendingUp, Minus, TrendingDown, ChevronUp, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useMembersStore } from '@/stores/useMembersStore';
import MemberDetail from '@/components/features/MemberDetail';
import type { Position } from '@/types';

interface BadgeData {
  name: string;
  color: string;
}

interface MemberData {
  id: number;
  name: string;
  mainPos: string;
  subPos: string | null;
  ovr: number;
  cond: 'up' | 'flat' | 'down';
  goal: number;
  asst: number;
  photo: string;
  radar: number[];
  heatmap: Position;
  traits: string[];
  badges: BadgeData[];
}

interface MemberRowProps {
  member: MemberData;
}

export default function MemberRow({ member: m }: MemberRowProps) {
  const { expandedMemberId, toggleMember } = useMembersStore();
  const isExpanded = expandedMemberId === m.id;

  return (
    <div className="flex flex-col bg-white transition-colors">
      <div
        onClick={() => toggleMember(m.id)}
        className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
          isExpanded ? 'bg-green-50/20' : ''
        }`}
      >
        <div className="w-10 h-10 flex items-center justify-center">
          <span className="text-sm font-black text-green-600 leading-none">{m.ovr}</span>
        </div>
        <div className="flex-1 ml-4 flex items-center gap-2.5">
          <Image
            className="w-9 h-9 rounded-full bg-gray-200 object-cover border border-gray-100"
            src={m.photo}
            alt={m.name}
            width={36}
            height={36}
            unoptimized
          />
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">
              {m.name}
            </div>
            <div className="text-[9px] font-bold text-gray-400 mt-0.5">
              {m.mainPos}{' '}
              {m.subPos && <span className="opacity-70">/ {m.subPos}</span>}
            </div>
          </div>
        </div>
        <div className="w-14 flex justify-center">
          {m.cond === 'up' && (
            <TrendingUp className="text-red-500" size={18} strokeWidth={3} />
          )}
          {m.cond === 'flat' && (
            <Minus className="text-yellow-500" size={18} strokeWidth={3} />
          )}
          {m.cond === 'down' && (
            <TrendingDown className="text-blue-500" size={18} strokeWidth={3} />
          )}
        </div>
        <div className="w-14 text-center flex items-center justify-center gap-1">
          <span className="font-black text-gray-800 text-sm">
            {m.goal + m.asst}
          </span>
          {isExpanded ? (
            <ChevronUp size={16} className="text-gray-400 ml-1" />
          ) : (
            <ChevronDown size={16} className="text-gray-400 ml-1" />
          )}
        </div>
      </div>

      <div
        className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden bg-[#0f172a] ${
          isExpanded
            ? 'max-h-[800px] opacity-100 border-t border-slate-800'
            : 'max-h-0 opacity-0'
        }`}
      >
        {isExpanded && <MemberDetail member={m} />}
      </div>
    </div>
  );
}
