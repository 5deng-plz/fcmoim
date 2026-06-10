'use client';

import { useEffect, useRef, useState } from 'react';
import { Ban, CalendarCheck2, ChevronDown, ChevronUp, Clock3, Frown, MapPin, Megaphone, Pin, Vote } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useAnnouncementStore } from '@/stores/useAnnouncementStore';
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
  const {
    announcements,
    announcementsStatus,
    loadAnnouncements,
  } = useAnnouncementStore();
  const isAdmin = userRole === 'admin' || userRole === 'operator';
  const canVote = userStatus === 'approved';
  const pinnedAnnouncements = announcements.filter((announcement) => announcement.isPinned);
  
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

  useEffect(() => {
    if (announcementsStatus !== 'idle') return;

    void loadAnnouncements(activeClubId).catch((error) => {
      showToast(error instanceof Error ? error.message : '공지사항을 불러오지 못했어요.');
    });
  }, [activeClubId, announcementsStatus, loadAnnouncements, showToast]);

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

  const handleSubmitAbsence = async (poll: SchedulePoll) => {
    if (!canVote) {
      const message = '승인된 회원만 일정 투표에 참여할 수 있어요.';
      setVoteErrors((prev) => ({ ...prev, [poll.id]: message }));
      showToast(message);
      return;
    }

    setSubmittingPollId(poll.id);
    setVoteErrors((prev) => ({ ...prev, [poll.id]: null }));
    setSelectedByPollId((prev) => ({ ...prev, [poll.id]: [] }));

    try {
      await submitPollVote({
        clubId: poll.clubId,
        pollId: poll.id,
        selectedOptionIds: [],
      });
      showToast('불참 응답이 저장되었어요.');
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
        <div className="inline-flex items-center gap-1.5 rounded-full header-badge-amber px-3 py-1 text-xs font-extrabold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full dot-amber opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 dot-amber"></span>
          </span>
          공지사항
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal('announcementCreate')}
              className="text-xs font-bold text-feedback-success hover:text-feedback-success/80 active:scale-95 transition-all"
            >
              작성하기
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {activePollsStatus === 'loading' ? (
          <div role="status" className="card p-4 text-xs font-bold text-secondary">
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
              className="mt-3 rounded-lg bg-surface-card border border-feedback-error-border/30 px-3 py-2 text-xs font-bold text-feedback-error shadow-sm active:scale-95"
            >
              다시 시도
            </button>
          </div>
        ) : null}

        {pinnedAnnouncements.map((announcement) => (
          <section key={announcement.id} className="card overflow-hidden rounded-xl">
            <button
              type="button"
              onClick={() => useAppStore.getState().setActiveTab('community')}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-surface-hover transition-colors"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-highlight-rose-bg text-highlight-rose">
                  <Pin size={17} />
                </div>
                <div className="min-w-0">
                  <h3 className="mb-0.5 min-w-0 truncate text-sm font-bold leading-snug text-primary">
                    {announcement.title}
                  </h3>
                  <p className="truncate text-xs font-medium leading-snug text-secondary">
                    {announcement.content}
                  </p>
                </div>
              </div>
              <Megaphone size={18} className="shrink-0 text-tertiary" />
            </button>
          </section>
        ))}

        {activePolls.slice(0, 2).map((poll) => {
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
            <section key={poll.id} className="card border-event-vote-border bg-event-vote-bg overflow-hidden rounded-xl">
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
                className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-event-vote-bg/50 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-event-vote-icon-bg text-event-vote-icon-text">
                    <Vote size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="mb-0.5 min-w-0 text-sm font-bold leading-snug text-primary">
                      {poll.title}
                    </h3>
                    <p className="text-xs font-medium leading-snug text-secondary">
                      {poll.memo || '가능한 일정을 모두 선택해주세요'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-tertiary">
                  {isPromoted ? (
                    <Badge
                      label="확정"
                      variant="green"
                      className="border border-feedback-success-border bg-feedback-success-bg text-feedback-success shadow-sm"
                    />
                  ) : isCancelled ? (
                    <Badge
                      label="취소"
                      variant="gray"
                      className="border border-border bg-surface-hover text-secondary shadow-sm"
                    />
                  ) : (
                    <Badge
                      label="투표중"
                      variant="red"
                      className="border gold-shimmer-badge shadow-sm"
                    />
                  )}
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {isExpanded && (
                <div id={`poll-options-${poll.id}`} className="p-4 pt-0 border-t border-border bg-surface-bg/40">
                  {isPromoted ? (
                    <div className="mt-3 rounded-xl border border-feedback-success-border bg-surface-card px-3 py-2.5">
                      <p className="text-xs font-bold text-feedback-success">확정 일정으로 전환되었어요</p>
                    </div>
                  ) : isCancelled ? (
                    <div className="mt-3 rounded-xl border border-border bg-surface-card px-3 py-2.5">
                      <p className="text-xs font-bold text-primary">취소 사유: {poll.cancellationReason}</p>
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
                              : 'border-border bg-surface-card hover:bg-surface-hover'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${isSelected ? 'border-feedback-warning bg-feedback-warning' : 'border-border bg-surface-bg'}`}>
                                {isSelected && <div className="h-2.5 w-2.5 rounded-sm bg-white" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mt-0.5 space-y-1.5 text-xs font-bold text-secondary">
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <Clock3 size={14} className="text-blue-team shrink-0" aria-hidden="true" />
                                    <span>{formatPollOptionDate(poll, option)}</span>
                                  </span>
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <MapPin size={14} className="text-blue-team shrink-0" aria-hidden="true" />
                                    <span className="truncate">{option.displayLocation || poll.location}</span>
                                  </span>
                                </div>
                                <div className="mt-2.5">
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
                            {isAdmin && !isCancelled && !isPromoted ? (
                              <button
                                type="button"
                                disabled={isPromoting || isSubmitting}
                                onClick={() => {
                                  setPromoteTarget({ poll, option });
                                  setPromoteError(null);
                                }}
                                className="shrink-0 rounded-lg border border-feedback-success-border bg-feedback-success-bg px-3 py-2 text-xs font-bold text-feedback-success transition-all hover:bg-feedback-success-bg/85 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <p role="status" className="mt-3 rounded-lg bg-surface-card px-3 py-2 text-xs font-bold text-secondary">
                      승인된 회원만 일정 투표에 참여할 수 있어요.
                    </p>
                  ) : null}

                  {voteError ? (
                    <p role="alert" className="mt-3 rounded-lg border border-feedback-error-border bg-feedback-error-bg px-3 py-2 text-xs font-bold text-feedback-error">
                      {voteError}
                    </p>
                  ) : null}

                  {!isCancelled && !isPromoted ? (
                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        disabled={submitDisabled}
                        onClick={() => void handleSubmitVote(poll)}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                          submitDisabled
                            ? 'cursor-not-allowed bg-action-disabled text-secondary/40'
                            : 'bg-feedback-warning text-white hover:brightness-110 active:scale-95'
                        }`}
                      >
                        <Vote size={16} aria-hidden="true" />
                        {!canVote ? '승인 후 투표 가능' : isSubmitting ? '저장 중...' : '투표 제출하기'}
                      </button>
                      <button
                        type="button"
                        disabled={!canVote || isSubmitting}
                        onClick={() => void handleSubmitAbsence(poll)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-action-secondary px-4 py-3 text-sm font-bold text-background transition-all hover:bg-action-secondary-hover hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:bg-action-disabled disabled:text-tertiary disabled:shadow-none"
                      >
                        <Frown size={16} aria-hidden="true" />
                        {isSubmitting ? '저장 중...' : '아쉽지만 불참'}
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
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-feedback-error-border bg-surface-card px-4 py-3 text-sm font-bold text-feedback-error transition-all hover:bg-feedback-error-bg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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

        {activePollsStatus === 'ready' && activePolls.length === 0 && pinnedAnnouncements.length === 0 ? (
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-bg rounded-full flex items-center justify-center shrink-0">
              <Megaphone size={18} className="text-tertiary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Pin size={12} className="text-tertiary shrink-0" />
                <p className="text-sm font-bold text-primary truncate">
                  표시할 공지나 일정 투표가 없어요
                </p>
              </div>
              <p className="text-[11px] text-tertiary mt-0.5">
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
            <label className="mb-1 block text-xs font-bold text-secondary">취소 사유</label>
            <textarea
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value)}
              placeholder="예: 강설로 인한 취소"
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-surface-bg px-3 py-2.5 text-sm text-primary transition-colors focus:border-feedback-error focus:outline-none"
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
            className="w-full rounded-xl bg-feedback-error px-4 py-3 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-action-disabled disabled:text-tertiary"
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-feedback-success-bg text-feedback-success">
            <CalendarCheck2 size={22} />
          </div>
          <p className="text-sm font-bold leading-relaxed text-primary">
            {promoteTarget ? formatPollOption(promoteTarget.poll, promoteTarget.option) : ''}
          </p>
          <p className="text-xs font-semibold leading-relaxed text-secondary">
            선택한 일정으로 경기를 확정하시겠습니까?
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
              className="rounded-xl bg-feedback-success px-4 py-3 text-sm font-bold text-white transition-all hover:bg-feedback-success/80 active:scale-95 disabled:cursor-not-allowed disabled:bg-action-disabled disabled:text-tertiary"
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
              className="rounded-xl bg-surface-hover px-4 py-3 text-sm font-bold text-secondary transition-all hover:bg-border/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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

function formatPollOptionDate(poll: SchedulePoll, option: SchedulePollOption) {
  const [year, month, day] = option.optionDate.split('-').map(Number);
  const weekday = weekdays[new Date(year, month - 1, day).getDay()] ?? '';
  const time = option.displayTime || poll.commonTime;
  return `${month}월 ${day}일 ${weekday} ${time}`;
}

function getOptionVoteCount(poll: SchedulePoll, option: SchedulePollOption) {
  return poll.votes.filter((vote) => vote.optionId === option.id && vote.isAvailable).length;
}

function getOptionVoteTotal(poll: SchedulePoll, option: SchedulePollOption) {
  const uniqueVoters = new Set(poll.votes.map((vote) => vote.membershipId));
  return Math.max(poll.eligibleVoterCount ?? uniqueVoters.size, getOptionVoteCount(poll, option));
}
