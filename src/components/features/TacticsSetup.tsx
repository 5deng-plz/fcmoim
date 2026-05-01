'use client';

import Image from 'next/image';
import { Shirt } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useToastStore';
import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { getDemoFace } from '@/mocks/demoMedia';

const selectablePlayers = [
  { id: 1, name: '김민재', ovr: 70, photo: 'Kim', selected: false },
  { id: 2, name: '황희찬', ovr: 65, photo: 'Hwang', selected: false },
  { id: 3, name: '조규성', ovr: 63, photo: 'Cho', selected: false },
  { id: 4, name: '이재성', ovr: 66, photo: 'LeeJ', selected: false },
  { id: 5, name: '백승호', ovr: 61, photo: 'Baek', selected: true },
];

export default function TacticsSetup() {
  const { userRole } = useAppStore();
  const { showToast } = useToastStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [tacticsCompleted, setTacticsCompleted] = useState(false);
  const [currentTurn] = useState<'red' | 'blue'>('red'); // 시연용 턴 상태

  const isLeader = userRole === 'admin';

  if (!isLeader) return null;

  return (
    <section className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 shadow-sm border border-orange-100 animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
          🏟 전술 설정
        </h3>
        <div className="flex items-center gap-1.5 bg-gray-100 pl-2 pr-1 py-1 rounded-full">
          <span className="text-[10px] font-bold text-gray-600">현재 턴:</span>
          <Image
            src={getDemoFace('Felix')}
            alt="턴"
            width={16}
            height={16}
            className="rounded-full bg-white"
            unoptimized
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Red Team Area */}
        <div className={`bg-red-50 rounded-xl p-3 border border-red-200 shadow-sm flex flex-col ${currentTurn === 'red' ? 'ring-2 ring-green-500 shadow-md transform scale-[1.02] transition-all relative z-10' : ''}`}>
          {currentTurn === 'red' && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75"></div>
          )}
          <h4 className="text-[11px] font-black text-red-600 mb-2 border-b border-red-200 pb-1 flex items-center justify-between">
            <span className="flex items-center gap-1"><Shirt size={14} className="fill-red-500/20 text-red-500" /> Red (나)</span>
            <span className="text-gray-500 font-medium">2명</span>
          </h4>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            <div className="relative">
              <Image src={getDemoFace('Felix')} alt="손흥민" width={32} height={32} className="rounded-full bg-white border border-red-200 ring-2 ring-red-400 object-cover" unoptimized />
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full">🧑‍✈️</span>
            </div>
            {selectablePlayers.filter((p) => p.selected).map((p) => (
              <div key={p.id} className="relative">
                <Image src={getDemoFace(p.photo)} alt={p.name} width={32} height={32} className="rounded-full bg-white border border-red-200 object-cover" unoptimized />
              </div>
            ))}
          </div>
        </div>
        
        {/* Blue Team Area */}
        <div className={`bg-blue-50 rounded-xl p-3 border border-blue-200 shadow-sm flex flex-col ${currentTurn === 'blue' ? 'ring-2 ring-green-500 shadow-md transform scale-[1.02] transition-all relative z-10' : ''}`}>
          {currentTurn === 'blue' && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75"></div>
          )}
          <h4 className="text-[11px] font-black text-blue-600 mb-2 border-b border-blue-200 pb-1 flex items-center justify-between">
            <span className="flex items-center gap-1"><Shirt size={14} className="fill-blue-500/20 text-blue-500" /> Blue</span>
            <span className="text-gray-500 font-medium">1명</span>
          </h4>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            <div className="relative">
              <Image src={getDemoFace('Lee')} alt="이강인" width={32} height={32} className="rounded-full bg-white border border-blue-200 ring-2 ring-blue-400 object-cover" unoptimized />
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full">🧑‍✈️</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs font-bold text-gray-600 mb-2">
        드래프트 가능한 선수
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {selectablePlayers.filter((p) => !p.selected).map((p) => (
          <button
            key={p.id}
            className="flex-shrink-0 w-16 flex flex-col items-center bg-white p-2 rounded-lg border border-gray-100 hover:border-orange-300 active:scale-95 transition-all cursor-pointer"
          >
            <div className="relative">
              <Image
                src={getDemoFace(p.photo)}
                alt={p.name}
                width={32}
                height={32}
                className="rounded-full mb-1"
                unoptimized
              />
            </div>
            <span className="text-[10px] font-bold text-gray-700 truncate w-full text-center leading-none mt-1">
              {p.name}
            </span>
            <span className="text-[9px] text-gray-500 font-medium mt-0.5">
              OVR {p.ovr}
            </span>
          </button>
        ))}
      </div>

      {tacticsCompleted ? (
        <button disabled className="w-full mt-3 bg-gray-200 text-gray-500 font-bold py-3 rounded-xl cursor-not-allowed">
          전술 설정이 모두에게 공개되었습니다 ✅
        </button>
      ) : (
        <button 
          onClick={() => setShowConfirm(true)}
          className="w-full mt-3 bg-orange-500 text-white font-bold py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all"
        >
          전술설정 완료
        </button>
      )}

      <Modal title="최종 컨펌" isOpen={showConfirm} onClose={() => setShowConfirm(false)}>
        <p className="text-[13px] font-bold text-gray-800 mb-4 whitespace-pre-wrap leading-relaxed text-center">
          양 팀 리더가 모두 완료 버튼을 누르면{'\n'}
          전체 회원에게 팀 편성 결과가 공개됩니다.{'\n'}
          이대로 완료하시겠어요?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTacticsCompleted(true);
              setShowConfirm(false);
              showToast('팀 편성을 임시 완료했습니다! 상대방 대기 중...');
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
