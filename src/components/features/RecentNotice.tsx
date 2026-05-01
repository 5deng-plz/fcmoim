'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Megaphone, Pin, Vote } from 'lucide-react';
import { appConfig } from '@/config/app.config';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { getSchedulePollErrorMessage, type SchedulePoll, type SchedulePollOption } from '@/stores/schedulePollClient';
import { useToastStore } from '@/stores/useToastStore';
import Badge from '@/components/ui/Badge';
import AttendeeList from '@/components/features/AttendeeList';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export default function RecentNotice() {
  const { userRole, userStatus } = useAppStore();
  const { openModal } = useModalStore();
  const { showToast } = useToastStore();
  const {
    activePolls,
    activePollsStatus,
    activePollsError,
    loadActivePolls,
    submitPollVote,
  } = useScheduleStore();
  const isAdmin = userRole === 'admin' || userRole === 'operator';
  const canVote = userStatus === 'approved';
  
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [selectedByPollId, setSelectedByPollId] = useState<Record<string, string[]>>({});
  const [submittingPollId, setSubmittingPollId] = useState<string | null>(null);
  const [voteErrors, setVoteErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (appConfig.useMockData) return;

    let ignore = false;

    void loadActivePolls().catch((error) => {
      if (ignore) return;
      showToast(getSchedulePollErrorMessage(error, '일정 투표를 불러오지 못했어요.'));
    });

    return () => {
      ignore = true;
    };
  }, [loadActivePolls, showToast]);

  const handlePollSelect = (pollId: string, optionId: string) => {
    if (!canVote || submittingPollId === pollId) return;

    setSelectedByPollId((prev) => {
      const current = prev[pollId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];

      return { ...prev, [pollId]: next };
    });
  };

  const handleSubmitVote = async (poll: SchedulePoll) => {
    const selectedOptionIds = selectedByPollId[poll.id] ?? [];

    if (!canVote) {
      const message = '승인된 회원만 일정 투표에 참여할 수 있어요.';
      setVoteErrors((prev) => ({ ...prev, [poll.id]: message }));
      showToast(message);
      return;
    }

    if (selectedOptionIds.length === 0) {
      const message = '가능한 날짜를 1개 이상 선택해주세요.';
      setVoteErrors((prev) => ({ ...prev, [poll.id]: message }));
      showToast(message);
      return;
    }

    setSubmittingPollId(poll.id);
    setVoteErrors((prev) => ({ ...prev, [poll.id]: null }));

    try {
      await submitPollVote({
        clubId: poll.clubId,
        pollId: poll.id,
        selectedOptionIds,
      });
      showToast('투표가 저장되었어요!');
    } catch (error) {
      const message = getSchedulePollErrorMessage(error, '투표를 저장하지 못했어요.');
      setVoteErrors((prev) => ({ ...prev, [poll.id]: message }));
      showToast(message);
    } finally {
      setSubmittingPollId(null);
    }
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <h2 className="text-base font-black text-gray-900">공지사항</h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => openModal('announcementCreate')}
              className="text-xs font-bold text-green-600 hover:text-green-700 active:scale-95 transition-all"
            >
              작성하기
            </button>
          )}
          <button
            onClick={() => useAppStore.getState().setShowCommunity(true)}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 active:scale-95 transition-all"
          >
            더보기
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {activePollsStatus === 'loading' && !appConfig.useMockData ? (
          <div role="status" className="card p-4 text-xs font-bold text-gray-500">
            일정 투표를 불러오는 중입니다
          </div>
        ) : null}

        {activePollsStatus === 'error' && activePollsError ? (
          <div role="alert" className="card border-red-100 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-600">{activePollsError}</p>
            <button
              type="button"
              onClick={() => {
                void loadActivePolls().catch((error) => {
                  showToast(getSchedulePollErrorMessage(error, '일정 투표를 불러오지 못했어요.'));
                });
              }}
              className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-600 shadow-sm active:scale-95"
            >
              다시 시도
            </button>
          </div>
        ) : null}

        {activePolls.map((poll) => {
          const isExpanded = expandedPollId === poll.id;
          const selectedOptionIds = selectedByPollId[poll.id] ?? [];
          const isSubmitting = submittingPollId === poll.id;
          const voteError = voteErrors[poll.id];
          const submitDisabled = !canVote || selectedOptionIds.length === 0 || isSubmitting;

          return (
            <section key={poll.id} className="card card-gold-shimmer overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                aria-expanded={isExpanded}
                aria-controls={`poll-options-${poll.id}`}
                className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
                    <Vote size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
                      <h3 className="min-w-0 text-sm font-black leading-snug text-gray-900">
                        {poll.title}
                      </h3>
                      <Badge label="투표중" variant="amber" className="shrink-0" />
                    </div>
                    <p className="text-xs font-medium leading-snug text-gray-500">
                      {poll.memo || '가능한 일정을 모두 선택해주세요'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-gray-400">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {isExpanded && (
                <div id={`poll-options-${poll.id}`} className="p-4 pt-0 border-t border-gray-50 bg-gray-50/50">
                  <div className="mt-3 grid gap-3">
                    {poll.options.map((option) => {
                      const isSelected = selectedOptionIds.includes(option.id);
                      const optionDisabled = !canVote || isSubmitting;

                      return (
                        <label
                          key={option.id}
                          className={`block rounded-xl border p-3 transition-all ${
                            optionDisabled
                              ? 'cursor-not-allowed opacity-70'
                              : 'cursor-pointer'
                          } ${
                            isSelected
                              ? 'border-yellow-400 bg-yellow-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${isSelected ? 'border-yellow-500 bg-yellow-500' : 'border-gray-300 bg-white'}`}>
                              {isSelected && <div className="h-2.5 w-2.5 rounded-sm bg-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 text-sm font-bold leading-snug text-gray-900">
                                {formatPollOption(poll, option)}
                              </div>
                              <AttendeeList count={getOptionVoteCount(poll, option)} total={getOptionVoteTotal(poll, option)} />
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            className="sr-only"
                            disabled={optionDisabled}
                            checked={isSelected}
                            onChange={() => handlePollSelect(poll.id, option.id)}
                          />
                        </label>
                      );
                    })}
                  </div>

                  {!canVote ? (
                    <p role="status" className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-500">
                      승인된 회원만 일정 투표에 참여할 수 있어요.
                    </p>
                  ) : null}

                  {voteError ? (
                    <p role="alert" className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                      {voteError}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={submitDisabled}
                      onClick={() => void handleSubmitVote(poll)}
                      className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                        submitDisabled
                          ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                          : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-95'
                      }`}
                    >
                      {!canVote ? '승인 후 투표 가능' : isSubmitting ? '저장 중...' : '투표 제출하기'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}

        <div className="card card-interactive p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0">
            <Megaphone size={18} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Pin size={12} className="text-red-500 shrink-0" />
              <p className="text-sm font-bold text-gray-900 truncate">
                25/26 새 시즌 OVR 초기화 안내
              </p>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              운영진 · 2시간 전
            </p>
          </div>
        </div>
        <div className="card card-interactive p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
            <Megaphone size={18} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              3월 회식 장소 투표 안내
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              운영진 · 1일 전
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatPollOption(poll: SchedulePoll, option: SchedulePollOption) {
  const [year, month, day] = option.optionDate.split('-').map(Number);
  const weekday = weekdays[new Date(year, month - 1, day).getDay()] ?? '';
  const time = option.displayTime || poll.commonTime;
  const location = option.displayLocation || poll.location;

  return `${month}월 ${day}일 ${weekday} ${time} · ${location}`;
}

function getOptionVoteCount(poll: SchedulePoll, option: SchedulePollOption) {
  if (typeof option.demoVoteCount === 'number') {
    return option.demoVoteCount;
  }

  return poll.votes.filter((vote) => vote.optionId === option.id && vote.isAvailable).length;
}

function getOptionVoteTotal(poll: SchedulePoll, option: SchedulePollOption) {
  if (typeof option.demoTotalCount === 'number') {
    return option.demoTotalCount;
  }

  const uniqueVoters = new Set(poll.votes.map((vote) => vote.membershipId));
  return Math.max(uniqueVoters.size, getOptionVoteCount(poll, option), 1);
}
