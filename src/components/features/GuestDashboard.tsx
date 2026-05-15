'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, ChevronRight, Eye, Shield, Trophy, Users } from 'lucide-react';
import FcmoimLogo from '@/components/brand/FcmoimLogo';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  fetchPublicClubDetail,
  fetchPublicClubs,
  type PublicClubDetail,
  type PublicClubSummary,
} from '@/stores/membershipClient';
import { useToastStore } from '@/stores/useToastStore';

export default function GuestDashboard() {
  const { selectedJoinClubId, setSelectedJoinClubId } = useAppStore();
  const { signInKakao } = useAuthStore();
  const { showToast } = useToastStore();
  const [clubs, setClubs] = useState<PublicClubSummary[]>([]);
  const [clubDetail, setClubDetail] = useState<PublicClubDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    fetchPublicClubs()
      .then((publicClubs) => {
        if (!isActive) return;
        setClubs(publicClubs);
        const selectedClub = publicClubs.find((club) => club.id === selectedJoinClubId) || publicClubs[0];
        if (selectedClub) {
          setSelectedJoinClubId(selectedClub.id);
          return fetchPublicClubDetail(selectedClub.id);
        }
        return null;
      })
      .then((detail) => {
        if (!isActive) return;
        setClubDetail(detail ?? null);
      })
      .catch((error) => {
        console.error('[FC Moim] Public club load failed:', error);
        showToast('팀 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedJoinClubId, setSelectedJoinClubId, showToast]);

  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedJoinClubId) || clubs[0] || null,
    [clubs, selectedJoinClubId],
  );

  const handleSelectClub = async (clubId: string) => {
    setSelectedJoinClubId(clubId);
    setIsLoading(true);
    try {
      setClubDetail(await fetchPublicClubDetail(clubId));
    } catch (error) {
      console.error('[FC Moim] Public club detail failed:', error);
      showToast('팀 상세를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (selectedClub) {
      setSelectedJoinClubId(selectedClub.id);
    }
    await signInKakao();
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
      <div className="sticky top-0 z-10 bg-fee-partial/10 border-b border-fee-partial/20 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-fee-partial" />
          <span className="text-xs font-bold text-fee-partial">팀 둘러보기</span>
        </div>
        <button
          onClick={() => void signInKakao()}
          className="text-[11px] font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full hover:bg-green-200 active:scale-95 transition-all"
        >
          카카오로 시작하기
        </button>
      </div>

      <div className="p-4 space-y-5 pb-24">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">팀 둘러보기</h2>
            <span className="text-[11px] font-bold text-gray-400">{clubs.length}개 팀</span>
          </div>

          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => void handleSelectClub(club.id)}
              className={`w-full rounded-xl border bg-white p-3 text-left transition-all active:scale-[0.99] ${
                selectedClub?.id === club.id ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50">
                  <FcmoimLogo size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-gray-900">{club.name}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs font-medium text-gray-400">
                    {club.description || '공개 소개가 준비 중입니다.'}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </button>
          ))}
        </section>

        {isLoading ? (
          <div className="py-16 text-center text-sm font-bold text-gray-400">팀 정보를 불러오는 중입니다</div>
        ) : clubDetail ? (
          <section className="space-y-4">
            <div className="text-center py-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                <FcmoimLogo size={38} />
              </div>
              <h1 className="mt-3 text-xl font-black text-gray-900">{clubDetail.name}</h1>
              <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">
                {clubDetail.description || '팀 소개가 준비 중입니다.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Metric icon={<Users size={16} />} label="승인 멤버" value={`${clubDetail.memberCount}`} />
              <Metric icon={<Trophy size={16} />} label="시즌" value={clubDetail.activeSeason?.name || '-'} />
              <Metric icon={<CalendarDays size={16} />} label="예정 경기" value={`${clubDetail.upcomingMatchCount}`} />
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Shield size={16} className="text-green-600" />
                <h3 className="text-sm font-black text-gray-900">공개 경기 요약</h3>
              </div>
              <div className="space-y-2">
                {[...clubDetail.upcomingMatches, ...clubDetail.recentMatches].slice(0, 3).map((match) => (
                  <div key={match.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-gray-800">{match.title}</p>
                      <p className="text-[11px] font-medium text-gray-400">{match.location}</p>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">
                      {new Date(match.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
                {clubDetail.upcomingMatches.length + clubDetail.recentMatches.length === 0 ? (
                  <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-xs font-bold text-gray-400">
                    공개 가능한 경기 일정이 아직 없어요
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-8">
        <button
          onClick={() => void handleJoin()}
          className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-gray-800 active:scale-[0.98] transition-all shadow-lg"
        >
          입단신청
        </button>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center text-green-600">
        {icon}
      </div>
      <span className="block truncate text-base font-black text-gray-900">{value}</span>
      <p className="text-[9px] font-medium text-gray-400">{label}</p>
    </div>
  );
}
