'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Calendar, Footprints, Ruler, Scale, Shield, User } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { buildJoinProfileRequest, submitJoinRequest } from '@/stores/membershipClient';
import type { Position } from '@/types';

export default function JoinRequestForm() {
  const {
    isAuthenticated,
    selectedJoinClubId,
    setUserStatus,
    setShowJoinForm,
  } = useAppStore();
  const { signInKakao } = useAuthStore();
  const { showToast } = useToastStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mainPosition: 'MF' as Position,
    height: '',
    weight: '',
    preferredFoot: '오른발' as '왼발' | '오른발' | '양발',
    birthYear: '',
    birthMonth: '',
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showToast('이름을 입력해주세요.');
      return;
    }

    if (!formData.mainPosition) {
      showToast('주 포지션을 선택해주세요.');
      return;
    }

    if (!isAuthenticated) {
      await signInKakao();
      return;
    }

    const profile = buildJoinProfileRequest(formData);

    try {
      setIsSubmitting(true);
      await submitJoinRequest(profile, selectedJoinClubId);
      setShowJoinForm(false);
      setUserStatus('pending');
      showToast('입단신청이 접수되었어요. 운영진 승인을 기다려주세요.');
    } catch (error) {
      console.error('[FC Moim] Join request failed:', error);
      showToast(error instanceof Error ? error.message : '입단신청을 제출하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-20">
      <div className="text-center py-2">
        <h2 className="text-xl font-black text-gray-900">입단신청</h2>
        <p className="mt-1 text-xs font-medium text-gray-400">선택한 팀에 제출할 프로필을 입력해주세요</p>
      </div>

      <section className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-gray-900">
          <User size={16} className="text-green-600" />
          프로필
        </h3>

        <IconField icon={<User size={17} />} required>
          <input
            type="text"
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            placeholder="이름"
            className="w-full bg-transparent text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none"
          />
        </IconField>

        <IconField icon={<Shield size={17} />} required>
          <select
            value={formData.mainPosition}
            onChange={(event) => setFormData({ ...formData, mainPosition: event.target.value as Position })}
            className="w-full bg-transparent text-sm font-bold text-gray-900 focus:outline-none"
          >
            <option value="FW">공격 FW</option>
            <option value="MF">미드필더 MF</option>
            <option value="DF">수비 DF</option>
          </select>
        </IconField>

        <div className="grid grid-cols-2 gap-2">
          <IconField icon={<Ruler size={17} />}>
            <input
              type="number"
              value={formData.height}
              onChange={(event) => setFormData({ ...formData, height: event.target.value })}
              placeholder="키"
              className="w-full bg-transparent text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none"
            />
          </IconField>
          <IconField icon={<Scale size={17} />}>
            <input
              type="number"
              value={formData.weight}
              onChange={(event) => setFormData({ ...formData, weight: event.target.value })}
              placeholder="몸무게"
              className="w-full bg-transparent text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none"
            />
          </IconField>
        </div>

        <IconField icon={<Footprints size={17} />}>
          <div className="grid w-full grid-cols-3 gap-1">
            {(['오른발', '왼발', '양발'] as const).map((foot) => (
              <button
                type="button"
                key={foot}
                onClick={() => setFormData({ ...formData, preferredFoot: foot })}
                className={`rounded-lg py-2 text-xs font-black transition-all active:scale-95 ${
                  formData.preferredFoot === foot
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {foot}
              </button>
            ))}
          </div>
        </IconField>

        <IconField icon={<Calendar size={17} />}>
          <div className="grid w-full grid-cols-2 gap-2">
            <input
              type="number"
              value={formData.birthYear}
              onChange={(event) => setFormData({ ...formData, birthYear: event.target.value })}
              placeholder="출생연도"
              className="w-full bg-transparent text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none"
            />
            <input
              type="number"
              value={formData.birthMonth}
              onChange={(event) => setFormData({ ...formData, birthMonth: event.target.value })}
              placeholder="월"
              min="1"
              max="12"
              className="w-full bg-transparent text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none"
            />
          </div>
        </IconField>
      </section>

      <button
        onClick={() => void handleSubmit()}
        disabled={isSubmitting}
        className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-green-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isAuthenticated
          ? isSubmitting ? '제출 중...' : '입단신청 보내기'
          : '카카오로 입단신청 계속하기'}
      </button>

      <p className="text-center text-[11px] font-medium text-gray-400">
        입단신청 후 운영진 승인을 기다려주세요.
      </p>
    </div>
  );
}

function IconField({
  icon,
  required = false,
  children,
}: {
  icon: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      {required ? <span className="text-sm font-black text-green-600">*</span> : null}
    </div>
  );
}
