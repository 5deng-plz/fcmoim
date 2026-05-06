'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Shirt, GripVertical } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
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
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Player {
  id: string;
  name: string;
  ovr: number;
  position: string;
  photo: string;
}

const initialPlayers: Player[] = [];

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
      className={`flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-100 cursor-grab active:cursor-grabbing active:shadow-md active:scale-[1.02] transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-green-300' : ''
      }`}
    >
      <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
      <Image
        src={getFallbackAvatar(player.photo)}
        alt={player.name}
        width={28}
        height={28}
        className="rounded-full bg-gray-100"
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-gray-900 truncate block">{player.name}</span>
          <span className="text-[9px] text-gray-400">{player.position}</span>
        </div>
        <span className="block text-[10px] text-gray-500 font-medium">OVR {player.ovr}</span>
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
        className="rounded-full bg-gray-100"
        unoptimized
      />
      <span className="text-xs font-bold text-gray-900">{player.name}</span>
    </div>
  );
}

// ─── 메인: 드래그 앤 드롭 전술 빌더 ───
export default function TacticsDragBuilder() {
  const { userRole } = useAppStore();
  const { showToast } = useToastStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [tacticsCompleted, setTacticsCompleted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [bench, setBench] = useState<Player[]>(initialPlayers);
  const [teams, setTeams] = useState<{ id: string; name: string; color: 'red' | 'blue'; players: Player[] }[]>([
    { id: 'red', name: 'Red', color: 'red', players: [] },
    { id: 'blue', name: 'Blue', color: 'blue', players: [] },
  ]);

  const isLeader = userRole === 'admin' || userRole === 'operator';

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
    if (color === 'red') return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', fill: 'fill-red-500/20 text-red-500', emptyText: 'text-red-400' };
    if (color === 'blue') return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', fill: 'fill-blue-500/20 text-blue-500', emptyText: 'text-blue-400' };
    return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600', fill: 'fill-green-500/20 text-green-500', emptyText: 'text-green-400' };
  };

  if (!isLeader) return null;

  return (
    <section className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 shadow-sm border border-orange-100 animate-fadeIn">
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
              <div key={team.id} className={`${cls.bg} rounded-xl p-3 border ${cls.border} min-h-[120px]`}>
                <h4 className={`text-[11px] font-black ${cls.text} mb-2 border-b ${cls.border} pb-1 flex items-center justify-between`}>
                  <span className="flex items-center gap-1">
                    <Shirt size={14} className={cls.fill} /> {team.name}
                  </span>
                  <span className="text-gray-500 font-medium">{team.players.length}명</span>
                </h4>
                <SortableContext items={team.players.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {team.players.length === 0 && (
                      <div className={`dropzone-empty ${cls.border} text-center py-4 text-[10px] ${cls.emptyText} font-medium`}>
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
      {tacticsCompleted ? (
        <button disabled className="w-full bg-gray-200 text-gray-500 font-bold py-3 rounded-xl cursor-not-allowed">
          전술 설정이 모두에게 공개되었습니다 ✅
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
          className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all"
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
            onClick={() => {
              setTacticsCompleted(true);
              setShowConfirm(false);
              showToast('팀 편성이 확정되었습니다! 🎉');
            }}
            className="flex-1 bg-gray-900 text-white font-bold py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all text-[13px]"
          >
            네, 완료할게요
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
