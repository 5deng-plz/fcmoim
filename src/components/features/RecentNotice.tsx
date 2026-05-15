'use client';

import { useEffect, useRef, useState } from 'react';
import { Ban, CalendarCheck2, ChevronDown, ChevronUp, Megaphone, Pin, Vote } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { getSchedulePollErrorMessage, type SchedulePoll, type SchedulePollOption } from '@/stores/schedulePollClient';
import { useToastStore } from '@/stores/useToastStore';
import Badge from '@/components/ui/Badge';
import AttendeeList from '@/components/features/AttendeeList';
import Modal from '@/components/ui/Modal';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export default function RecentNotice() {
  const { userRole, userStatus, activeClubId } = useAppStore();
  const { openModal } = useModalStore();
  const { showToast } = useToastStore();
  const {
    activePolls,
    activePollsStatus,
    activePollsError,
    loadActivePolls,
    loadUpcomingMatches,
    cancelPoll,
    promotePoll,
    submitPollVote,
  } = useScheduleStore();
  const isAdmin = userRole === 'admin' || userRole === 'operator';
  const canVote = userStatus === 'approved';
  
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [selectedByPollId, setSelectedByPollId] = useState<Record<string, string[]>>({});
  const [submittingPollId, setSubmittingPollId] = useState<string | null>(null);
  const [cancellingPollId, setCancellingPollId] = useState<string | null>(null);
  const [promotingPollId, setPromotingPollId] = useState<string | null>(null);
  const [voteErrors, setVoteErrors] = useState<Record<string, string | null>>({});
  const [cancelTargetPoll, setCancelTargetPoll] = useState<SchedulePoll | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<{ poll: SchedulePoll; option: SchedulePollOption } | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const swipeStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (activePollsStatus !== 'idle') return;

    void loadActivePolls(activeClubId).catch((error) => {
      showToast(getSchedulePollErrorMessage(error, '일정 투표를 불러오지 못했어요.'));
    });
  }, [activeClubId, activePollsStatus, loadActivePolls, showToast]);

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

  const handlePollSwipeEnd = (pollId: string, clientX: number | null) => {
    if (swipeStartXRef.current === null || clientX === null) {
      swipeStartXRef.current = null;
      return;
    }

    const deltaX = clientX - swipeStartXRef.current;
    swipeStartXRef.current = null;
    if (Math.abs(deltaX) < 56) return;

    setExpandedPollId(deltaX < 0 ? pollId : null);
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

  const handleCancelPoll = async () => {
    if (!cancelTargetPoll) return;

    const normalizedReason = cancellationReason.trim();
    if (!normalizedReason) {
      const message = '취소 사유를 입력해주세요.';
      setCancelError(message);
      showToast(message);
      return;
    }

    setCancellingPollId(cancelTargetPoll.id);
    setCancelError(null);

    try {
      await cancelPoll({
        clubId: cancelTargetPoll.clubId,
        pollId: cancelTargetPoll.id,
        cancellationReason: normalizedReason,
      });
      showToast('일정 투표가 취소되었어요.');
      setCancelTargetPoll(null);
      setCancellationReason('');
    } catch (error) {
      const message = getSchedulePollErrorMessage(error, '일정 투표를 취소하지 못했어요.');
      setCancelError(message);
      showToast(message);
    } finally {
      setCancellingPollId(null);
    }
  };

  const handlePromotePoll = async () => {
    if (!promoteTarget) return;

    setPromotingPollId(promoteTarget.poll.id);
    setPromoteError(null);

    try {
      await promotePoll({
        clubId: promoteTarget.poll.clubId,
        pollId: promoteTarget.poll.id,
        optionId: promoteTarget.option.id,
      });
      await loadUpcomingMatches(promoteTarget.poll.clubId).catch(() => {
        // The promoted poll state is enough for immediate feedback; upcoming match reload can retry later.
      });
      showToast('일정 투표가 확정되었어요.');
      setPromoteTarget(null);
    } catch (error) {
      const message = getSchedulePollErrorMessage(error, '일정 투표를 확정하지 못했어요.');
      setPromoteError(message);
      showToast(message);
    } finally {
      setPromotingPollId(null);
    }
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <h2 className="text-base font-extrabold text-gray-900">공지사항</h2>
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
        {activePollsStatus === 'loading' ? (
          <div role="status" className="card p-4 text-xs font-bold text-gray-500">
            일정 투표를 불러오는 중입니다
          </div>
        ) : null}

        {activePollsStatus === 'error' && activePollsError ? (
          <div role="alert" className="card border-feedback-error-border bg-feedback-error-bg p-4">
            <p className="text-sm font-bold text-feedback-error">{activePollsError}</p>
            <button
              type="button"
              onClick={() => {
                void loadActivePolls(activeClubId).catch((error) => {
                  showToast(getSchedulePollErrorMessage(error, '일정 투표를 불러오지 못했어요.'));
                });
              }}
              className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-feedback-error shadow-sm active:scale-95"
            >
              다시 시도
            </button>
          </div>
        ) : null}

        {activePolls.map((poll) => {
          const isExpanded = expandedPollId === poll.id;
          const selectedOptionIds = selectedByPollId[poll.id] ?? [];
          const isSubmitting = submittingPollId === poll.id;
          const isCancelling = cancellingPollId === poll.id;
          const isPromoting = promotingPollId === poll.id;
          const isCancelled = poll.status === 'cancelled';
          const isPromoted = poll.status === 'promoted';
          const voteError = voteErrors[poll.id];
          const submitDisabled = isCancelled || isPromoted || !canVote || selectedOptionIds.length === 0 || isSubmitting;

          return (
            <section key={poll.id} className="card card-gold-shimmer overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                onTouchStart={(event) => {
                  swipeStartXRef.current = event.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(event) => {
                  handlePollSwipeEnd(poll.id, event.changedTouches[0]?.clientX ?? null);
                }}
                aria-expanded={isExpanded}
                aria-controls={`poll-options-${poll.id}`}
                className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-feedback-warning-bg text-feedback-warning">
                    <Vote size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="mb-0.5 min-w-0 text-sm font-bold leading-snug text-gray-900">
                      {poll.title}
                    </h3>
                    <p className="text-xs font-medium leading-snug text-gray-500">
                      {poll.memo || '가능한 일정을 모두 선택해주세요'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-gray-400">
                  {isPromoted ? (
                    <Badge
                      label="확정"
                      variant="green"
                      className="border border-green-200 bg-green-100 text-green-700 shadow-sm"
                    />
                  ) : isCancelled ? (
                    <Badge
                      label="취소"
                      variant="gray"
                      className="border border-gray-200 bg-gray-100 text-gray-600 shadow-sm"
                    />
                  ) : (
                    <Badge
                      label="투표중"
                      variant="red"
                      className="border border-feedback-warning-border bg-feedback-warning-bg text-feedback-warning shadow-sm"
                    />
                  )}
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {isExpanded && (
                <div id={`poll-options-${poll.id}`} className="p-4 pt-0 border-t border-gray-50 bg-gray-50/50">
                  {isPromoted ? (
                    <div className="mt-3 rounded-xl border border-green-200 bg-white px-3 py-2.5">
                      <p className="text-xs font-bold text-green-700">확정 일정으로 전환되었어요</p>
                    </div>
                  ) : isCancelled ? (
                    <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                      <p className="text-xs font-bold text-gray-700">취소 사유: {poll.cancellationReason}</p>
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-3">
                    {poll.options.map((option) => {
                      const isSelected = selectedOptionIds.includes(option.id);
                      const optionDisabled = isCancelled || isPromoted || !canVote || isSubmitting || isPromoting;

                      return (
                        <div
                          key={option.id}
                          className={`block rounded-xl border p-3 transition-all ${
                            optionDisabled
                              ? 'cursor-not-allowed opacity-70'
                              : 'cursor-pointer'
                          } ${
                            isSelected
                              ? 'border-feedback-warning bg-feedback-warning-bg'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${isSelected ? 'border-feedback-warning bg-feedback-warning' : 'border-gray-300 bg-white'}`}>
                                {isSelected && <div className="h-2.5 w-2.5 rounded-sm bg-white" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 text-sm font-bold leading-snug text-gray-900">
                                  {formatPollOption(poll, option)}
                                </div>
                                <AttendeeList count={getOptionVoteCount(poll, option)} total={getOptionVoteTotal(poll, option)} />
                              </div>
                              <input
                                type="checkbox"
                                className="sr-only"
                                disabled={optionDisabled}
                                checked={isSelected}
                                onChange={() => handlePollSelect(poll.id, option.id)}
                              />
                            </label>
                            {isAdmin && !isCancelled && !isPromoted ? (
                              <button
                                type="button"
                                disabled={isPromoting || isSubmitting}
                                onClick={() => {
                                  setPromoteTarget({ poll, option });
                                  setPromoteError(null);
                                }}
                                className="shrink-0 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition-all hover:bg-green-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                확정
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!isCancelled && !isPromoted && !canVote ? (
                    <p role="status" className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-500">
                      승인된 회원만 일정 투표에 참여할 수 있어요.
                    </p>
                  ) : null}

                  {voteError ? (
                    <p role="alert" className="mt-3 rounded-lg border border-feedback-error-border bg-feedback-error-bg px-3 py-2 text-xs font-bold text-feedback-error">
                      {voteError}
                    </p>
                  ) : null}

                  {!isCancelled && !isPromoted ? (
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
                  ) : null}

                  {isAdmin && !isCancelled && !isPromoted ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={() => {
                          setCancelTargetPoll(poll);
                          setCancellationReason('');
                          setCancelError(null);
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-feedback-error-border bg-white px-4 py-3 text-sm font-bold text-feedback-error transition-all hover:bg-feedback-error-bg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Ban size={16} />
                        {isCancelling ? '취소 중...' : '일정 취소'}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          );
        })}

        {activePollsStatus === 'ready' && activePolls.length === 0 ? (
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
              <Megaphone size={18} className="text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Pin size={12} className="text-gray-300 shrink-0" />
                <p className="text-sm font-bold text-gray-700 truncate">
                  표시할 공지나 일정 투표가 없어요
                </p>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                새 공지가 등록되면 이곳에 표시됩니다
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        title="일정 투표 취소"
        isOpen={cancelTargetPoll !== null}
        onClose={() => {
          if (cancellingPollId) return;
          setCancelTargetPoll(null);
          setCancellationReason('');
          setCancelError(null);
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">취소 사유</label>
            <textarea
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value)}
              placeholder="예: 강설로 인한 취소"
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-feedback-error focus:outline-none"
            />
          </div>
          {cancelError ? (
            <p role="alert" className="rounded-lg border border-feedback-error-border bg-feedback-error-bg px-3 py-2 text-xs font-bold text-feedback-error">
              {cancelError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={cancellingPollId !== null}
            onClick={() => void handleCancelPoll()}
            className="w-full rounded-xl bg-feedback-error px-4 py-3 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {cancellingPollId ? '취소 중...' : '취소 처리하기'}
          </button>
        </div>
      </Modal>

      <Modal
        title="일정 투표 확정"
        isOpen={promoteTarget !== null}
        onClose={() => {
          if (promotingPollId) return;
          setPromoteTarget(null);
          setPromoteError(null);
        }}
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
            <CalendarCheck2 size={22} />
          </div>
          <p className="text-sm font-bold leading-relaxed text-gray-900">
            {promoteTarget ? formatPollOption(promoteTarget.poll, promoteTarget.option) : ''}
          </p>
          <p className="text-xs font-semibold leading-relaxed text-gray-500">
            이 후보 일정으로 확정 경기 일정을 만들고 투표를 종료합니다.
          </p>
          {promoteError ? (
            <p role="alert" className="rounded-lg border border-feedback-error-border bg-feedback-error-bg px-3 py-2 text-xs font-bold text-feedback-error">
              {promoteError}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={promotingPollId !== null}
              onClick={() => void handlePromotePoll()}
              className="rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {promotingPollId ? '확정 중...' : '확정하기'}
            </button>
            <button
              type="button"
              disabled={promotingPollId !== null}
              onClick={() => {
                setPromoteTarget(null);
                setPromoteError(null);
              }}
              className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              닫기
            </button>
          </div>
        </div>
      </Modal>
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
  return poll.votes.filter((vote) => vote.optionId === option.id && vote.isAvailable).length;
}

function getOptionVoteTotal(poll: SchedulePoll, option: SchedulePollOption) {
  const uniqueVoters = new Set(poll.votes.map((vote) => vote.membershipId));
  return Math.max(uniqueVoters.size, getOptionVoteCount(poll, option), 1);
}
