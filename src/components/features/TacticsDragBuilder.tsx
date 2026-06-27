'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, Lock, Plus, Send } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { addMatchAttendee, saveMatchLineup, confirmMatchLineup, publishMatchLineup, type MatchAttendee, type MatchLineupEntry, type UpcomingMatch } from '@/stores/matchClient';
import { fetchApprovedMemberships, type ApprovedMembership } from '@/stores/membershipClient';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import Modal from '@/components/ui/Modal';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import { lockBodyScroll, unlockBodyScroll } from '@/utils/scrollLock';
import SoccerPitch from './SoccerPitch';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Player {
  id: string;
  name: string;
  ovr: number;
  matchPoints: number;
  photo: string;
  isLeader?: boolean;
  slotIndex?: number;
}

export type TacticsAvatarTeam = 'red' | 'blue' | 'bench';

const initialPlayers: Player[] = [];
const TACTICS_SLOT_COUNT = 18;
const TACTICS_COLUMNS = 6;
const LOCAL_ICONS = {
  tactics: '/icons/tactics.svg',
} as const;
type TeamState = { id: 'red' | 'blue'; name: string; color: 'red' | 'blue'; players: Player[] };
export type MatchAnticipationStage = 'waitingRoster' | 'drafting' | 'redReady' | 'blueReady' | 'finalizing';
export type MatchAnticipationMemberState = 'notAttending' | 'bench' | 'red' | 'blue';

export type MatchAnticipationState = {
  stage: MatchAnticipationStage;
  memberState: MatchAnticipationMemberState;
  redCount: number;
  blueCount: number;
  benchCount: number;
  redReady: boolean;
  blueReady: boolean;
};

interface TacticsDragBuilderProps {
  clubId?: string;
  matchId?: string;
  players?: Player[];
  lineup?: MatchLineupEntry[];
  readOnly?: boolean;
  embedded?: boolean;
  onLineupUpdated?: (nextLineup: MatchLineupEntry[]) => void;
  onPlayersUpdated?: (nextPlayers: Player[]) => void;
  match?: UpcomingMatch;
  onMatchUpdated?: (nextMatch: UpcomingMatch) => void;
}

export function TacticsPlayerAvatar({
  player,
  teamId,
  className = '',
  tabIndex,
  testId,
}: {
  player: Pick<Player, 'name' | 'photo' | 'isLeader'>;
  teamId: TacticsAvatarTeam;
  className?: string;
  tabIndex?: number;
  testId?: string;
}) {
  return (
    <span
      tabIndex={tabIndex}
      data-testid={testId}
      className={`group relative -m-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-white shadow-sm transition-[box-shadow,transform,opacity] ${getAvatarBorderClass(teamId)} ${className}`}
    >
      <TacticsPlayerAvatarContent player={player} teamId={teamId} />
    </span>
  );
}

function TacticsPlayerAvatarContent({
  player,
  teamId,
}: {
  player: Pick<Player, 'name' | 'photo' | 'isLeader'>;
  teamId: TacticsAvatarTeam;
}) {
  return (
    <>
      <Image
        src={getPlayerPhotoSrc(player)}
        alt={player.name}
        width={32}
        height={32}
        sizes="32px"
        className="rounded-full bg-gray-100"
        style={{ width: 32, height: 32 }}
        unoptimized
      />
      {player.isLeader ? (
        <span className={`absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black text-white shadow-sm ${getAvatarLeaderBadgeClass(teamId)}`}>
          C
        </span>
      ) : null}
      <span className="pointer-events-none absolute -top-7 left-1/2 z-40 min-w-max -translate-x-1/2 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black leading-none text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {player.name}
      </span>
    </>
  );
}

function DraggablePlayerAvatar({
  player,
  zone,
  disabled = false,
  stackIndex = 1,
  slotIndex,
  isSelected = false,
  isRecentlyDropped = false,
  onSelect,
}: {
  player: Player;
  zone: string;
  disabled?: boolean;
  stackIndex?: number;
  slotIndex?: number;
  isSelected?: boolean;
  isRecentlyDropped?: boolean;
  onSelect?: (playerId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id, data: { zone, slotIndex }, disabled });

  const isField = zone === 'red' || zone === 'blue';
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isField ? 'none' : transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 30 : stackIndex,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...(!disabled ? attributes : {})}
      {...(!disabled ? listeners : {})}
      onClick={(event) => {
        if (disabled || !onSelect) return;
        event.stopPropagation();
        onSelect(player.id);
      }}
      aria-label={player.name}
      aria-pressed={isSelected}
      className={`group relative -m-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-white shadow-sm ${
        isField ? 'transition-none!' : 'transition-[box-shadow,transform,opacity]'
      } ${getAvatarBorderClass(zone)} ${
        disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing active:scale-105'
      } ${
        isDragging || isSelected ? 'shadow-xl ring-2 ring-fcgreen-500' : 'hover:shadow-md'
      } ${isRecentlyDropped ? 'animate-bounceSubtle' : ''}`}
    >
      <TacticsPlayerAvatarContent player={player} teamId={zone as TacticsAvatarTeam} />
    </button>
  );
}

function TacticsSlot({
  teamId,
  index,
  player,
  canDrag,
  selectedPlayerId,
  recentDropPlayerId,
  onSelectPlayer,
  onPlacePlayer,
}: {
  teamId: 'red' | 'blue';
  index: number;
  player?: Player;
  canDrag: boolean;
  selectedPlayerId: string | null;
  recentDropPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
  onPlacePlayer: (teamId: 'red' | 'blue', slotIndex: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${teamId}-${index}`,
    data: { zone: teamId, slotIndex: index },
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-9 w-8 items-center justify-center rounded-full transition-colors ${isOver ? 'bg-white/25 ring-1 ring-white/60' : ''}`}
      data-testid={`${teamId}-tactics-slot-${index}`}
      onClick={() => {
        if (!canDrag || !selectedPlayerId) return;
        onPlacePlayer(teamId, index);
      }}
    >
      {player ? (
        <DraggablePlayerAvatar
          player={player}
          zone={teamId}
          disabled={!canDrag}
          stackIndex={Math.floor(index / TACTICS_COLUMNS) + 1}
          slotIndex={index}
          isSelected={selectedPlayerId === player.id}
          isRecentlyDropped={recentDropPlayerId === player.id}
          onSelect={onSelectPlayer}
        />
      ) : null}
    </div>
  );
}

function PlayerOverlay({ player }: { player: Player }) {
  return (
    <div className="flex h-9 w-9 scale-110 cursor-grabbing touch-none select-none items-center justify-center rounded-full border-2 border-fcgreen-500 bg-white opacity-90 shadow-glass-shadow transition-transform duration-200">
      <Image
        src={getPlayerPhotoSrc(player)}
        alt={player.name}
        width={32}
        height={32}
        sizes="32px"
        className="rounded-full bg-gray-100"
        style={{ width: 32, height: 32 }}
        unoptimized
      />
    </div>
  );
}

function MatchAnticipationPanel({
  match,
  players,
  lineup,
  currentMembershipId,
}: {
  match: UpcomingMatch | undefined;
  players: Player[];
  lineup: MatchLineupEntry[];
  currentMembershipId: string | null;
}) {
  const state = buildMatchAnticipationState({
    match,
    players,
    lineup,
    currentMembershipId,
  });
  const memberCopy = getMemberAnticipationCopy(state.memberState);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-event-match-border bg-event-match-bg p-3 shadow-sm animate-fadeIn"
      data-testid="match-anticipation-panel"
      aria-label="프리매치 라인업 티저"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-card shadow-xs">
          <Image
            src={LOCAL_ICONS.tactics}
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] object-contain"
            style={{ width: 22, height: 22 }}
            unoptimized
          />
        </span>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${getMemberBadgeClass(state.memberState)}`}
          aria-label={`내 프리매치 상태: ${memberCopy.label}`}
        >
          {memberCopy.label}
        </span>
      </div>

      <SoccerPitch testId="match-anticipation-field" className="max-h-[132px]">
        <div className="relative grid h-full grid-cols-2 blur-[2px]">
          <AnticipationFieldSide team="red" count={state.redCount} ready={state.redReady} />
          <AnticipationFieldSide team="blue" count={state.blueCount} ready={state.blueReady} />
        </div>
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-2xl border border-white/30 bg-white/15 shadow-inner backdrop-blur-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/35 bg-surface-elevated/85 shadow-lg">
            <Lock size={30} aria-hidden="true" className="text-gray-500" strokeWidth={2} />
            <span className="sr-only">라인업 잠금</span>
          </div>
        </div>
      </SoccerPitch>
    </section>
  );
}

function AnticipationFieldSide({
  team,
  count,
  ready,
}: {
  team: 'red' | 'blue';
  count: number;
  ready: boolean;
}) {
  const visibleCount = Math.max(3, Math.min(count, 6));
  const glowClass = ready
    ? team === 'red'
      ? 'ring-2 ring-red-team/70 shadow-lg'
      : 'ring-2 ring-blue-team/70 shadow-lg'
    : 'ring-1 ring-white/25';
  return (
    <div className={`relative ${team === 'red' ? 'rounded-l-2xl' : 'rounded-r-2xl'}`} aria-hidden="true">
      <div className={`grid h-full grid-cols-3 grid-rows-2 content-center gap-2 p-3 ${team === 'red' ? 'justify-items-start' : 'justify-items-end'}`}>
        {Array.from({ length: visibleCount }, (_, index) => (
          <span
            key={`${team}-teaser-${index}`}
            className={`h-5 w-5 rounded-full border border-white/50 bg-surface-elevated/80 shadow-md motion-safe:animate-pulse motion-reduce:animate-none ${glowClass}`}
          />
        ))}
      </div>
    </div>
  );
}

function TeamDropZone({
  team,
  canEdit,
  canArrange,
  selectedPlayerId,
  recentDropPlayerId,
  onSelectPlayer,
  onPlacePlayer,
}: {
  team: TeamState;
  canEdit: boolean;
  canArrange: boolean;
  selectedPlayerId: string | null;
  recentDropPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
  onPlacePlayer: (teamId: 'red' | 'blue', slotIndex: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `team-${team.id}`,
    data: { zone: team.id },
    disabled: !canEdit || !canArrange,
  });

  return (
    <div
      ref={setNodeRef}
      data-testid={`${team.id}-tactics-zone`}
      className={`relative flex-1 touch-none select-none px-2 py-1.5 transition-[box-shadow,background-color,transform] ${
        team.id === 'red' ? 'rounded-l-2xl' : 'rounded-r-2xl'
      } ${isOver ? 'scale-[1.01] bg-white/25 shadow-lg ring-2 ring-fcgreen-500' : ''}`}
    >
      <SortableContext items={team.players.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div
          className={`grid h-full min-h-[92px] grid-cols-6 grid-rows-3 content-start gap-x-0 gap-y-0 rounded-xl p-1.5 ${
            team.id === 'red' ? 'justify-items-start' : 'justify-items-end'
          }`}
          aria-label={`${team.name} 6x3 배치 구획`}
        >
          {Array.from({ length: TACTICS_SLOT_COUNT }, (_, index) => (
            <TacticsSlot
              key={`${team.id}-${index}`}
              teamId={team.id}
              index={index}
              player={getPlayerInSlot(team.players, index)}
              canDrag={canEdit && canArrange}
              selectedPlayerId={selectedPlayerId}
              recentDropPlayerId={recentDropPlayerId}
              onSelectPlayer={onSelectPlayer}
              onPlacePlayer={onPlacePlayer}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function TacticsPitch({
  teams,
  canEdit,
  isSaving,
  isOperator,
  isRedLeader,
  isBlueLeader,
  match,
  canConfirmRed,
  canConfirmBlue,
  selectedPlayerId,
  recentDropPlayerId,
  onSelectPlayer,
  onPlacePlayer,
  onConfirm,
  onPublish,
}: {
  teams: TeamState[];
  canEdit: boolean;
  isSaving: boolean;
  isOperator: boolean;
  isRedLeader: boolean;
  isBlueLeader: boolean;
  match: UpcomingMatch | null;
  canConfirmRed: boolean;
  canConfirmBlue: boolean;
  selectedPlayerId: string | null;
  recentDropPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
  onPlacePlayer: (teamId: 'red' | 'blue', slotIndex: number) => void;
  onConfirm: (teamNumber: 1 | 2, confirmed?: boolean) => Promise<void>;
  onPublish: () => Promise<void>;
}) {
  const redConfirmed = Boolean(match?.redLeaderConfirmed);
  const blueConfirmed = Boolean(match?.blueLeaderConfirmed);

  return (
    <SoccerPitch testId="tactics-field">
      <div className="relative flex h-full">
        {teams.map((team) => (
          <TeamDropZone
            key={team.id}
            team={team}
            canEdit={canEdit && !isSaving}
            canArrange={isOperator || (team.id === 'red' ? isRedLeader : isBlueLeader)}
            selectedPlayerId={selectedPlayerId}
            recentDropPlayerId={recentDropPlayerId}
            onSelectPlayer={onSelectPlayer}
            onPlacePlayer={onPlacePlayer}
          />
        ))}
      </div>
      {isPreMatchTacticsWindow(match ?? undefined) ? (
        <>
          <TacticsConfirmBadge
            team="red"
            confirmed={redConfirmed}
            canToggle={canConfirmRed}
            disabled={isSaving}
            onToggle={() => onConfirm(1, !redConfirmed)}
          />
          <TacticsConfirmBadge
            team="blue"
            confirmed={blueConfirmed}
            canToggle={canConfirmBlue}
            disabled={isSaving}
            onToggle={() => onConfirm(2, !blueConfirmed)}
          />
          {isOperator && redConfirmed && blueConfirmed && !match?.tacticsCompleted ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void onPublish()}
              className="absolute left-1/2 top-1/2 z-30 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-brand-primary bg-brand-primary text-white shadow-lg ring-2 ring-white/70 transition-all hover:bg-brand-primary-hover active:scale-95 disabled:opacity-50"
              aria-label="전술 완료 및 공개"
            >
              <Send size={15} strokeWidth={2.6} aria-hidden="true" />
            </button>
          ) : null}
        </>
      ) : null}
    </SoccerPitch>
  );
}

function TacticsConfirmBadge({
  team,
  confirmed,
  canToggle,
  disabled,
  onToggle,
}: {
  team: 'red' | 'blue';
  confirmed: boolean;
  canToggle: boolean;
  disabled: boolean;
  onToggle: () => Promise<void>;
}) {
  const isRed = team === 'red';
  const teamName = isRed ? 'Red' : 'Blue';
  const positionClass = isRed ? 'left-2 top-2' : 'right-2 top-2';
  const stateClass = confirmed
    ? isRed
      ? 'border-red-team-border bg-red-team text-white shadow-md ring-2 ring-white/70 animate-fadeIn'
      : 'border-blue-team-border bg-blue-team text-white shadow-md ring-2 ring-white/70 animate-fadeIn'
    : isRed
      ? 'border-red-team-border/40 bg-red-team-bg/80 text-red-team/45 shadow-sm'
      : 'border-blue-team-border/40 bg-blue-team-bg/80 text-blue-team/45 shadow-sm';
  const label = confirmed
    ? canToggle ? `${teamName} 전술 확정 취소` : `${teamName} 전술 확정됨`
    : `${teamName} 전술 확정`;
  const content = confirmed ? (
    <Check size={15} strokeWidth={3} aria-hidden="true" />
  ) : (
    <Check size={13} strokeWidth={3} aria-hidden="true" />
  );

  if (!canToggle) {
    return (
      <span
        className={`absolute ${positionClass} z-30 flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-black ${stateClass}`}
        aria-label={label}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onToggle()}
      className={`absolute ${positionClass} z-30 flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-black transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${stateClass}`}
      aria-label={label}
    >
      {content}
    </button>
  );
}

function BenchStrip({
  bench,
  canEdit,
  isSaving,
  match,
  selectedPlayerId,
  recentDropPlayerId,
  onSelectPlayer,
  nodeRef,
  isOver,
}: {
  bench: Player[];
  canEdit: boolean;
  isSaving: boolean;
  match: UpcomingMatch | null;
  selectedPlayerId: string | null;
  recentDropPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
  nodeRef?: (element: HTMLElement | null) => void;
  isOver?: boolean;
}) {
  if (!canEdit && bench.length > 0) return null;
  if (bench.length === 0) {
    if (!isPreMatchTacticsWindow(match ?? undefined)) {
      return (
        <div
          ref={nodeRef}
          data-testid="tactics-bench-dropzone"
          className={`h-2 touch-none select-none rounded-full transition-colors ${
            isOver ? 'bg-green-500/30 ring-2 ring-green-500/20' : 'bg-transparent'
          }`}
          aria-hidden="true"
        />
      );
    }
    return (
      <div
        ref={nodeRef}
        data-testid="tactics-bench-dropzone"
        className={`h-2 touch-none select-none rounded-full transition-colors ${
          isOver ? 'bg-green-500/30 ring-2 ring-green-500/20' : 'bg-transparent'
        }`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={nodeRef}
      data-testid="tactics-bench-dropzone"
      className={`rounded-2xl border transition-all duration-200 min-h-[54px] flex touch-none select-none items-center justify-between ${
        isOver
          ? 'border-green-500 bg-green-900/20 scale-[1.01] ring-2 ring-green-500/30'
          : 'border-green-800/15 bg-green-900/10'
      } px-3 py-2.5 shadow-inner`}
    >
      <SortableContext items={bench.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="flex flex-1 flex-wrap gap-2 min-h-[36px] items-center justify-center">
          {bench.map((player) => (
            <DraggablePlayerAvatar
              key={player.id}
              player={player}
              zone="bench"
              disabled={!canEdit || isSaving}
              isSelected={selectedPlayerId === player.id}
              isRecentlyDropped={recentDropPlayerId === player.id}
              onSelect={onSelectPlayer}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}


const triggerHaptic = (pattern: number | number[]) => {
  if (typeof window !== 'undefined' && 'vibrate' in window.navigator) {
    try {
      window.navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors
    }
  }
};


// ─── 메인: 드래그 앤 드롭 전술 빌더 ───
export default function TacticsDragBuilder({
  clubId,
  matchId,
  players = initialPlayers,
  lineup = [],
  readOnly = false,
  embedded = false,
  onLineupUpdated,
  onPlayersUpdated,
  match,
  onMatchUpdated,
}: TacticsDragBuilderProps) {
  const { userRole } = useAppStore();
  const memberProfile = useAuthStore((state) => state.memberProfile);
  const { showToast } = useToastStore();
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [recentDropPlayerId, setRecentDropPlayerId] = useState<string | null>(null);
  const [selectedPlacementPlayerId, setSelectedPlacementPlayerId] = useState<string | null>(null);
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [availableMembers, setAvailableMembers] = useState<ApprovedMembership[]>([]);

  const [bench, setBench] = useState<Player[]>(() => buildInitialBench(players, lineup));
  const [teams, setTeams] = useState<TeamState[]>(() => buildInitialTeams(lineup));
  const isDragScrollLockedRef = useRef(false);
  const [lastOverId, setLastOverId] = useState<string | null>(null);

  const isOperator = userRole === 'admin' || userRole === 'operator';
  const isMatchTacticsCompleted = match?.tacticsCompleted ?? false;

  const redLeaderId = teams.find((t) => t.id === 'red')?.players.find((p) => p.isLeader)?.id;
  const blueLeaderId = teams.find((t) => t.id === 'blue')?.players.find((p) => p.isLeader)?.id;

  const isRedLeader = Boolean(memberProfile?.id && memberProfile.id === redLeaderId);
  const isBlueLeader = Boolean(memberProfile?.id && memberProfile.id === blueLeaderId);

  const canEdit = Boolean(
    !readOnly &&
    !isMatchTacticsCompleted &&
    (isOperator || isRedLeader || isBlueLeader)
  );

  useEffect(() => {
    setBench(buildInitialBench(players, lineup));
    setTeams(buildInitialTeams(lineup));
  }, [lineup, players]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const { isOver: isOverBench, setNodeRef: setBenchNodeRef } = useDroppable({
    id: 'bench-dropzone',
    data: { zone: 'bench' },
    disabled: !canEdit,
  });

  const activePlayer = [bench, ...teams.flatMap(t => t.players)].flat().find((p) => p.id === activeId);

  const releaseDragScrollLock = useCallback(() => {
    if (!isDragScrollLockedRef.current) return;
    unlockBodyScroll();
    isDragScrollLockedRef.current = false;
  }, []);

  useEffect(() => {
    if (!recentDropPlayerId) return undefined;
    const timeoutId = window.setTimeout(() => setRecentDropPlayerId(null), 420);
    return () => window.clearTimeout(timeoutId);
  }, [recentDropPlayerId]);

  useEffect(() => () => {
    releaseDragScrollLock();
  }, [releaseDragScrollLock]);

  const findPlayerZone = (id: string): string | null => {
    if (bench.find((p) => p.id === id)) return 'bench';
    const team = teams.find(t => t.players.find(p => p.id === id));
    if (team) return team.id;
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!isDragScrollLockedRef.current) {
      lockBodyScroll();
      isDragScrollLockedRef.current = true;
    }
    setActiveId(event.active.id as string);
    setSelectedPlacementPlayerId(null);
    setLastOverId(null);
    triggerHaptic(15);
  };

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    const overId = over ? (over.id as string) : null;
    if (overId && overId !== lastOverId) {
      setLastOverId(overId);
      triggerHaptic(5);
    } else if (!overId && lastOverId) {
      setLastOverId(null);
    }
  }, [lastOverId]);

  const placePlayerInSlot = async (playerId: string, targetZone: 'red' | 'blue' | 'bench', targetIndex: number | null) => {
    const player = [bench, ...teams.flatMap(t => t.players)].flat().find((p) => p.id === playerId);
    if (!player) return;

    const sourceZone = findPlayerZone(playerId);
    if (!sourceZone) return;
    if (!canEdit || !clubId || !matchId) return;

    // 권한 체크
    if (!isOperator) {
      if (sourceZone === 'red' || sourceZone === 'blue') {
        if (!canManageZone(sourceZone, { isOperator, isRedLeader, isBlueLeader })) {
          showToast('소속 팀의 선수만 이동할 수 있어요.');
          return;
        }
      }
      if (targetZone === 'red' || targetZone === 'blue') {
        if (!canManageZone(targetZone, { isOperator, isRedLeader, isBlueLeader })) {
          showToast('소속 팀에만 선수를 배치할 수 있어요.');
          return;
        }
      }
    }

    if (sourceZone === targetZone && targetIndex !== null) {
      // 동일 zone 내에서 동일 index로 드롭한 경우 무시
      const currentIdx = sourceZone === 'bench' 
        ? bench.findIndex(p => p.id === playerId)
        : teams.find(t => t.id === sourceZone)?.players.findIndex(p => p.id === playerId) ?? -1;
      const currentSlot = sourceZone === 'bench' 
        ? null 
        : getPlayerSlot(player, currentIdx);
      if (currentSlot === targetIndex) return;
    }

    setIsSaving(true);
    try {
      const draft = buildOperatorLineupDraft({
        bench,
        teams,
        playerId,
        targetTeamId: targetZone,
        targetIndex,
      });

      // UI 즉각 반영 (Optimistic Update)
      setTeams(draft.teams);
      setBench(draft.bench);
      setSelectedPlacementPlayerId(null);

      // Red팀과 Blue팀에 각각 1명 이상 있어야 DB 영구 보존 API가 작동하므로,
      // API 조건(canPersist) 충족 여부를 확인
      if (!draft.canPersist) {
        showToast('Red/Blue에 최소 1명씩 배치하면 전술이 저장돼요.');
        setIsSaving(false);
        return;
      }

      try {
        const nextLineup = await saveMatchLineup({
          clubId,
          matchId,
          entries: draft.entries,
        });
        setTeams(buildInitialTeams(nextLineup));
        setBench(buildInitialBench(players, nextLineup));
        onLineupUpdated?.(nextLineup);
      } catch (error) {
        console.warn('[FC Moim] saveMatchLineup failed, falling back to local simulation:', error);
        const simulatedLineup = createSimulatedLineup(draft.entries, matchId, [
          ...players,
          ...draft.teams.flatMap((team) => team.players),
          ...draft.bench,
        ]);
        onLineupUpdated?.(simulatedLineup);
      }

      if (match) {
        onMatchUpdated?.(getMatchAfterLineupTeamChanges(match, [sourceZone, targetZone]));
      }
    } catch (error) {
      console.error('[FC Moim] Draft pick failed:', error);
      showToast('전술 배치를 저장하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    releaseDragScrollLock();
    setActiveId(null);
    setLastOverId(null);
    const { active, over } = event;
    if (!over) {
      triggerHaptic([30, 50, 30]);
      return;
    }

    const targetZone = (over.data?.current as { zone?: string })?.zone;
    if (targetZone !== 'red' && targetZone !== 'blue' && targetZone !== 'bench') {
      triggerHaptic([30, 50, 30]);
      return;
    }

    await placePlayerInSlot(active.id as string, targetZone, getDropSlotIndex(over));
    setRecentDropPlayerId(active.id as string);
    triggerHaptic(20);
  };

  const handleDragCancel = () => {
    releaseDragScrollLock();
    setActiveId(null);
    setLastOverId(null);
    triggerHaptic([30, 50, 30]);
  };

  if (!canEdit && !isMatchTacticsCompleted) {
    return (
      <MatchAnticipationPanel
        match={match}
        players={players}
        lineup={lineup}
        currentMembershipId={memberProfile?.id ?? null}
      />
    );
  }

  const canConfirmRed = isOperator || Boolean(memberProfile?.id && memberProfile.id === redLeaderId);
  const canConfirmBlue = isOperator || Boolean(memberProfile?.id && memberProfile.id === blueLeaderId);

  const handleConfirm = async (teamNumber: 1 | 2, confirmed = true) => {
    if (!clubId || !matchId || !match) return;
    setIsSaving(true);
    try {
      const updatedMatch = await confirmMatchLineup({ clubId, matchId, teamNumber, ...(confirmed ? {} : { confirmed }) });
      onMatchUpdated?.(updatedMatch);
      showToast(`${teamNumber === 1 ? 'Red' : 'Blue'} ${confirmed ? '확정' : '확정 취소'}`);
    } catch (error) {
      console.error('[FC Moim] Confirm lineup failed:', error);
      showToast(confirmed ? '전술을 확정하지 못했어요.' : '전술 확정을 취소하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!clubId || !matchId || !match || !isOperator) return;
    setIsSaving(true);
    try {
      const updatedMatch = await publishMatchLineup({ clubId, matchId });
      onMatchUpdated?.(updatedMatch);
      showToast('전술을 공개했어요.');
    } catch (error) {
      console.error('[FC Moim] Publish lineup failed:', error);
      showToast('전술을 공개하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddAttendee = async () => {
    if (!clubId || !matchId) return;
    setShowAddAttendee(true);
    setSelectedMemberIds([]);
    try {
      setAvailableMembers(await fetchApprovedMemberships(clubId));
    } catch {
      setAvailableMembers([]);
    }
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleAddAttendeesBatch = async () => {
    if (!clubId || !matchId || selectedMemberIds.length === 0) return;
    setIsSaving(true);
    try {
      const attendees = await addMatchAttendee({
        clubId,
        matchId,
        membershipIds: selectedMemberIds,
      });
      const attendeePlayers = attendees.map(mapAttendeeToPlayer);
      setBench(buildInitialBench(attendeePlayers, teams.flatMap((team) => team.players.map(mapPlayerToLineupStub))));
      showToast(`${selectedMemberIds.length}명의 참석자를 대기명단에 추가했어요.`);
      setShowAddAttendee(false);
      onPlayersUpdated?.(attendeePlayers);
    } catch (error) {
      console.error('[FC Moim] Add attendees batch failed:', error);
      showToast('참석자를 추가하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={`relative overflow-hidden animate-fadeIn ${
      embedded
        ? 'rounded-2xl p-0'
        : 'rounded-3xl border border-feedback-warning-border bg-feedback-warning-bg p-3 shadow-sm tactics-frame'
    }`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-[11px] font-black text-gray-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white">
            <Image
              src={LOCAL_ICONS.tactics}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
              style={{ width: 16, height: 16 }}
              unoptimized
            />
          </span>
          전술 설정
        </h3>
        {canEdit && isOperator ? (
          <button
            type="button"
            onClick={() => void handleOpenAddAttendee()}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-white text-gray-500 hover:text-brand-primary hover:border-brand-primary active:scale-95 transition-all duration-300 group shadow-xs"
            aria-label="참석자 추가"
          >
            <Plus size={13} aria-hidden="true" className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        ) : null}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={slotFirstCollisionDetection}
        onDragStart={canEdit ? handleDragStart : undefined}
        onDragOver={canEdit ? handleDragOver : undefined}
        onDragEnd={canEdit ? handleDragEnd : undefined}
        onDragCancel={canEdit ? handleDragCancel : undefined}
      >
        <div className="mb-1.5">
          <TacticsPitch
            teams={teams}
            canEdit={canEdit}
            isSaving={isSaving}
            isOperator={isOperator}
            isRedLeader={isRedLeader}
            isBlueLeader={isBlueLeader}
            match={match ?? null}
            canConfirmRed={canConfirmRed}
            canConfirmBlue={canConfirmBlue}
            selectedPlayerId={selectedPlacementPlayerId}
            recentDropPlayerId={recentDropPlayerId}
            onSelectPlayer={setSelectedPlacementPlayerId}
            onPlacePlayer={(teamId, slotIndex) => {
              if (!selectedPlacementPlayerId) return;
              void placePlayerInSlot(selectedPlacementPlayerId, teamId, slotIndex);
            }}
            onConfirm={handleConfirm}
            onPublish={handlePublish}
          />
        </div>

        <BenchStrip
          bench={bench}
          canEdit={canEdit}
          isSaving={isSaving}
          match={match ?? null}
          selectedPlayerId={selectedPlacementPlayerId}
          recentDropPlayerId={recentDropPlayerId}
          onSelectPlayer={setSelectedPlacementPlayerId}
          nodeRef={setBenchNodeRef}
          isOver={isOverBench}
        />

        <DragOverlay adjustScale dropAnimation={null}>
          {activePlayer ? <PlayerOverlay player={activePlayer} /> : null}
        </DragOverlay>
      </DndContext>

      <Modal title="참석자 추가" isOpen={showAddAttendee} onClose={() => setShowAddAttendee(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto no-scrollbar">
            {availableMembers
              .filter((member) => ![bench, ...teams.map((team) => team.players)].flat().some((player) => player.id === member.id))
              .map((member) => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleToggleMember(member.id)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all active:scale-95 disabled:opacity-50 ${
                      isSelected
                        ? 'border-brand-primary bg-brand-primary-bg ring-1 ring-brand-primary/30'
                        : 'border-border/40 bg-surface-bg hover:bg-surface-hover'
                    }`}
                  >
                    <Image
                      src={member.photoUrl || getFallbackAvatar(member.nickname)}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full bg-surface-card"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold text-primary leading-tight">{member.nickname}</p>
                      <p className="mt-0.5 text-[10px] font-black text-brand-primary leading-none">OVR {member.ovr}</p>
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-brand-primary shrink-0 font-bold" />
                    )}
                  </button>
                );
              })}
            {availableMembers.length === 0 ? (
              <p className="col-span-2 py-6 text-center text-xs font-bold text-tertiary">추가할 회원을 불러오는 중입니다</p>
            ) : null}
            {availableMembers.length > 0 && availableMembers.filter((member) => ![bench, ...teams.map((team) => team.players)].flat().some((player) => player.id === member.id)).length === 0 ? (
              <p className="col-span-2 py-6 text-center text-xs font-bold text-tertiary">이미 모든 회원이 등록되어 있습니다.</p>
            ) : null}
          </div>

          {selectedMemberIds.length > 0 && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleAddAttendeesBatch()}
              className="w-full rounded-xl bg-brand-primary hover:bg-brand-primary-hover px-4 py-3 text-xs font-extrabold text-white transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            >
              {isSaving ? '추가 중...' : `${selectedMemberIds.length}명 추가하기`}
            </button>
          )}
        </div>
      </Modal>
    </section>
  );
}

function getAvatarBorderClass(zone: string) {
  if (zone === 'red') return 'border-red-team';
  if (zone === 'blue') return 'border-blue-team';
  return 'border-gray-200';
}

function getAvatarLeaderBadgeClass(zone: string) {
  if (zone === 'red') return 'bg-red-team';
  if (zone === 'blue') return 'bg-blue-team';
  return 'bg-award-mvp';
}

const slotFirstCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const pointerSlot = pointerCollisions.find((collision) => String(collision.id).startsWith('slot-'));
  if (pointerSlot) return [pointerSlot];
  if (pointerCollisions.length > 0) return pointerCollisions;

  const centerCollisions = closestCenter(args);
  const centerSlot = centerCollisions.find((collision) => String(collision.id).startsWith('slot-'));
  return centerSlot ? [centerSlot] : centerCollisions;
};

function convertToMobileSlot(slot: number | null): number | null {
  if (typeof slot !== 'number') return null;
  if (slot >= 18) {
    return Math.floor(slot / 12) * 6 + (slot % 6);
  }
  return slot;
}

function convertToDesktopSlot(slot: number | null): number | null {
  if (typeof slot !== 'number') return null;
  if (slot < 18) {
    return Math.floor(slot / 6) * 12 + (slot % 6);
  }
  return slot;
}

function buildInitialTeams(lineup: MatchLineupEntry[]): TeamState[] {
  const redPlayers = lineup.filter((entry) => entry.teamNumber === 1).map((entry, index) => ({
    ...mapLineupEntryToPlayer(entry),
    slotIndex: getInitialFormationSlot(
      { ...entry, formationSlot: convertToMobileSlot(entry.formationSlot) },
      index
    ),
  }));
  const bluePlayers = lineup.filter((entry) => entry.teamNumber === 2).map((entry, index) => ({
    ...mapLineupEntryToPlayer(entry),
    slotIndex: getInitialFormationSlot(
      { ...entry, formationSlot: convertToMobileSlot(entry.formationSlot) },
      index
    ),
  }));

  return [
    { id: 'red', name: 'Red', color: 'red', players: redPlayers },
    { id: 'blue', name: 'Blue', color: 'blue', players: bluePlayers },
  ];
}

function buildInitialBench(players: Player[], lineup: MatchLineupEntry[]) {
  const lineupMembershipIds = new Set(lineup.map((entry) => entry.membershipId));
  return players.filter((player) => !lineupMembershipIds.has(player.id));
}

function buildOperatorLineupDraft(input: {
  bench: Player[];
  teams: TeamState[];
  playerId: string;
  targetTeamId: 'red' | 'blue' | 'bench';
  targetIndex?: number | null;
}) {
  const allPlayers = [
    ...input.bench,
    ...input.teams.flatMap((team) => team.players),
  ];
  const movedPlayer = allPlayers.find((player) => player.id === input.playerId);
  if (!movedPlayer) {
    const entries = input.teams.flatMap(mapTeamToSaveEntries);
    return {
      teams: input.teams,
      bench: input.bench,
      entries,
      canPersist: hasBothTeams(entries),
    };
  }

  const sourceTeam = input.teams.find((team) => team.players.some((p) => p.id === input.playerId));
  const sourceZone = sourceTeam ? sourceTeam.id : 'bench';
  const sourceSlot = sourceTeam 
    ? getPlayerSlot(movedPlayer, sourceTeam.players.indexOf(movedPlayer))
    : null;

  let nextTeams = input.teams.map((t) => ({
    ...t,
    players: t.players.filter((p) => p.id !== input.playerId),
  }));
  const nextBench = input.bench.filter((p) => p.id !== input.playerId);

  const targetIndex = input.targetIndex;
  const isTargetSlotValid = typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < TACTICS_SLOT_COUNT;

  if (input.targetTeamId === 'bench') {
    nextBench.push({ ...movedPlayer, isLeader: false, slotIndex: undefined });
  } else {
    if (isTargetSlotValid) {
      const originalTargetTeam = input.teams.find((t) => t.id === input.targetTeamId);
      const occupyingPlayer = originalTargetTeam?.players.find(
        (p, idx) => getPlayerSlot(p, idx) === targetIndex
      );

      if (occupyingPlayer) {
        if (sourceZone === 'bench') {
          nextTeams = nextTeams.map((team) => {
            if (team.id === input.targetTeamId) {
              const players = team.players.filter((p) => p.id !== occupyingPlayer.id);
              return { ...team, players };
            }
            return team;
          });
          nextBench.push({ ...occupyingPlayer, isLeader: false, slotIndex: undefined });
          nextTeams = nextTeams.map((team) => {
            if (team.id === input.targetTeamId) {
              const players = [...team.players, { ...movedPlayer, slotIndex: targetIndex, isLeader: false }];
              return { ...team, players };
            }
            return team;
          });
        } else {
          nextTeams = nextTeams.map((team) => {
            if (team.id === input.targetTeamId) {
              const players = team.players.filter((p) => p.id !== occupyingPlayer.id);
              return { ...team, players };
            }
            return team;
          });
          nextTeams = nextTeams.map((team) => {
            if (team.id === sourceZone) {
              const players = [...team.players, { ...occupyingPlayer, slotIndex: sourceSlot ?? undefined, isLeader: false }];
              return { ...team, players };
            }
            return team;
          });
          nextTeams = nextTeams.map((team) => {
            if (team.id === input.targetTeamId) {
              const players = [...team.players, { ...movedPlayer, slotIndex: targetIndex, isLeader: false }];
              return { ...team, players };
            }
            return team;
          });
        }
      } else {
        nextTeams = nextTeams.map((team) => {
          if (team.id === input.targetTeamId) {
            const players = [...team.players, { ...movedPlayer, slotIndex: targetIndex, isLeader: false }];
            return { ...team, players };
          }
          return team;
        });
      }
    } else {
      const targetTeamPlayersAfterRemoval = nextTeams.find((t) => t.id === input.targetTeamId)?.players ?? [];
      const usedSlots = new Set(targetTeamPlayersAfterRemoval.map((item, idx) => getPlayerSlot(item, idx)));
      const fallbackIndex = findFirstOpenSlot(usedSlots);

      nextTeams = nextTeams.map((team) => {
        if (team.id === input.targetTeamId) {
          const players = [...team.players, { ...movedPlayer, slotIndex: fallbackIndex, isLeader: false }];
          return { ...team, players };
        }
        return team;
      });
    }
  }

  const normalizedTeams = nextTeams.map((team) => normalizeLeaderForTeam(team));

  const assignedIds = new Set(normalizedTeams.flatMap((team) => team.players.map((player) => player.id)));
  const finalBench = allPlayers
    .filter((player) => !assignedIds.has(player.id))
    .map((p) => ({ ...p, isLeader: false, slotIndex: undefined }));

  const entries = normalizedTeams.flatMap(mapTeamToSaveEntries);

  return {
    teams: normalizedTeams,
    bench: finalBench,
    entries,
    canPersist: hasBothTeams(entries),
  };
}

function normalizeLeaderForTeam(team: TeamState): TeamState {
  const existingLeader = team.players.find((p) => p.isLeader);
  if (existingLeader) {
    return {
      ...team,
      players: team.players.map((player) => ({
        ...player,
        isLeader: player.id === existingLeader.id,
      })),
    };
  }

  return {
    ...team,
    players: team.players.map((player, index) => ({
      ...player,
      isLeader: index === 0,
    })),
  };
}

function mapTeamToSaveEntries(team: TeamState) {
  return [...team.players].sort(comparePlayersBySlot).map((player) => ({
    membershipId: player.id,
    teamNumber: team.id === 'red' ? 1 as const : 2 as const,
    isLeader: Boolean(player.isLeader),
    position: 'MF' as const,
    formationSlot: convertToDesktopSlot(player.slotIndex ?? null),
  }));
}

function createSimulatedLineup(
  entries: ReturnType<typeof mapTeamToSaveEntries>,
  matchId: string,
  playerPool: Player[],
): MatchLineupEntry[] {
  const playersById = new Map(playerPool.map((player) => [player.id, player]));

  return entries.map((entry, index) => {
    const player = playersById.get(entry.membershipId);

    return {
      id: `simulated-${index}`,
      matchId,
      membershipId: entry.membershipId,
      teamNumber: entry.teamNumber,
      isLeader: entry.isLeader,
      position: entry.position,
      formationSlot: entry.formationSlot ?? null,
      playerName: player?.name ?? entry.membershipId,
      playerPosition: null,
      playerOvr: player?.ovr ?? 0,
      playerPhotoUrl: player?.photo ?? null,
      playerMatchPoints: player?.matchPoints ?? 0,
    };
  });
}

function getInitialFormationSlot(entry: MatchLineupEntry, fallbackIndex: number) {
  if (typeof entry.formationSlot === 'number') return entry.formationSlot;
  const slots = entry.teamNumber === 1
    ? [6, 0, 12, 7, 13, 1, 8, 14, 2, 9, 15, 3, 10, 16, 4, 11, 17, 5]
    : [11, 5, 17, 10, 16, 4, 9, 15, 3, 8, 14, 2, 7, 13, 1, 6, 12, 0];
  return slots[fallbackIndex] ?? fallbackIndex;
}

function getPlayerInSlot(players: Player[], slotIndex: number) {
  return players.find((player, index) => getPlayerSlot(player, index) === slotIndex);
}

function getPlayerSlot(player: Player, fallbackIndex: number) {
  return typeof player.slotIndex === 'number' ? player.slotIndex : fallbackIndex;
}

function comparePlayersBySlot(left: Player, right: Player) {
  return getPlayerSlot(left, 0) - getPlayerSlot(right, 0);
}

function movePlayerToSlot(players: Player[], playerId: string, targetIndex: number) {
  const moving = players.find((player) => player.id === playerId);
  if (!moving) return players;

  const currentSlot = getPlayerSlot(moving, players.indexOf(moving));
  return players.map((player, index) => {
    if (player.id === playerId) return { ...player, slotIndex: targetIndex };
    if (getPlayerSlot(player, index) === targetIndex) return { ...player, slotIndex: currentSlot };
    return player;
  });
}

function addPlayerToSlot(players: Player[], player: Player, requestedIndex?: number | null) {
  const usedSlots = new Set(players.map((item, index) => getPlayerSlot(item, index)));
  const fallbackIndex = findFirstOpenSlot(usedSlots);
  const slotIndex = typeof requestedIndex === 'number' && requestedIndex >= 0 && requestedIndex < TACTICS_SLOT_COUNT && !usedSlots.has(requestedIndex)
    ? requestedIndex
    : fallbackIndex;

  return [...players, { ...player, slotIndex }];
}

function findFirstOpenSlot(usedSlots: Set<number>) {
  for (let index = 0; index < TACTICS_SLOT_COUNT; index += 1) {
    if (!usedSlots.has(index)) return index;
  }
  return TACTICS_SLOT_COUNT - 1;
}

function getDropSlotIndex(eventTarget: DragEndEvent['over']) {
  const value = (eventTarget?.data?.current as { slotIndex?: unknown } | undefined)?.slotIndex;
  return typeof value === 'number' ? value : null;
}

function hasBothTeams(entries: Array<{ teamNumber: 1 | 2 }>) {
  return entries.some((entry) => entry.teamNumber === 1) && entries.some((entry) => entry.teamNumber === 2);
}

function isPreMatchTacticsWindow(match: UpcomingMatch | undefined) {
  if (!match) return true;
  if (match.status === 'finished' || match.status === 'cancelled') return false;
  return new Date(match.date).getTime() >= Date.now();
}

function canManageZone(
  zone: string | null,
  input: { isOperator: boolean; isRedLeader: boolean; isBlueLeader: boolean },
) {
  if (input.isOperator) return true;
  if (zone === 'red') return input.isRedLeader;
  if (zone === 'blue') return input.isBlueLeader;
  return false;
}

function getMatchAfterLineupTeamChanges(
  match: UpcomingMatch,
  changedTeams: Array<string | null | undefined>,
): UpcomingMatch {
  const changedTeamSet = new Set(changedTeams.filter((team) => team === 'red' || team === 'blue'));
  const redLeaderConfirmed = changedTeamSet.has('red') ? false : Boolean(match.redLeaderConfirmed);
  const blueLeaderConfirmed = changedTeamSet.has('blue') ? false : Boolean(match.blueLeaderConfirmed);

  return {
    ...match,
    redLeaderConfirmed,
    blueLeaderConfirmed,
    tacticsCompleted: redLeaderConfirmed && blueLeaderConfirmed,
  };
}

export function buildMatchAnticipationState(input: {
  match?: Pick<UpcomingMatch, 'redLeaderConfirmed' | 'blueLeaderConfirmed' | 'tacticsCompleted'>;
  players: Array<Pick<Player, 'id'>>;
  lineup: Array<Pick<MatchLineupEntry, 'membershipId' | 'teamNumber'>>;
  currentMembershipId: string | null;
}): MatchAnticipationState {
  const redReady = Boolean(input.match?.redLeaderConfirmed);
  const blueReady = Boolean(input.match?.blueLeaderConfirmed);
  const redCount = input.lineup.filter((entry) => entry.teamNumber === 1).length;
  const blueCount = input.lineup.filter((entry) => entry.teamNumber === 2).length;
  const assignedIds = new Set(input.lineup.map((entry) => entry.membershipId));
  const benchCount = input.players.filter((player) => !assignedIds.has(player.id)).length;
  const currentLineup = input.currentMembershipId
    ? input.lineup.find((entry) => entry.membershipId === input.currentMembershipId)
    : null;
  const memberState: MatchAnticipationMemberState = currentLineup
    ? currentLineup.teamNumber === 1 ? 'red' : 'blue'
    : input.currentMembershipId && input.players.some((player) => player.id === input.currentMembershipId)
      ? 'bench'
      : 'notAttending';

  let stage: MatchAnticipationStage = 'drafting';
  if (input.players.length === 0 && input.lineup.length === 0) {
    stage = 'waitingRoster';
  } else if (input.lineup.length === 0) {
    stage = 'drafting';
  } else if (redReady && blueReady && !input.match?.tacticsCompleted) {
    stage = 'finalizing';
  } else if (redReady && !blueReady) {
    stage = 'redReady';
  } else if (blueReady && !redReady) {
    stage = 'blueReady';
  }

  return {
    stage,
    memberState,
    redCount,
    blueCount,
    benchCount,
    redReady,
    blueReady,
  };
}

function getMemberAnticipationCopy(memberState: MatchAnticipationMemberState) {
  switch (memberState) {
    case 'red':
      return { label: '내 팀 Red' };
    case 'blue':
      return { label: '내 팀 Blue' };
    case 'bench':
      return { label: '대기명단' };
    case 'notAttending':
    default:
      return { label: '프리뷰' };
  }
}

function getMemberBadgeClass(memberState: MatchAnticipationMemberState) {
  switch (memberState) {
    case 'red':
      return 'border-red-team-border bg-red-team-bg text-red-team';
    case 'blue':
      return 'border-blue-team-border bg-blue-team-bg text-blue-team';
    case 'bench':
      return 'border-feedback-warning-border bg-feedback-warning-bg text-feedback-warning';
    case 'notAttending':
    default:
      return 'border-border bg-surface-card text-secondary';
  }
}

function mapLineupEntryToPlayer(entry: MatchLineupEntry): Player {
  return {
    id: entry.membershipId,
    name: entry.playerName,
    ovr: entry.playerOvr,
    matchPoints: entry.playerMatchPoints,
    photo: entry.playerPhotoUrl || entry.playerName,
    isLeader: entry.isLeader,
  };
}

function mapAttendeeToPlayer(entry: MatchAttendee): Player {
  return {
    id: entry.membershipId,
    name: entry.playerName,
    ovr: entry.playerOvr,
    matchPoints: entry.matchPoints,
    photo: entry.playerPhotoUrl || entry.playerName,
  };
}

function mapPlayerToLineupStub(player: Player): MatchLineupEntry {
  return {
    id: player.id,
    matchId: '',
    membershipId: player.id,
    teamNumber: 1,
    isLeader: Boolean(player.isLeader),
    position: 'MF',
    formationSlot: player.slotIndex ?? null,
    playerName: player.name,
    playerPosition: null,
    playerOvr: player.ovr,
    playerPhotoUrl: player.photo,
    playerMatchPoints: player.matchPoints,
  };
}

function getPlayerPhotoSrc(player: Pick<Player, 'photo'>) {
  return player.photo.startsWith('/') || player.photo.startsWith('http')
    ? player.photo
    : getFallbackAvatar(player.photo);
}
