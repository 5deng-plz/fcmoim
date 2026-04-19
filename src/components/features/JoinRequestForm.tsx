'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useToastStore';
import type { Position } from '@/types';

export default function JoinRequestForm() {
  const { setUserStatus, setShowJoinForm } = useAppStore();
  const { showToast } = useToastStore();

  const [formData, setFormData] = useState({
    name: '',
    mainPosition: 'MF' as Position,
    subPosition: '' as Position | '',
    height: '',
    weight: '',
    preferredFoot: '오른발' as '왼발' | '오른발' | '양발',
    birthYear: '',
    birthMonth: '',
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      showToast('이름을 입력해주세요!');
      return;
    }

    // updateProfile이 appConfig.useMockData에 따라 자동 분기합니다
    // await createUserMutation({ ...formData, status: 'pending' });

    setShowJoinForm(false);
    setUserStatus('pending');
    showToast('가입 신청이 완료되었어요! 관리자 승인을 기다려주세요 🙏');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="text-center py-2">
        <p className="text-sm text-gray-500">FC Moim에 합류하기 위한 정보를 입력해주세요</p>
      </div>

      {/* 이름 */}
      <div>
        <label className="text-xs font-bold text-gray-700 mb-1.5 block">이름 *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="실명을 입력해주세요"
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
        />
      </div>

      {/* 포지션 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">주 포지션 *</label>
          <select
            value={formData.mainPosition}
            onChange={(e) => setFormData({ ...formData, mainPosition: e.target.value as Position })}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all appearance-none"
          >
            <option value="FW">공격 (FW)</option>
            <option value="MF">미드필더 (MF)</option>
            <option value="DF">수비 (DF)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">부 포지션</label>
          <select
            value={formData.subPosition}
            onChange={(e) => setFormData({ ...formData, subPosition: e.target.value as Position | '' })}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all appearance-none"
          >
            <option value="">선택 안함</option>
            <option value="FW">공격 (FW)</option>
            <option value="MF">미드필더 (MF)</option>
            <option value="DF">수비 (DF)</option>
          </select>
        </div>
      </div>

      {/* 신체 정보 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">신장 (cm)</label>
          <input
            type="number"
            value={formData.height}
            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
            placeholder="175"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">체중 (kg)</label>
          <input
            type="number"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            placeholder="70"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* 주발 */}
      <div>
        <label className="text-xs font-bold text-gray-700 mb-1.5 block">주발</label>
        <div className="flex gap-2">
          {(['오른발', '왼발', '양발'] as const).map((foot) => (
            <button
              key={foot}
              onClick={() => setFormData({ ...formData, preferredFoot: foot })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                formData.preferredFoot === foot
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {foot}
            </button>
          ))}
        </div>
      </div>

      {/* 생년 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">출생연도</label>
          <input
            type="number"
            value={formData.birthYear}
            onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
            placeholder="1990"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1.5 block">출생월</label>
          <input
            type="number"
            value={formData.birthMonth}
            onChange={(e) => setFormData({ ...formData, birthMonth: e.target.value })}
            placeholder="3"
            min="1"
            max="12"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* 제출 */}
      <button
        onClick={handleSubmit}
        className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-green-700 active:scale-[0.98] transition-all shadow-sm"
      >
        가입 신청하기 ⚽
      </button>

      <p className="text-center text-[11px] text-gray-400">
        제출 후 관리자의 승인을 기다려주세요
      </p>
    </div>
  );
}
