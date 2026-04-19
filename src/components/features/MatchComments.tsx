'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import Image from 'next/image';
import { getDemoFace } from '@/mocks/demoMedia';

interface MatchCommentsProps {
  matchDate: Date;
}

const mockComments = [
  { id: 1, user: '손흥민', seed: 'Son', content: '오늘 가볍게 발라주자 ㅋㅋㅋ', time: new Date('2026-03-07T18:30:00') },
  { id: 2, user: '이강인', seed: 'Lee', content: '드리블 폼 미쳤다 얼른 감 ㅁㅌㅊ?', time: new Date('2026-03-07T19:15:00') },
  { id: 3, user: '김민재', seed: 'Kim', content: '다들 고생했음 ㅇㅇ', time: new Date('2026-03-07T21:30:00') },
];

function getTimeLabel(commentTime: Date, matchDate: Date): string {
  const matchEnd = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
  if (commentTime < matchDate) return '경기전';
  if (commentTime < matchEnd) return '경기중';
  return '경기후';
}

const labelColor: Record<string, string> = {
  '경기전': 'bg-blue-100 text-blue-600',
  '경기중': 'bg-orange-100 text-orange-600',
  '경기후': 'bg-gray-100 text-gray-500',
};

export default function MatchComments({ matchDate }: MatchCommentsProps) {
  const [newComment, setNewComment] = useState('');

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h4 className="text-sm font-bold text-gray-900 mb-3">💬 코멘트</h4>

      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto no-scrollbar">
        {mockComments.map((c) => {
          const label = getTimeLabel(c.time, matchDate);
          return (
            <div key={c.id} className="flex gap-2.5">
              <Image
                src={getDemoFace(c.seed)}
                alt={c.user}
                width={28}
                height={28}
                className="rounded-full bg-gray-200 shrink-0 mt-0.5"
                unoptimized
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold text-gray-800">
                    {c.user}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${labelColor[label]}`}
                    >
                      {label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {`${c.time.getMonth() + 1}/${c.time.getDate()} ${c.time.getHours()}:${c.time.getMinutes().toString().padStart(2, '0')}`}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-snug">
                  {c.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="할말 적으셈..."
          className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:border-green-500 focus:outline-none transition-colors"
        />
        <button
          disabled={!newComment.trim()}
          className={`p-2.5 rounded-xl transition-all duration-150 ${
            newComment.trim()
              ? 'bg-green-600 text-white hover:brightness-110 active:scale-95'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
