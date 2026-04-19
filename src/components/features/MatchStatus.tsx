'use client';

import { useState } from 'react';

import { useAppStore } from '@/stores/useAppStore';
import Badge from '@/components/ui/Badge';
import AttendeeList from './AttendeeList';
import MatchResult from './MatchResult';
import MatchComments from './MatchComments';
import TacticsDragBuilder from './TacticsDragBuilder';
import { Users, MapPin, Crosshair } from 'lucide-react';
import Image from 'next/image';

interface MatchStatusProps {
  status: '예정' | '라커룸' | '종료';
  tacticsCompleted?: boolean;
  type?: 'match' | 'vote_match' | 'training' | 'seminar' | 'etc';
}

export default function MatchStatus({ status, tacticsCompleted = false, type = 'match' }: MatchStatusProps) {
  const { userRole } = useAppStore();
  const [showTacticsBuilder, setShowTacticsBuilder] = useState(false);

  const isLeader = userRole === 'admin' || userRole === 'operator';

  if (status === '예정') {
    return (
      <section className="animate-fadeIn space-y-4">
        <div className="flex items-center gap-2 px-1">
          <h3 className="font-bold text-gray-900 text-lg">
            {type === 'vote_match' ? '⚽ 친선 경기 투표' : 'R7 정규 리그'}
          </h3>
          <Badge 
            label={type === 'vote_match' ? '투표진행중' : '예정'} 
            variant={type === 'vote_match' ? 'yellow' : 'red'} 
            pulse={type === 'vote_match'}
          />
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600 mb-3">
            3월 14일 (토) 오후 19:00 · 서울 용산 풋살장
          </p>
          {(type === 'training' || type === 'seminar') && (
            <div className="w-full bg-gray-50 rounded-xl mb-3 border border-gray-200 overflow-hidden cursor-pointer hover:border-gray-300 transition-colors">
              <div className="h-24 bg-gray-200 relative">
                <Image
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&fit=crop"
                  alt="지도"
                  fill
                  className="object-cover opacity-80"
                  unoptimized
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                    <MapPin size={12} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-gray-700">카카오맵 열기</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <AttendeeList count={7} total={10} />
        </div>
        <MatchComments matchDate={new Date('2026-03-21T19:00:00')} />
      </section>
    );
  }

  if (status === '라커룸') {
    if (tacticsCompleted) {
      return (
        <section className="animate-fadeIn space-y-4">
          <div className="flex items-center gap-2 px-1">
            <h3 className="font-bold text-gray-900 text-lg">R7 정규 리그</h3>
            <Badge label="팀 확정" variant="green" />
          </div>
          <div className="card p-4">
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-red-50 rounded-xl p-3 border border-red-100 shadow-sm flex flex-col items-center">
                <div className="w-6 h-6 bg-red-500 rounded-full mb-2 flex items-center justify-center shadow-inner">
                  <div className="w-4 h-4 rounded-full border-2 border-white/50" />
                </div>
                <div className="space-y-1 text-sm text-gray-700 text-center w-full">
                  <p className="font-bold border-b border-red-200 pb-1 mb-1">손흥민 👑</p>
                  <p>김민재</p>
                  <p>황희찬</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 shadow-sm flex flex-col items-center">
                <div className="w-6 h-6 bg-blue-500 rounded-full mb-2 flex items-center justify-center shadow-inner">
                  <div className="w-4 h-4 rounded-full border-2 border-white/50" />
                </div>
                <div className="space-y-1 text-sm text-gray-700 text-center w-full">
                  <p className="font-bold border-b border-blue-200 pb-1 mb-1">이강인 👑</p>
                  <p>조규성</p>
                  <p>이재성</p>
                </div>
              </div>
            </div>
          </div>
          <MatchComments matchDate={new Date('2026-03-14T19:00:00')} />
        </section>
      );
    }

    // ─── 감독(리더): 전술 설정 진입 가능 ───
    if (isLeader) {
      return (
        <section className="animate-fadeIn space-y-4">
          <div className="flex items-center gap-2 px-1">
            <h3 className="font-bold text-gray-900 text-lg">R7 정규 리그</h3>
            <Badge label="전술설정중 (라커룸)" variant="orange" pulse />
          </div>

          {showTacticsBuilder ? (
            <TacticsDragBuilder />
          ) : (
            <div className="card p-5 text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Crosshair size={28} className="text-orange-500" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">
                전술설정 대기 중
              </p>
              <p className="text-xs text-gray-400 mb-4">
                팀 편성을 완료해주세요
              </p>
              <button
                onClick={() => setShowTacticsBuilder(true)}
                className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Crosshair size={16} />
                전술 설정 시작
              </button>
            </div>
          )}
          
          <div className="text-left">
            <p className="text-[11px] font-bold text-gray-500 mb-2 px-1">현재 라커룸 대기 인원</p>
            <div className="card p-4">
              <AttendeeList count={10} total={10} />
            </div>
          </div>
          <MatchComments matchDate={new Date('2026-03-14T19:00:00')} />
        </section>
      );
    }

    // ─── 일반 회원: 대기 화면 ───
    return (
      <section className="animate-fadeIn space-y-4">
        <div className="flex items-center gap-2 px-1">
          <h3 className="font-bold text-gray-900 text-lg">R7 정규 리그</h3>
          <Badge label="전술설정중 (라커룸)" variant="orange" pulse />
        </div>
        <div className="card p-5 text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users size={28} className="text-orange-400" />
          </div>
          <p className="text-sm font-bold text-gray-900 mb-1">
            감독이 전술설정 중입니다 ⚽️
          </p>
          <p className="text-xs text-gray-400 mb-4">
            팀이 확정되면 여기서 결과를 확인할 수 있어요
          </p>
          
          <div className="text-left border-t border-gray-100 pt-4 mt-2">
            <p className="text-[11px] font-bold text-gray-500 mb-2">현재 라커룸 대기 인원</p>
            <AttendeeList count={10} total={10} />
          </div>
        </div>
        <MatchComments matchDate={new Date('2026-03-14T19:00:00')} />
      </section>
    );
  }

  // 종료
  return (
    <section className="animate-fadeIn space-y-4">
      <MatchResult />
      <MatchComments matchDate={new Date('2026-03-07T19:00:00')} />
    </section>
  );
}
