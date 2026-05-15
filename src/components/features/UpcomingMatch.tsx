'use client';

import { useEffect, useState } from 'react';
import { Ban, CalendarClock, MapPin } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { getSchedulePollErrorMessage } from '@/stores/schedulePollClient';
import type { UpcomingMatch as UpcomingMatchType } from '@/stores/matchClient';
import { useToastStore } from '@/stores/useToastStore';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

export default function UpcomingMatch() {
  const { activeClubId, userRole } = useAppStore();
  const { showToast } = useToastStore();
  const {
    upcomingMatches,
    upcomingMatchesStatus,
    upcomingMatchesError,
    loadUpcomingMatches,
    cancelUpcomingMatch,
  } = useScheduleStore();
  const canManageSchedule = userRole === 'admin' || userRole === 'operator';
  const nextMatch = upcomingMatches[0] ?? null;
  const [cancelTargetMatch, setCancelTargetMatch] = useState<UpcomingMatchType | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (upcomingMatchesStatus !== 'idle') return;

    void loadUpcomingMatches(activeClubId).catch((error) => {
      showToast(getSchedulePollErrorMessage(error, '확정 일정을 불러오지 못했어요.'));
    });
  }, [activeClubId, loadUpcomingMatches, showToast, upcomingMatchesStatus]);

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

  return (
    <section>
      <div className="flex justify-between items-center mb-3 px-1">
        <h2 className="text-base font-extrabold text-gray-900">다음 일정</h2>
      </div>

      {upcomingMatchesStatus === 'loading' ? (
        <div role="status" className="card p-5 text-sm font-bold text-gray-500">
          확정 일정을 불러오는 중입니다
        </div>
      ) : null}

      {upcomingMatchesStatus === 'error' && upcomingMatchesError ? (
        <div role="alert" className="card border-feedback-error-border bg-feedback-error-bg p-5">
          <p className="text-sm font-bold text-feedback-error">{upcomingMatchesError}</p>
        </div>
      ) : null}

      {upcomingMatchesStatus !== 'loading' && nextMatch ? (
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CalendarClock size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-gray-900">{nextMatch.title}</p>
                {nextMatch.status === 'cancelled' ? (
                  <Badge label="취소" variant="gray" className="border border-gray-200 bg-gray-100 text-gray-600" />
                ) : (
                  <Badge label="예정" variant="green" />
                )}
              </div>
              <p className="text-xs font-bold text-gray-600">{formatMatchDate(nextMatch.date)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                <MapPin size={13} />
                {nextMatch.location}
              </p>
              {nextMatch.status === 'cancelled' ? (
                <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-700">
                  취소 사유: {nextMatch.cancellationReason}
                </p>
              ) : null}
              {canManageSchedule && nextMatch.status !== 'cancelled' ? (
                <button
                  type="button"
                  onClick={() => {
                    setCancelTargetMatch(nextMatch);
                    setCancellationReason('');
                    setCancelError(null);
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-feedback-error-border bg-white px-4 py-3 text-sm font-semibold text-feedback-error transition-all hover:bg-feedback-error-bg active:scale-95"
                >
                  <Ban size={16} />
                  일정 취소
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {upcomingMatchesStatus === 'ready' && !nextMatch ? (
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
              <CalendarClock size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">확정된 다음 일정이 없어요</p>
              <p className="mt-1 text-xs font-medium text-gray-500">
                운동화는 묶어뒀고, 휘슬만 기다리는 중이에요.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        title="확정 일정 취소"
        isOpen={cancelTargetMatch !== null}
        onClose={() => {
          if (isCancelling) return;
          setCancelTargetMatch(null);
          setCancellationReason('');
          setCancelError(null);
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-500">취소 사유</label>
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
            disabled={isCancelling}
            onClick={() => void handleCancelMatch()}
            className="w-full rounded-xl bg-feedback-error px-4 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isCancelling ? '취소 중...' : '취소 처리하기'}
          </button>
        </div>
      </Modal>
    </section>
  );
}

function formatMatchDate(value: string) {
  const date = new Date(value);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[date.getDay()] ?? '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${month}월 ${day}일 ${weekday} ${hours}:${minutes}`;
}
