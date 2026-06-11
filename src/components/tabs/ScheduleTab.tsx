'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import CalendarView from '@/components/features/CalendarView';
import { Ban, CalendarCheck2, CalendarX2, Check, Clock3, MapPin, NotebookPen, Vote, X } from 'lucide-react';
import { buildMatchCalendarEvents, buildPollCalendarEvents } from '@/components/features/calendarEventUtils';
import TacticsDragBuilder, { TacticsPlayerAvatar, type Player } from '@/components/features/TacticsDragBuilder';
import EventComments from '@/components/features/EventComments';
import MatchResultInputModal from '@/components/features/MatchResultInputModal';
import NaverMapLink from '@/components/features/NaverMapLink';
import SoccerPitch from '@/components/features/SoccerPitch';
import { getScheduleEventTheme } from '@/components/features/scheduleEventTheme';
import { fetchMatchAttendees, fetchMatchLineup, type MatchAttendee, type MatchLineupEntry, type UpcomingMatch } from '@/stores/matchClient';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useAppStore } from '@/stores/useAppStore';
import { useModalStore } from '@/stores/useModalStore';
import { useToastStore } from '@/stores/useToastStore';
import PullToRefresh from '@/components/ui/PullToRefresh';
import AttendeeList from '@/components/features/AttendeeList';
import Badge from '@/components/ui/Badge';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Modal from '@/components/ui/Modal';
import { getSchedulePollErrorMessage, type SchedulePoll, type SchedulePollOption } from '@/stores/schedulePollClient';

export default function ScheduleTab() {
  const {
    activePolls,
    activePollsStatus,
    upcomingMatches,
    upcomingMatchesStatus,
    calendarMatches,
    calendarMatchesStatus,
    loadActivePolls,
    loadUpcomingMatches,
    loadCalendarMatches,
    promotePoll,
    cancelUpcomingMatch,
    cancelPoll,
    selectedDate,
    setSelectedDate,
  } = useScheduleStore();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [nowMs] = useState(() => Date.now());
  const { userRole, activeClubId, availableClubs, setSettlementNotification } = useAppStore();
  const { openModal } = useModalStore();
  const { showToast } = useToastStore();
  const [matchDetail, setMatchDetail] = useState<{
    matchId: string;
    players: Player[];
    lineup: MatchLineupEntry[];
    status: 'ready' | 'error';
  } | null>(null);
  const [confirmPromoteKey, setConfirmPromoteKey] = useState<string | null>(null);
  const [promotingOptionKey, setPromotingOptionKey] = useState<string | null>(null);
  const [cancelTargetMatch, setCancelTargetMatch] = useState<UpcomingMatch | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelTargetPoll, setCancelTargetPoll] = useState<{
    poll: SchedulePoll;
    option: SchedulePollOption;
    label: string;
  } | null>(null);
  const [pollCancellationReason, setPollCancellationReason] = useState('');
  const [pollCancelError, setPollCancelError] = useState<string | null>(null);
  const [cancellingPollId, setCancellingPollId] = useState<string | null>(null);
  const canManageSchedule = userRole === 'admin' || userRole === 'operator';
  const currentMembershipId = availableClubs.find((club) => club.clubId === activeClubId)?.membershipId ?? null;
  const scheduleMatches = calendarMatches.length > 0 ? calendarMatches : upcomingMatches;
  const visibleScheduleMatches = useMemo(
    () => collapseDuplicateMatchEvents(scheduleMatches),
    [scheduleMatches],
  );
  const scheduleCalendarEvents = useMemo(
    () => [
      ...buildMatchCalendarEvents(visibleScheduleMatches),
      ...buildPollCalendarEvents(activePolls),
    ],
    [activePolls, visibleScheduleMatches],
  );
  const firstVisibleEventDate = useMemo(
    () => getFirstEventDateInMonth(scheduleCalendarEvents, visibleMonth),
    [scheduleCalendarEvents, visibleMonth],
  );
  const refreshSchedule = async () => {
    await Promise.allSettled([
      loadActivePolls(activeClubId),
      loadUpcomingMatches(activeClubId),
      loadCalendarMatches({ clubId: activeClubId, ...getMonthRange(visibleMonth) }),
    ]);
  };
  const openCancelModal = (match: UpcomingMatch) => {
    setCancelTargetMatch(match);
    setCancellationReason('');
    setCancelError(null);
  };
  const closeCancelModal = () => {
    if (isCancelling) return;
    setCancelTargetMatch(null);
    setCancellationReason('');
    setCancelError(null);
  };
  const handleCancelMatch = async () => {
    if (!cancelTargetMatch) return;

    const normalizedReason = cancellationReason.trim();
    if (!normalizedReason) {
      const message = '취소 사유를 입력해주세요.';
      setCancelError(message);
      showToast(message);
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      await cancelUpcomingMatch({
        clubId: cancelTargetMatch.clubId,
        matchId: cancelTargetMatch.id,
        cancellationReason: normalizedReason,
      });
      await refreshSchedule();
      showToast('확정 일정이 취소되었어요.');
      setCancelTargetMatch(null);
      setCancellationReason('');
    } catch (error) {
      const message = getSchedulePollErrorMessage(error, '확정 일정을 취소하지 못했어요.');
      setCancelError(message);
      showToast(message);
    } finally {
      setIsCancelling(false);
    }
  };
  const openPollCancelModal = (poll: SchedulePoll, option: SchedulePollOption, label: string) => {
    setCancelTargetPoll({ poll, option, label });
    setPollCancellationReason('');
    setPollCancelError(null);
  };
  const closePollCancelModal = () => {
    if (cancellingPollId) return;
    setCancelTargetPoll(null);
    setPollCancellationReason('');
    setPollCancelError(null);
  };
  const handleCancelPoll = async () => {
    if (!cancelTargetPoll) return;

    const normalizedReason = pollCancellationReason.trim();
    if (!normalizedReason) {
      const message = '취소 사유를 입력해주세요.';
      setPollCancelError(message);
      showToast(message);
      return;
    }

    setCancellingPollId(cancelTargetPoll.poll.id);
    setPollCancelError(null);

    try {
      await cancelPoll({
        clubId: cancelTargetPoll.poll.clubId,
        pollId: cancelTargetPoll.poll.id,
        cancellationReason: normalizedReason,
      });
      await refreshSchedule();
      showToast('일정 투표가 취소되었어요.');
      setCancelTargetPoll(null);
      setPollCancellationReason('');
    } catch (error) {
      const message = getSchedulePollErrorMessage(error, '일정 투표를 취소하지 못했어요.');
      setPollCancelError(message);
      showToast(message);
    } finally {
      setCancellingPollId(null);
    }
  };
  const selectedIsoDate = toIsoDate(selectedDate, visibleMonth);
  const selectedPollOptions = useMemo(
    () => findPollOptionsByDate(activePolls, selectedIsoDate),
    [activePolls, selectedIsoDate],
  );
  const selectedEvents = useMemo(
    () => visibleScheduleMatches.filter((match) => match.date.slice(0, 10) === selectedIsoDate),
    [selectedIsoDate, visibleScheduleMatches],
  );
  const selectedMatches = useMemo(
    () => selectedEvents.filter((match) => match.type === 'match'),
    [selectedEvents],
  );
  const selectedOtherEvents = useMemo(
    () => selectedEvents.filter((match) => match.type !== 'match'),
    [selectedEvents],
  );
  const selectedMatch = selectedMatches[0] ?? null;
  const selectedMatchDetail = selectedMatch && matchDetail?.matchId === selectedMatch.id ? matchDetail : null;
  const selectedMatchDetailStatus = selectedMatch ? selectedMatchDetail?.status ?? 'loading' : 'idle';
  const focusDate = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    if (!year || !month || !day) return;
    setVisibleMonth(new Date(year, month - 1, 1));
    setSelectedDate(day);
  };
  const handlePromotePollOption = async (poll: SchedulePoll, option: SchedulePollOption) => {
    const optionKey = getPollOptionKey(poll, option);
    setPromotingOptionKey(optionKey);

    try {
      await promotePoll({
        clubId: poll.clubId,
        pollId: poll.id,
        optionId: option.id,
      });
      await Promise.allSettled([
        loadUpcomingMatches(poll.clubId),
        loadCalendarMatches({ clubId: poll.clubId, ...getMonthRange(new Date(`${option.optionDate}T00:00:00`)) }),
        loadActivePolls(poll.clubId),
      ]);
      focusDate(option.optionDate);
      setConfirmPromoteKey(null);
      showToast('일정 확정');
    } catch (error) {
      const message = error instanceof Error ? error.message : '일정 투표를 확정하지 못했어요.';
      showToast(message);
    } finally {
      setPromotingOptionKey(null);
    }
  };

  useEffect(() => {
    if (activePollsStatus !== 'idle') return;

    void loadActivePolls(activeClubId).catch(() => {
      // Home notice cards show the retry UI; the calendar simply omits remote markers.
    });
  }, [activeClubId, activePollsStatus, loadActivePolls]);

  useEffect(() => {
    if (upcomingMatchesStatus !== 'idle') return;

    void loadUpcomingMatches(activeClubId).catch(() => {
      // Home upcoming schedule shows details; the calendar simply omits remote markers.
    });
  }, [activeClubId, upcomingMatchesStatus, loadUpcomingMatches]);

  useEffect(() => {
    if (calendarMatchesStatus !== 'idle') return;

    void loadCalendarMatches({ clubId: activeClubId, ...getMonthRange(visibleMonth) }).catch(() => {
      // The calendar keeps already-loaded local state when the monthly range fails.
    });
  }, [activeClubId, calendarMatchesStatus, loadCalendarMatches, visibleMonth]);

  useEffect(() => {
    if (!selectedMatch) return;

    let ignore = false;

    Promise.all([
      fetchMatchAttendees({ clubId: activeClubId, matchId: selectedMatch.id }),
      fetchMatchLineup({ clubId: activeClubId, matchId: selectedMatch.id }),
    ])
      .then(([attendees, lineup]) => {
        if (ignore) return;
        setMatchDetail({
          matchId: selectedMatch.id,
          players: attendees.map(mapAttendeeToPlayer),
          lineup,
          status: 'ready',
        });
      })
      .catch(() => {
        if (ignore) return;
        setMatchDetail({
          matchId: selectedMatch.id,
          players: [],
          lineup: [],
          status: 'error',
        });
      });

    return () => {
      ignore = true;
    };
  }, [activeClubId, selectedMatch]);

  useEffect(() => {
    if (!selectedMatch || selectedMatch.status !== 'finished' || selectedMatchDetailStatus !== 'ready') {
      setSettlementNotification(null);
      return;
    }

    const redScore = selectedMatch.ourScore ?? 0;
    const blueScore = selectedMatch.oppScore ?? 0;
    const loserTeam = redScore === blueScore ? null : redScore < blueScore ? 1 : 2;
    const currentLineup = selectedMatchDetail?.lineup.find((entry) => entry.membershipId === currentMembershipId);

    if (loserTeam && currentLineup?.teamNumber === loserTeam) {
      setSettlementNotification({
        matchId: selectedMatch.id,
        title: stripDatePrefix(selectedMatch.title),
      });
      return;
    }

    setSettlementNotification(null);
  }, [
    currentMembershipId,
    selectedMatch,
    selectedMatchDetail,
    selectedMatchDetailStatus,
    setSettlementNotification,
  ]);

  useEffect(() => {
    if (!firstVisibleEventDate) return;
    if (selectedEvents.length > 0 || selectedPollOptions.length > 0) return;
    if (selectedDate === firstVisibleEventDate.getDate()) return;

    setSelectedDate(firstVisibleEventDate.getDate());
  }, [
    firstVisibleEventDate,
    selectedDate,
    selectedEvents.length,
    selectedPollOptions.length,
    setSelectedDate,
  ]);

  return (
    <PullToRefresh onRefresh={refreshSchedule}>
      <div className="space-y-6 animate-fadeIn pb-20">
        {canManageSchedule ? (
          <section className="rounded-xl border border-border bg-surface-card p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-primary">일정 운영</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => openModal('matchCreate')}
                className="rounded-lg bg-green-600 px-3 py-2.5 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
              >
                일정 만들기
              </button>
              <button
                onClick={() => openModal('pollCreate')}
                className="rounded-lg border border-feedback-warning-border bg-feedback-warning-bg px-3 py-2.5 text-xs font-bold text-feedback-warning transition-all hover:brightness-95 active:scale-95"
              >
                투표 만들기
              </button>
            </div>
          </section>
        ) : null}

        <CalendarView
          value={selectedDate}
          onChange={setSelectedDate}
          events={scheduleCalendarEvents}
          monthDate={visibleMonth}
          onMonthDateChange={(nextMonth) => {
            setVisibleMonth(nextMonth);
            setSelectedDate(1);
            void loadCalendarMatches({ clubId: activeClubId, ...getMonthRange(nextMonth) }).catch(() => undefined);
          }}
        />

        {selectedPollOptions.length > 0 ? (
          <section className="border border-event-vote-border bg-event-vote-bg overflow-hidden rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-primary">투표 현황</h3>
                <p className="mt-1 text-xs font-bold text-secondary">{formatSelectedDate(selectedDate, visibleMonth)}</p>
              </div>
              <Badge label="투표중" variant="yellow" />
            </div>
            <div className="space-y-3">
              {selectedPollOptions.map(({ poll, option }) => {
                const optionDateObj = new Date(option.optionDate);
                const weekdaysList = ['일', '월', '화', '수', '목', '금', '토'];
                const weekdayStr = weekdaysList[optionDateObj.getDay()] ?? '';
                const formattedDateTime = `${optionDateObj.getMonth() + 1}월 ${optionDateObj.getDate()}일 ${weekdayStr} ${option.displayTime || poll.commonTime}`;
                const optionLocation = option.displayLocation || poll.location;

                return (
                  <div key={`${poll.id}-${option.id}`} className="rounded-2xl border border-feedback-warning-border bg-surface-card/85 px-4 py-3 shadow-sm shadow-gray-900/40">
                    <div className="mb-2 flex items-start gap-2">
                      <Vote size={17} className="mt-0.5 shrink-0 text-award-mvp" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-primary">{stripDatePrefix(poll.title)}</p>
                        <div className="mt-2.5 space-y-1.5 text-xs font-bold text-secondary">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Clock3 size={14} className="text-blue-team shrink-0" aria-hidden="true" />
                            <span>{formattedDateTime}</span>
                          </span>
                          <span className="flex min-w-0 items-center gap-1.5">
                            <MapPin size={14} className="text-blue-team shrink-0" aria-hidden="true" />
                            <span className="truncate">{optionLocation}</span>
                          </span>
                        </div>
                      </div>
                      {canManageSchedule ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={cancellingPollId !== null}
                            onClick={() => openPollCancelModal(poll, option, `${formattedDateTime} ${optionLocation}`)}
                            title="일정 취소"
                            aria-label={`${formattedDateTime} ${optionLocation} 일정 투표 취소`}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-feedback-error-border bg-feedback-error-bg text-feedback-error shadow-sm shadow-feedback-error/20 transition-all hover:bg-feedback-error-bg/80 hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Ban size={16} aria-hidden="true" />
                          </button>
                          <PollPromoteAction
                            poll={poll}
                            option={option}
                            formattedDateTime={formattedDateTime}
                            isConfirming={confirmPromoteKey === getPollOptionKey(poll, option)}
                            isPromoting={promotingOptionKey === getPollOptionKey(poll, option)}
                            disabled={promotingOptionKey !== null || cancellingPollId !== null}
                            onAskConfirm={() => setConfirmPromoteKey(getPollOptionKey(poll, option))}
                            onCancel={() => setConfirmPromoteKey(null)}
                            onConfirm={() => void handlePromotePollOption(poll, option)}
                          />
                        </div>
                      ) : null}
                    </div>
                    <AttendeeList count={getOptionVoteCount(poll, option)} total={getOptionVoteTotal(poll, option)} />
                    <div className="mt-3">
                      <EventComments
                        clubId={activeClubId}
                        targetType="schedule_poll_option"
                        targetId={option.id}
                        showPhase={false}
                        themeType="poll"
                        embedded
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {selectedMatches.length > 0 ? (
          <SelectedMatchPanel
            match={selectedMatch}
            matches={selectedMatches}
            clubId={activeClubId}
            players={selectedMatchDetail?.players ?? []}
            lineup={selectedMatchDetail?.lineup ?? []}
            detailStatus={selectedMatchDetailStatus}
            canManageSchedule={canManageSchedule}
            nowMs={nowMs}
            onLineupUpdated={(nextLineup) => {
              setMatchDetail((prev) => prev ? { ...prev, lineup: nextLineup } : null);
            }}
            onPlayersUpdated={(nextPlayers) => {
              setMatchDetail((prev) => prev ? { ...prev, players: nextPlayers } : null);
            }}
            onMatchUpdated={(nextMatch) => {
              useScheduleStore.setState((state) => ({
                upcomingMatches: Array.isArray(state.upcomingMatches)
                  ? state.upcomingMatches.map((m) => m.id === nextMatch.id ? nextMatch : m)
                  : state.upcomingMatches,
                calendarMatches: Array.isArray(state.calendarMatches)
                  ? state.calendarMatches.map((m) => m.id === nextMatch.id ? nextMatch : m)
                  : state.calendarMatches,
              }));
            }}
            onCancelMatchRequest={openCancelModal}
            onResultSaved={async (matchId) => {
              await refreshSchedule();
              const [attendees, nextLineup] = await Promise.all([
                fetchMatchAttendees({ clubId: activeClubId, matchId }),
                fetchMatchLineup({ clubId: activeClubId, matchId }),
              ]);
              setMatchDetail({
                matchId,
                players: attendees.map(mapAttendeeToPlayer),
                lineup: nextLineup,
                status: 'ready',
              });
            }}
          />
        ) : null}

        {selectedOtherEvents.length > 0 ? (
          <EventPanels
            events={selectedOtherEvents}
            clubId={activeClubId}
            canManageSchedule={canManageSchedule}
            nowMs={nowMs}
            onCancelEventRequest={openCancelModal}
          />
        ) : null}

        {selectedEvents.length === 0 && selectedPollOptions.length === 0 ? (
          <section className="card overflow-hidden p-5">
            <div className="rounded-2xl bg-feedback-success-bg px-4 py-5 text-center">
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center">
                <CalendarX2 size={56} className="text-brand-primary" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <p className="text-base font-black text-primary">텅</p>
              <p className="mt-1 text-xs font-medium text-secondary">
                아직 등록된 일정이 없어요
              </p>
            </div>
          </section>
        ) : null}

      </div>
      <Modal
        title="일정 취소"
        isOpen={cancelTargetMatch !== null}
        onClose={closeCancelModal}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary">취소 사유</label>
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
            disabled={isCancelling}
            onClick={() => void handleCancelMatch()}
            className="w-full rounded-xl bg-feedback-error px-4 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-tertiary"
          >
            {isCancelling ? '취소 중...' : '일정 취소하기'}
          </button>
        </div>
      </Modal>
      <Modal
        title="일정 취소"
        isOpen={cancelTargetPoll !== null}
        onClose={closePollCancelModal}
      >
        <div className="space-y-4">
          {cancelTargetPoll ? (
            <p className="rounded-xl border border-feedback-warning-border bg-feedback-warning-bg px-3 py-2 text-xs font-bold text-feedback-warning">
              {cancelTargetPoll.label}
            </p>
          ) : null}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary">취소 사유</label>
            <textarea
              value={pollCancellationReason}
              onChange={(event) => setPollCancellationReason(event.target.value)}
              placeholder="예: 강설로 인한 취소"
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-surface-bg px-3 py-2.5 text-sm text-primary transition-colors focus:border-feedback-error focus:outline-none"
            />
          </div>
          {pollCancelError ? (
            <p role="alert" className="rounded-lg border border-feedback-error-border bg-feedback-error-bg px-3 py-2 text-xs font-bold text-feedback-error">
              {pollCancelError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={cancellingPollId !== null}
            onClick={() => void handleCancelPoll()}
            className="w-full rounded-xl bg-feedback-error px-4 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-tertiary"
          >
            {cancellingPollId ? '취소 중...' : '취소 처리하기'}
          </button>
        </div>
      </Modal>
    </PullToRefresh>
  );
}

function SelectedMatchPanel({
  match,
  matches,
  clubId,
  players,
  lineup,
  detailStatus,
  canManageSchedule,
  nowMs,
  onLineupUpdated,
  onPlayersUpdated,
  onMatchUpdated,
  onCancelMatchRequest,
  onResultSaved,
}: {
  match: UpcomingMatch | null;
  matches: UpcomingMatch[];
  clubId: string;
  players: Player[];
  lineup: MatchLineupEntry[];
  detailStatus: 'idle' | 'loading' | 'ready' | 'error';
  canManageSchedule: boolean;
  nowMs: number;
  onLineupUpdated?: (nextLineup: MatchLineupEntry[]) => void;
  onPlayersUpdated?: (nextPlayers: Player[]) => void;
  onMatchUpdated?: (nextMatch: UpcomingMatch) => void;
  onCancelMatchRequest?: (match: UpcomingMatch) => void;
  onResultSaved?: (matchId: string) => Promise<void>;
}) {
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  if (!match) return null;

  const isFinished = match.status === 'finished';
  const statusBadge = getScheduleStatusBadge(match, nowMs);
  const hasResultReadyLineup = hasBothTeamLineup(lineup);
  const canShowResultAction = canManageSchedule
    && !isFinished
    && match.status !== 'cancelled'
    && new Date(match.date).getTime() <= nowMs
    && hasResultReadyLineup
    && detailStatus === 'ready';
  const canShowCancelAction = canManageSchedule
    && match.status !== 'cancelled'
    && !isFinished
    && new Date(match.date).getTime() > nowMs;
  const handleResultSaved = async (score: { home: number; away: number }) => {
    const nextMatch = {
      ...match,
      status: 'finished' as const,
      ourScore: score.home,
      oppScore: score.away,
      tacticsCompleted: true,
      updatedAt: new Date().toISOString(),
    };
    onMatchUpdated?.(nextMatch);
    await onResultSaved?.(match.id);
  };

  return (
    <section className="space-y-3">
      {!isFinished ? (
        <div className="overflow-hidden rounded-3xl border border-event-match-border bg-event-match-bg p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-primary">{stripDatePrefix(match.title)}</h3>
            </div>
            <div className="flex items-center gap-2">
              {canShowResultAction ? (
                <button
                  type="button"
                  onClick={() => setIsResultModalOpen(true)}
                  title="경기 결과 입력"
                  aria-label="경기 결과 입력"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-result-loss/30 bg-result-loss/10 text-result-loss shadow-sm shadow-result-loss/20 transition-all hover:bg-result-loss/15 hover:brightness-95 active:scale-95"
                >
                  <NotebookPen size={16} className="animate-pulse" aria-hidden="true" />
                </button>
              ) : null}
              {canShowCancelAction ? (
                <button
                  type="button"
                  onClick={() => onCancelMatchRequest?.(match)}
                  title="일정 취소"
                  aria-label="일정 취소"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-feedback-error-border bg-feedback-error-bg text-feedback-error shadow-sm shadow-feedback-error/20 transition-all hover:bg-feedback-error-bg/80 hover:brightness-95 active:scale-95"
                >
                  <Ban size={16} aria-hidden="true" />
                </button>
              ) : null}
              <Badge label={statusBadge.label} variant={statusBadge.variant} />
            </div>
          </div>
          <div className="space-y-3">
            {matches.map((candidate) => {
              const isSelected = candidate.id === match.id;
              return (
                <div
                  key={candidate.id}
                  className="border-t border-event-match-border/60 pt-3 first:border-t-0 first:pt-0"
                >
                  <MatchSummaryCard
                    match={candidate}
                    attendeeCount={isSelected ? players.length : 0}
                    showTitle={matches.length > 1}
                    nowMs={nowMs}
                  />
                  {isSelected ? (
                    <div className="mt-3">
                      {detailStatus === 'loading' ? (
                        <LoadingIndicator
                          message="전술 설정을 불러오는 중입니다"
                          className="rounded-2xl border border-border bg-surface-card"
                        />
                      ) : null}
                      {detailStatus === 'error' ? (
                        <div role="alert" className="rounded-2xl border border-feedback-error-border bg-feedback-error-bg px-4 py-3 text-xs font-bold text-feedback-error">
                          일정 상세를 불러오지 못했어요.
                        </div>
                      ) : null}
                      {detailStatus === 'ready' ? (
                        <div className="space-y-3">
                          <TacticsDragBuilder
                            clubId={clubId}
                            matchId={match.id}
                            players={players}
                            lineup={lineup}
                            embedded
                            onLineupUpdated={onLineupUpdated}
                            onPlayersUpdated={onPlayersUpdated}
                            match={match}
                            onMatchUpdated={onMatchUpdated}
                          />
                          <EventComments
                            clubId={clubId}
                            targetType="match"
                            targetId={match.id}
                            phaseAnchorAt={null}
                            themeType="match"
                            embedded
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {match.status === 'cancelled' ? (
            <div className="mt-3.5 rounded-xl border border-border bg-surface-bg/80 px-4 py-3 text-[11px] font-bold leading-normal text-secondary">
              ❌ 취소 사유: {match.cancellationReason}
            </div>
          ) : null}
        </div>
      ) : null}

      {isFinished ? (
        <>
          {detailStatus === 'loading' ? (
            <LoadingIndicator
              message="경기 결과를 불러오는 중입니다"
              className="rounded-2xl border border-border bg-surface-card"
            />
          ) : null}
          {detailStatus === 'error' ? (
            <div role="alert" className="rounded-2xl border border-feedback-error-border bg-feedback-error-bg px-4 py-3 text-xs font-bold text-feedback-error">
              일정 상세를 불러오지 못했어요.
            </div>
          ) : null}
          {detailStatus === 'ready' ? (
            <MatchResultPanel
              match={match}
              lineup={lineup}
              clubId={clubId}
            />
          ) : null}
        </>
      ) : null}
      {canShowResultAction ? (
        <MatchResultInputModal
          isOpen={isResultModalOpen}
          onClose={() => setIsResultModalOpen(false)}
          clubId={clubId}
          match={match}
          lineup={lineup}
          onSaved={handleResultSaved}
        />
      ) : null}
    </section>
  );
}

function PollPromoteAction({
  poll,
  option,
  formattedDateTime,
  isConfirming,
  isPromoting,
  disabled,
  onAskConfirm,
  onCancel,
  onConfirm,
}: {
  poll: SchedulePoll;
  option: SchedulePollOption;
  formattedDateTime: string;
  isConfirming: boolean;
  isPromoting: boolean;
  disabled: boolean;
  onAskConfirm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const location = option.displayLocation || poll.location;
  const label = `${formattedDateTime} ${location} 경기 일정으로 확정`;

  if (isConfirming) {
    return (
      <div className="flex shrink-0 items-center gap-1" aria-busy={isPromoting}>
        <button
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          aria-label={`${label} 실행`}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-feedback-success text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check size={16} strokeWidth={3} aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          aria-label={`${label} 취소`}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-bg text-secondary transition-all hover:bg-surface-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onAskConfirm}
      aria-label={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-feedback-success-border bg-feedback-success-bg text-feedback-success transition-all hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <CalendarCheck2 size={16} aria-hidden="true" />
    </button>
  );
}

function MatchSummaryCard({
  match,
  attendeeCount,
  showTitle,
  nowMs,
}: {
  match: UpcomingMatch;
  attendeeCount: number;
  showTitle: boolean;
  nowMs: number;
}) {
  const statusBadge = getScheduleStatusBadge(match, nowMs);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center">
        <Image
          src="/icons/svgrepo-football.svg"
          alt=""
          width={46}
          height={46}
          className="h-11 w-11 object-contain"
          unoptimized
        />
      </div>
      <div className="min-w-0 flex-1">
        {showTitle ? (
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-black leading-tight text-primary">{stripDatePrefix(match.title)}</p>
            <Badge label={statusBadge.label} variant={statusBadge.variant} />
          </div>
        ) : null}
        <div className="mt-2.5 space-y-1.5 text-xs font-bold text-secondary">
          <span className="flex min-w-0 items-center gap-1.5">
            <Clock3 size={14} className="text-blue-team shrink-0" aria-hidden="true" />
            <span>{formatMatchDateTimeWithWeekday(match.date)}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin size={14} className="text-blue-team shrink-0" aria-hidden="true" />
            <span className="truncate">{match.location}</span>
          </span>
        </div>
        <AttendeeList count={attendeeCount} total={Math.max(attendeeCount, 2)} />
      </div>
      <NaverMapLink location={match.location} accentClassName="bg-event-match-map-accent text-white" compact />
    </div>
  );
}

function MatchResultPanel({
  match,
  lineup,
  clubId,
}: {
  match: UpcomingMatch;
  lineup: MatchLineupEntry[];
  clubId: string;
}) {
  const redScore = match.ourScore ?? 0;
  const blueScore = match.oppScore ?? 0;
  const loserTeam = redScore === blueScore ? null : redScore < blueScore ? 1 : 2;
  const redPlayers = lineup.filter((entry) => entry.teamNumber === 1);
  const bluePlayers = lineup.filter((entry) => entry.teamNumber === 2);
  const matchTimeMs = new Date(match.date).getTime();
  const statusBadge = getScheduleStatusBadge(match, matchTimeMs);

  return (
    <div className="overflow-hidden rounded-3xl border border-event-match-border bg-event-match-bg p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-primary">{stripDatePrefix(match.title)}</h3>
        </div>
        <Badge label={statusBadge.label} variant={statusBadge.variant} />
      </div>

      <div className="space-y-3">
        <MatchSummaryCard
          match={match}
          attendeeCount={lineup.length}
          showTitle={false}
          nowMs={matchTimeMs}
        />

        <div data-testid="match-result-section" className="space-y-3">
          <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-black text-secondary">
            경기 결과
          </h4>
          <SoccerPitch testId="match-result-field">
            <div className="relative grid h-full grid-cols-2">
              <ResultFieldSide
                teamNumber={1}
                players={redPlayers}
                isLoser={loserTeam === 1}
              />
              <ResultFieldSide
                teamNumber={2}
                players={bluePlayers}
                isLoser={loserTeam === 2}
              />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
              <div className="flex items-center gap-2 rounded-2xl border border-white/60 bg-surface-elevated/95 px-3 py-2 shadow-lg">
                <span className="text-xl font-black text-red-team">{redScore}</span>
                <span className="text-[10px] font-black text-tertiary">VS</span>
                <span className="text-xl font-black text-blue-team">{blueScore}</span>
              </div>
            </div>
          </SoccerPitch>

          <div className="mt-3">
            <EventComments
              clubId={clubId}
              targetType="match"
              targetId={match.id}
              phaseAnchorAt={match.updatedAt}
              themeType="match"
              embedded
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultFieldSide({
  teamNumber,
  players,
  isLoser,
}: {
  teamNumber: 1 | 2;
  players: MatchLineupEntry[];
  isLoser: boolean;
}) {
  const teamId = teamNumber === 1 ? 'red' : 'blue';

  return (
    <div
      data-testid={`${teamId}-result-side`}
      className={`relative transition-all ${teamNumber === 1 ? 'rounded-l-2xl' : 'rounded-r-2xl'} ${
        isLoser ? 'bg-surface-card/20 opacity-60 saturate-50' : ''
      }`}
    >
      <div className={`grid h-full grid-cols-6 grid-rows-3 content-start p-1.5 ${teamNumber === 1 ? 'justify-items-start' : 'justify-items-end'}`}>
        {Array.from({ length: 18 }, (_, index) => {
          const player = getLineupInSlot(players, teamNumber, index);
          return (
            <div key={`${teamId}-result-${index}`} className="flex h-9 w-8 items-center justify-center rounded-full">
              {player ? (
                <TacticsPlayerAvatar
                  player={{
                    name: player.playerName,
                    photo: player.playerPhotoUrl || player.playerName,
                    isLeader: player.isLeader,
                  }}
                  teamId={teamId}
                  tabIndex={0}
                  testId={`${teamId}-result-avatar-${index}`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventPanels({
  events,
  clubId,
  canManageSchedule,
  nowMs,
  onCancelEventRequest,
}: {
  events: UpcomingMatch[];
  clubId: string;
  canManageSchedule: boolean;
  nowMs: number;
  onCancelEventRequest?: (event: UpcomingMatch) => void;
}) {
  return (
    <section className="space-y-3">
      {events.map((event) => (
        <EventPanel
          key={event.id}
          event={event}
          clubId={clubId}
          canManageSchedule={canManageSchedule}
          nowMs={nowMs}
          onCancelEventRequest={onCancelEventRequest}
        />
      ))}
    </section>
  );
}

function EventPanel({
  event,
  clubId,
  canManageSchedule,
  nowMs,
  onCancelEventRequest,
}: {
  event: UpcomingMatch;
  clubId: string;
  canManageSchedule: boolean;
  nowMs: number;
  onCancelEventRequest?: (event: UpcomingMatch) => void;
}) {
  const config = getScheduleEventTheme(event.type);
  const isFinished = event.status === 'finished' || new Date(event.date).getTime() < nowMs;
  const statusBadge = getScheduleStatusBadge(event, nowMs);
  const canShowCancelAction = canManageSchedule && event.status !== 'cancelled' && !isFinished;
  const [attendeeCount, setAttendeeCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    fetchMatchAttendees({ clubId, matchId: event.id })
      .then((attendees) => {
        if (!ignore) setAttendeeCount(attendees.length);
      })
      .catch(() => {
        if (!ignore) setAttendeeCount(0);
      });

    return () => {
      ignore = true;
    };
  }, [clubId, event.id]);

  return (
    <section className="space-y-3" aria-label={`${config.title} 일정 상세`}>
      <div className={`overflow-hidden rounded-3xl border p-5 shadow-sm ${config.cardClassName}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
             <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config.iconClassName}`}>
               <config.Icon size={22} strokeWidth={2} />
             </span>
            <div className="min-w-0">
              <h3 className="text-base font-black text-primary">{config.title}</h3>
              <p className="mt-1 truncate text-sm font-black text-primary">{stripDatePrefix(event.title)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canShowCancelAction ? (
              <button
                type="button"
                onClick={() => onCancelEventRequest?.(event)}
                title="일정 취소"
                aria-label="일정 취소"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-feedback-error-border bg-feedback-error-bg text-feedback-error shadow-sm shadow-feedback-error/20 transition-all hover:bg-feedback-error-bg/80 hover:brightness-95 active:scale-95"
              >
                <Ban size={16} aria-hidden="true" />
              </button>
            ) : null}
            <Badge
              label={statusBadge.label}
              variant={statusBadge.variant}
            />
          </div>
        </div>

        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${config.detailClassName}`}>
          <div className="min-w-0 flex-1 space-y-1.5 text-xs font-bold text-secondary">
            <span className="flex min-w-0 items-center gap-1.5">
              <Clock3 size={14} className="text-blue-team shrink-0" aria-hidden="true" />
              <span>{formatMatchDateTimeWithWeekday(event.date)}</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin size={14} className="text-blue-team shrink-0" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
            </span>
          </div>
          <NaverMapLink location={event.location} accentClassName={config.mapAccentClassName} compact />
        </div>

        <div className="mt-3">
          <AttendeeList count={attendeeCount} total={Math.max(attendeeCount, 1)} />
        </div>
        {event.status === 'cancelled' ? (
          <div className="mt-3 rounded-xl border border-border bg-surface-bg/80 px-4 py-3 text-[11px] font-bold leading-normal text-secondary">
            ❌ 취소 사유: {event.cancellationReason}
          </div>
        ) : null}
        <div className="mt-3">
          <EventComments
            clubId={clubId}
            targetType="match"
            targetId={event.id}
            phaseAnchorAt={isFinished ? event.updatedAt : null}
            showPhase={event.type === 'match'}
            themeType={event.type}
            embedded
          />
        </div>
      </div>
    </section>
  );
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthRange(monthDate: Date) {
  const from = startOfMonth(monthDate);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);

  return {
    from: toIsoDate(from.getDate(), from),
    to: toIsoDate(to.getDate(), to),
  };
}

function getLineupInSlot(players: MatchLineupEntry[], teamNumber: 1 | 2, slotIndex: number) {
  return players.find((player, index) => getLineupSlot(player, teamNumber, index) === slotIndex);
}

function getLineupSlot(player: MatchLineupEntry, teamNumber: 1 | 2, fallbackIndex: number) {
  if (typeof player.formationSlot === 'number') return player.formationSlot;
  const slots = teamNumber === 1
    ? [6, 0, 12, 7, 13, 1, 8, 14, 2, 9, 15, 3, 10, 16, 4, 11, 17, 5]
    : [11, 5, 17, 10, 16, 4, 9, 15, 3, 8, 14, 2, 7, 13, 1, 6, 12, 0];
  return slots[fallbackIndex] ?? fallbackIndex;
}

type ScheduleStatusBadge = {
  label: '예정' | '종료' | '취소';
  variant: 'green' | 'slate' | 'gray';
};

function getScheduleStatusBadge(match: UpcomingMatch, nowMs: number): ScheduleStatusBadge {
  if (match.status === 'cancelled') {
    return { label: '취소', variant: 'gray' };
  }

  if (match.status === 'finished' || new Date(match.date).getTime() <= nowMs) {
    return { label: '종료', variant: 'slate' };
  }

  return { label: '예정', variant: 'green' };
}

function hasBothTeamLineup(lineup: MatchLineupEntry[]) {
  return lineup.some((entry) => entry.teamNumber === 1)
    && lineup.some((entry) => entry.teamNumber === 2);
}

function toIsoDate(day: number, monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = String(monthDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function collapseDuplicateMatchEvents(matches: UpcomingMatch[]) {
  const seenMatchDates = new Set<string>();
  const result: UpcomingMatch[] = [];

  for (const match of [...matches].sort((left, right) => left.date.localeCompare(right.date))) {
    if (match.type !== 'match') {
      result.push(match);
      continue;
    }

    const dateKey = match.date.slice(0, 10);
    if (seenMatchDates.has(dateKey)) continue;

    seenMatchDates.add(dateKey);
    result.push(match);
  }

  return result;
}

function getFirstEventDateInMonth(events: Array<{ date?: string }>, visibleMonth: Date) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  return events
    .filter((event): event is { date: string } => Boolean(event.date))
    .map((event) => new Date(`${event.date.slice(0, 10)}T00:00:00`))
    .filter((date) => date.getFullYear() === year && date.getMonth() === month)
    .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
}

function stripDatePrefix(title: string | null | undefined): string {
  if (!title) return '';
  return title.replace(/^\d{2,4}[-./]\d{1,2}([-./]\d{1,2})?\s*/, '').trim();
}

function formatSelectedDate(day: number, monthDate: Date) {
  return `${monthDate.getMonth() + 1}월 ${day}일`;
}


function formatMatchTime(value: string) {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatMatchDateTimeWithWeekday(value: string) {
  const date = new Date(value);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[date.getDay()] ?? '';
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday} ${formatMatchTime(value)}`;
}

function mapAttendeeToPlayer(member: MatchAttendee): Player {
  return {
    id: member.membershipId,
    name: member.playerName,
    ovr: member.playerOvr,
    matchPoints: member.matchPoints,
    photo: member.playerPhotoUrl || member.playerName,
  };
}


function findPollOptionsByDate(polls: SchedulePoll[], date: string) {
  return polls.flatMap((poll) => (
    poll.options
      .filter((option) => option.optionDate === date)
      .map((option) => ({ poll, option }))
  ));
}

function getOptionVoteCount(poll: SchedulePoll, option: SchedulePollOption) {
  return poll.votes.filter((vote) => vote.optionId === option.id && vote.isAvailable).length;
}

function getOptionVoteTotal(poll: SchedulePoll, option: SchedulePollOption) {
  const uniqueVoters = new Set(poll.votes.map((vote) => vote.membershipId));
  return Math.max(poll.eligibleVoterCount ?? uniqueVoters.size, getOptionVoteCount(poll, option));
}

function getPollOptionKey(poll: SchedulePoll, option: SchedulePollOption) {
  return `${poll.id}:${option.id}`;
}
