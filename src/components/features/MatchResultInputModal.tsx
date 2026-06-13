'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, Minus, Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import { saveMatchResult, type MatchLineupEntry, type UpcomingMatch } from '@/stores/matchClient';
import { useToastStore } from '@/stores/useToastStore';

type PlayerRecord = {
  goals: number;
  assists: number;
};

export default function MatchResultInputModal({
  isOpen,
  onClose,
  clubId,
  match,
  lineup,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  match: UpcomingMatch;
  lineup: MatchLineupEntry[];
  onSaved: (score: { home: number; away: number }) => void | Promise<void>;
}) {
  const { showToast } = useToastStore();
  const [homeScore, setHomeScore] = useState(match.ourScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.oppScore ?? 0);
  const [records, setRecords] = useState<Record<string, PlayerRecord>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const orderedLineup = useMemo(
    () => [...lineup].sort((left, right) => (
      left.teamNumber - right.teamNumber
      || (left.formationSlot ?? 99) - (right.formationSlot ?? 99)
      || left.playerName.localeCompare(right.playerName)
    )),
    [lineup],
  );
  const canSubmit = orderedLineup.length > 0 && !isSaving;

  const setScore = (side: 'home' | 'away', value: number) => {
    const nextValue = clampCount(value);
    if (side === 'home') setHomeScore(nextValue);
    else setAwayScore(nextValue);
  };

  const updateRecord = (membershipId: string, key: keyof PlayerRecord, delta: number) => {
    setRecords((prev) => {
      const current = prev[membershipId] ?? { goals: 0, assists: 0 };
      return {
        ...prev,
        [membershipId]: {
          ...current,
          [key]: clampCount(current[key] + delta),
        },
      };
    });
  };

  const buildPlayerStatsPayload = () => orderedLineup.map((player) => ({
    membershipId: player.membershipId,
    goals: records[player.membershipId]?.goals ?? 0,
    assists: records[player.membershipId]?.assists ?? 0,
  }));

  const handleSubmit = () => {
    if (!canSubmit) return;
    const validationError = validateScoreConsistency({
      homeScore,
      awayScore,
      lineup: orderedLineup,
      records,
    });
    if (validationError) {
      showToast(validationError);
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);

    try {
      await saveMatchResult({
        clubId,
        matchId: match.id,
        score: {
          home: homeScore,
          away: awayScore,
        },
        playerStats: buildPlayerStatsPayload(),
      });
      await onSaved({ home: homeScore, away: awayScore });
      showToast('경기 결과 저장');
      setIsConfirmOpen(false);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : '경기 결과를 저장하지 못했어요.';
      showToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="경기 결과 입력" isOpen={isOpen} onClose={onClose} presentation="dialog">
      <div className="space-y-4">
        <div className="rounded-2xl border border-glass-border bg-glass-bg/60 p-4 backdrop-blur-sm">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <ScoreInput
              label="Red"
              value={homeScore}
              onChange={(value) => setScore('home', value)}
              className="text-red-team"
            />
            <span className="text-xs font-black text-tertiary">VS</span>
            <ScoreInput
              label="Blue"
              value={awayScore}
              onChange={(value) => setScore('away', value)}
              className="text-blue-team"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-glass-border bg-glass-bg shadow-glass-shadow backdrop-blur-md">
          <div className="grid min-h-[44px] grid-cols-[36px_minmax(0,1fr)_116px_116px] items-center border-b border-glass-border/50 bg-glass-bg/60 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-secondary">
            <div className="text-center">OVR</div>
            <div className="px-2">선수</div>
            <div className="text-center">골</div>
            <div className="text-center">도움</div>
          </div>
          {orderedLineup.length > 0 ? (
            <div className="divide-y divide-border">
              {orderedLineup.map((player) => {
                const record = records[player.membershipId] ?? { goals: 0, assists: 0 };
                const teamClass = player.teamNumber === 1 ? 'text-red-team' : 'text-blue-team';
                const teamRowClass = player.teamNumber === 1
                  ? 'bg-red-team/5 ring-1 ring-inset ring-red-team/10'
                  : 'bg-blue-team/5 ring-1 ring-inset ring-blue-team/10';

                return (
                  <div
                    key={player.membershipId}
                    className={`grid min-h-[68px] grid-cols-[36px_minmax(0,1fr)_116px_116px] items-center px-2 py-2 text-sm ${teamRowClass}`}
                  >
                    <div className={`text-center font-extrabold ${teamClass}`}>{player.playerOvr}</div>
                    <div className="min-w-0 px-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <Image
                          src={player.playerPhotoUrl || getFallbackAvatar(player.playerName)}
                          alt=""
                          width={28}
                          height={28}
                          sizes="28px"
                          className="h-7 w-7 shrink-0 rounded-full bg-surface-bg object-cover ring-1 ring-border"
                          unoptimized
                        />
                        <p className="truncate font-bold text-primary">{player.playerName}</p>
                      </div>
                    </div>
                    <Stepper
                      label={`${player.playerName} 골`}
                      value={record.goals}
                      onMinus={() => updateRecord(player.membershipId, 'goals', -1)}
                      onPlus={() => updateRecord(player.membershipId, 'goals', 1)}
                    />
                    <Stepper
                      label={`${player.playerName} 도움`}
                      value={record.assists}
                      onMinus={() => updateRecord(player.membershipId, 'assists', -1)}
                      onPlus={() => updateRecord(player.membershipId, 'assists', 1)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-xs font-bold text-tertiary">전술 라인업을 먼저 확정해야 합니다</div>
          )}
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="w-full rounded-xl bg-brand-primary px-4 py-3 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-brand-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {isSaving ? '저장 중...' : '경기 종료 처리'}
        </button>
      </div>
      <Modal
        title="경기 결과 최종 확인"
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isSaving) setIsConfirmOpen(false);
        }}
        presentation="dialog"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-result-loss/20 bg-result-loss/10 p-4 text-result-loss">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-black">경기 결과는 제출 후 수정할 수 없습니다.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface-bg p-4 text-center">
            <p className="text-xs font-bold text-secondary">최종 점수</p>
            <p className="mt-2 text-2xl font-black text-primary">
              <span className="text-red-team">Red {homeScore}</span>
              <span className="mx-2 text-tertiary">:</span>
              <span className="text-blue-team">Blue {awayScore}</span>
            </p>
            <p className="mt-3 text-xs font-bold text-secondary">
              위 점수로 경기 결과를 확정하시겠습니까?
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setIsConfirmOpen(false)}
              className="rounded-xl border border-border bg-surface-bg px-4 py-3 text-xs font-extrabold text-secondary transition-all hover:bg-surface-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleConfirmSubmit()}
              className="rounded-xl bg-brand-primary px-4 py-3 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-brand-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isSaving ? '저장 중...' : '최종 확정'}
            </button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  className: string;
}) {
  return (
    <label className="block text-center">
      <span className={`text-xs font-black ${className}`}>{label}</span>
      <input
        type="number"
        min={0}
        max={99}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-12 w-full rounded-xl border border-border bg-surface-elevated text-center text-xl font-black text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
      />
    </label>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1" aria-label={label}>
      <button
        type="button"
        onClick={onMinus}
        disabled={value <= 0}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-surface-bg text-secondary transition-transform hover:bg-surface-hover active:scale-90 disabled:opacity-40"
        aria-label={`${label} 감소`}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <span className="w-5 text-center text-sm font-black text-primary">{value}</span>
      <button
        type="button"
        onClick={onPlus}
        disabled={value >= 99}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-surface-bg text-secondary transition-transform hover:bg-surface-hover active:scale-90 disabled:opacity-40"
        aria-label={`${label} 증가`}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function clampCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(99, Math.max(0, Math.trunc(value)));
}

function validateScoreConsistency({
  homeScore,
  awayScore,
  lineup,
  records,
}: {
  homeScore: number;
  awayScore: number;
  lineup: MatchLineupEntry[];
  records: Record<string, PlayerRecord>;
}) {
  const totals = lineup.reduce(
    (acc, player) => {
      const record = records[player.membershipId] ?? { goals: 0, assists: 0 };
      const teamTotals = player.teamNumber === 1 ? acc.red : acc.blue;
      teamTotals.goals += record.goals;
      teamTotals.assists += record.assists;
      return acc;
    },
    {
      red: { goals: 0, assists: 0 },
      blue: { goals: 0, assists: 0 },
    },
  );

  return getTeamStatTotalError('Red', '골', homeScore, totals.red.goals)
    ?? getTeamStatTotalError('Red', '도움', homeScore, totals.red.assists)
    ?? getTeamStatTotalError('Blue', '골', awayScore, totals.blue.goals)
    ?? getTeamStatTotalError('Blue', '도움', awayScore, totals.blue.assists);
}

function getTeamStatTotalError(teamLabel: 'Red' | 'Blue', statLabel: '골' | '도움', score: number, total: number) {
  if (total <= score) return null;
  return `${teamLabel} 팀의 최종 점수(${score})보다 선수의 ${statLabel} 수 합계(${total})가 더 많을 수 없습니다.`;
}
