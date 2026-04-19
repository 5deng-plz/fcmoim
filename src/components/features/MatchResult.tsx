import { CreditCard, Send, Shirt } from 'lucide-react';
import Image from 'next/image';
import { getDemoFace } from '@/mocks/demoMedia';

export default function MatchResult() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Red Team Area */}
        <div className="bg-red-50 rounded-xl p-3 border border-red-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-end mb-2 border-b border-red-200 pb-2">
            <h4 className="text-sm font-black text-red-600 flex flex-col gap-0.5">
              <span className="flex items-center gap-1 text-[11px]"><Shirt size={14} className="fill-red-500/20 text-red-500" /> Red 팀</span>
              <span className="text-xl tracking-tighter">WIN</span>
            </h4>
            <span className="text-3xl font-black text-red-500 leading-none">2</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            <div className="relative">
              <Image src={getDemoFace('Felix')} alt="손흥민" width={32} height={32} className="rounded-full bg-white border border-red-200 ring-2 ring-red-400 object-cover" unoptimized />
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full">🧑‍✈️</span>
            </div>
            {['Kim', 'Hwang', 'Cho', 'LeeJ', 'Baek'].map(seed => (
              <div key={seed} className="relative w-8 h-8">
                <Image src={getDemoFace(seed)} alt={seed} fill className="rounded-full bg-white border border-red-200 object-cover" unoptimized />
              </div>
            ))}
          </div>
        </div>
        
        {/* Blue Team Area (패배하여 딤 처리) */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex flex-col opacity-60 grayscale-[50%]">
          <div className="flex justify-between items-end mb-2 border-b border-gray-200 pb-2">
            <h4 className="text-sm font-black text-gray-500 flex flex-col gap-0.5">
              <span className="flex items-center gap-1 text-[11px]"><Shirt size={14} className="fill-gray-400/20 text-gray-400" /> Blue 팀</span>
              <span className="text-xl tracking-tighter">LOSE</span>
            </h4>
            <span className="text-3xl font-black text-gray-400 leading-none">1</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            <div className="relative">
              <Image src={getDemoFace('Lee')} alt="이강인" width={32} height={32} className="rounded-full bg-white border border-blue-200 ring-2 ring-blue-400 object-cover" unoptimized />
              <span className="absolute -bottom-1 -right-1 text-[10px] bg-white rounded-full">🧑‍✈️</span>
            </div>
            {['Park', 'Choi', 'Jung', 'Kang', 'Jo'].map(seed => (
              <div key={seed} className="relative w-8 h-8">
                <Image src={getDemoFace(seed)} alt={seed} fill className="rounded-full bg-white border border-blue-200 object-cover" unoptimized />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-full shadow-sm text-yellow-500">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-yellow-900 leading-snug">
              아쉽게도 패배하였습니다😭<br/>
              구장비 정산이 필요합니다
            </p>
            <p className="text-[11px] font-medium text-yellow-700 mt-0.5">
              인당 15,000원
            </p>
          </div>
        </div>
        <button className="bg-[#FEE500] text-black text-xs font-bold px-4 py-2 flex-shrink-0 rounded-xl shadow-sm hover:bg-[#e6cf00] active:scale-95 transition-all flex items-center gap-1">
          <Send size={14} /> 송금
        </button>
      </div>
    </div>
  );
}
