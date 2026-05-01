'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

interface MatchCommentsProps {
  matchDate: Date;
}

export default function MatchComments({ matchDate }: MatchCommentsProps) {
  const [newComment, setNewComment] = useState('');
  void matchDate;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h4 className="text-sm font-bold text-gray-900 mb-3">💬 코멘트</h4>

      <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-center">
        <p className="text-xs font-bold text-gray-400">
          아직 등록된 코멘트가 없어요
        </p>
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
