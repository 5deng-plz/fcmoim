'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Shirt, GripVertical } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { saveMatchLineup, type MatchLineupEntry } from '@/stores/matchClient';
import { useToastStore } from '@/stores/useToastStore';
import Modal from '@/components/ui/Modal';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Player {
  id: string;
  name: string;
  ovr: number;
  position: string;
  photo: string;
}

const initialPlayers: Player[] = [];
type TeamState = { id: 'red' | 'blue'; name: string; color: 'red' | 'blue'; players: Player[] };
type TeamClasses = {
  bg: string;
  border: string;
  text: string;
  fill: string;
  emptyText: string;
};

interface TacticsDragBuilderProps {
  clubId?: string;
  matchId?: string;
  players?: Player[];
  lineup?: MatchLineupEntry[];
  readOnly?: boolean;
  onCompleted?: () => void;
}

// ─── 드래그 가능 선수 카드 ───
function DraggablePlayerCard({ player, zone }: { player: Player; zone: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id, data: { zone } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-100 cursor-grab active:cursor-grabbing active:shadow-md active:scale-[1.02] transition-[box-shadow,background-color,transform] ${
        isDragging ? 'shadow-xl ring-2 ring-green-300' : 'shadow-sm'
      }`}
    >
      <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
      <Image
        src={getFallbackAvatar(player.photo)}
        alt={player.name}
        width={28}
        height={28}
        sizes="28px"
        className="rounded-full bg-gray-100"
        style={{ width: 28, height: 28 }}
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-gray-900 truncate block">{player.name}</span>
          <span className="text-[9px] text-gray-400">{player.position}</span>
        </div>
        <span className="block text-[10px] font-bold text-fcgreen-600">OVR {player.ovr}</span>
      </div>
    </div>
  );
}

// ─── 오버레이 카드 (드래그 중 표시) ───
function PlayerOverlay({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg p-2 border-2 border-green-400 shadow-xl cursor-grabbing scale-105">
      <GripVertical size={14} className="text-green-400 flex-shrink-0" />
      <Image
        src={getFallbackAvatar(player.photo)}
        alt={player.name}
        width={28}
        height={28}
        sizes="28px"
        className="rounded-full bg-gray-100"
        style={{ width: 28, height: 28 }}
        unoptimized
      />
      <span className="text-xs font-bold text-gray-900">{player.name}</span>
    </div>
  );
}

function TeamDropZone({
  team,
  cls,
  canEdit,
}: {
  team: TeamState;
  cls: TeamClasses;
  canEdit: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `team-${team.id}`,
    data: { zone: team.id },
    disabled: !canEdit,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${cls.bg} rounded-xl p-3 border ${cls.border} min-h-[120px] transition-[box-shadow,background-color,transform] ${
        isOver ? 'scale-[1.01] bg-white shadow-lg ring-2 ring-green-300' : ''
      }`}
    >
      <h4 className={`text-[11px] font-bold ${cls.text} mb-2 border-b ${cls.border} pb-1 flex items-center justify-between`}>
        <span className="flex items-center gap-1">
          <Shirt size={14} className={cls.fill} /> {team.name}
        </span>
        <span className="text-gray-500 font-medium">{team.players.length}명</span>
      </h4>
      <SortableContext items={team.players.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {team.players.length === 0 && (
            <div className={`rounded-lg border border-dashed ${cls.border} text-center py-4 text-[10px] ${cls.emptyText} font-medium transition-colors ${
              isOver ? 'bg-white/80' : ''
            }`}>
              선수를 드래그해서 배치
            </div>
          )}
          {team.players.map((player) => (
            <DraggablePlayerCard key={player.id} player={player} zone={team.id} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── 메인: 드래그 앤 드롭 전술 빌더 ───
export default function TacticsDragBuilder({
  clubId,
  matchId,
  players = initialPlayers,
  lineup = [],
  readOnly = false,
  onCompleted,
}: TacticsDragBuilderProps) {
  const { userRole } = useAppStore();
  const { showToast } = useToastStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [tacticsCompleted, setTacticsCompleted] = useState(lineup.length > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [bench, setBench] = useState<Player[]>(players);
  const [teams, setTeams] = useState<TeamState[]>(() => buildInitialTeams(lineup));

  const isLeader = userRole === 'admin' || userRole === 'operator';
  const canEdit = isLeader && !readOnly;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const activePlayer = [bench, ...teams.flatMap(t => t.players)].flat().find((p) => p.id === activeId);

  const findPlayerZone = (id: string): string | null => {
    if (bench.find((p) => p.id === id)) return 'bench';
    const team = teams.find(t => t.players.find(p => p.id === id));
    if (team) return team.id;
    return null;
  };

  const removeFromZone = (id: string) => {
    setBench((prev) => prev.filter((p) => p.id !== id));
    setTeams((prev) => prev.map(t => ({ ...t, players: t.players.filter(p => p.id !== id) })));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const playerId = active.id as string;
    const player = [bench, ...teams.flatMap(t => t.players)].flat().find((p) => p.id === playerId);
    if (!player) return;

    const targetZone = (over.data?.current as { zone?: string })?.zone;
    const sourceZone = findPlayerZone(playerId);
    if (sourceZone === targetZone) return;

    removeFromZone(playerId);

    if (targetZone === 'bench') {
      setBench((prev) => [...prev, player]);
    } else {
      setTeams((prev) => prev.map(t => t.id === targetZone ? { ...t, players: [...t.players, player] } : t));
    }
  };

  const getTeamClasses = (color: string) => {
    if (color === 'red') return { bg: 'bg-red-team-bg', border: 'border-red-team-border', text: 'text-red-team', fill: 'fill-red-team/20 text-red-team', emptyText: 'text-red-team' };
    if (color === 'blue') return { bg: 'bg-blue-team-bg', border: 'border-blue-team-border', text: 'text-blue-team', fill: 'fill-blue-team/20 text-blue-team', emptyText: 'text-blue-team' };
    return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', fill: 'fill-green-500/20 text-green-500', emptyText: 'text-green-400' };
  };

  if (!canEdit && teams.every((team) => team.players.length === 0)) return null;

  const handleConfirmLineup = async () => {
    setIsSaving(true);

    try {
      if (clubId && matchId) {
        await saveMatchLineup({
          clubId,
          matchId,
          entries: teams.flatMap((team) => team.players.map((player, index) => ({
            membershipId: player.id,
            teamNumber: team.id === 'red' ? 1 : 2,
            isLeader: index === 0,
            position: normalizePosition(player.position),
          }))),
        });
      }

      setTacticsCompleted(true);
      setShowConfirm(false);
      showToast('팀 편성이 확정되었습니다!');
      onCompleted?.();
    } catch (error) {
      console.error('[FC Moim] Lineup save failed:', error);
      showToast('팀 편성을 저장하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-feedback-warning-border bg-feedback-warning-bg p-4 shadow-sm animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
          🏟 전술 설정
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-1 rounded-md">
            참석 {bench.length + teams.reduce((acc, t) => acc + t.players.length, 0)}명
          </span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={canEdit ? handleDragStart : undefined}
        onDragEnd={canEdit ? handleDragEnd : undefined}
      >
        {/* 대기 명단 */}
        {bench.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-bold text-gray-500 mb-1.5">대기 명단</p>
            <SortableContext items={bench.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-2 gap-1.5">
                {bench.map((player) => (
                  <DraggablePlayerCard key={player.id} player={player} zone="bench" />
                ))}
              </div>
            </SortableContext>
          </div>
        )}

        {/* Teams 드롭존 */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {teams.map((team) => {
            const cls = getTeamClasses(team.color);
            return (
              <TeamDropZone key={team.id} team={team} cls={cls} canEdit={canEdit} />
            );
          })}
        </div>

        <DragOverlay>
          {activePlayer ? <PlayerOverlay player={activePlayer} /> : null}
        </DragOverlay>
      </DndContext>

      {/* 팁 인디케이터 */}
      <div className="bg-white px-4 py-2 text-center shadow-sm relative z-20 mb-3 rounded-lg">
        <div className="inline-flex items-center gap-4 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
          <span className="text-xs font-bold text-gray-500">배치된 인원: {teams.reduce((acc, t) => acc + t.players.length, 0)}명</span>
        </div>
      </div>

      {/* 팁 인디케이터 */}
      {!canEdit ? (
        <div className="w-full rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-gray-700">
          확정된 팀 편성입니다
        </div>
      ) : tacticsCompleted ? (
        <button disabled className="w-full bg-gray-200 text-gray-500 font-bold py-3 rounded-xl cursor-not-allowed">
          전술 설정이 모두에게 공개되었습니다
        </button>
      ) : (
        <button
          onClick={() => {
            if (teams.some(t => t.players.length === 0)) {
              showToast('모든 팀에 선수를 배치해주세요!');
              return;
            }
            setShowConfirm(true);
          }}
          className="w-full bg-feedback-warning text-white font-bold py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all"
        >
          전술설정 완료
        </button>
      )}

      <Modal title="최종 컨펌" isOpen={showConfirm} onClose={() => setShowConfirm(false)}>
        <p className="text-[13px] font-bold text-gray-800 mb-4 whitespace-pre-wrap leading-relaxed text-center">
          {teams.map(t => `${t.name} ${t.players.length}명`).join(' vs ')}{'\n'}
          전체 회원에게 팀 편성 결과가 공개됩니다.{'\n'}
          이대로 완료하시겠어요?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => void handleConfirmLineup()}
            disabled={isSaving}
            className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all text-[13px]"
          >
            {isSaving ? '저장 중...' : '네, 완료할게요'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 active:scale-95 transition-all text-[13px]"
          >
            조금 더 볼게요
          </button>
        </div>
      </Modal>
    </section>
  );
}

function buildInitialTeams(lineup: MatchLineupEntry[]): TeamState[] {
  const redPlayers = lineup.filter((entry) => entry.teamNumber === 1).map(mapLineupEntryToPlayer);
  const bluePlayers = lineup.filter((entry) => entry.teamNumber === 2).map(mapLineupEntryToPlayer);

  return [
    { id: 'red', name: 'Red', color: 'red', players: redPlayers },
    { id: 'blue', name: 'Blue', color: 'blue', players: bluePlayers },
  ];
}

function mapLineupEntryToPlayer(entry: MatchLineupEntry): Player {
  return {
    id: entry.membershipId,
    name: entry.playerName,
    ovr: entry.playerOvr,
    position: entry.position || entry.playerPosition || 'MF',
    photo: entry.playerPhotoUrl || entry.playerName,
  };
}

function normalizePosition(value: string): 'FW' | 'MF' | 'DF' {
  if (value === 'FW' || value === 'MF' || value === 'DF') return value;
  return 'MF';
}
