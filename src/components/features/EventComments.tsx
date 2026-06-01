'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Bird, MessageSquareText, Send } from 'lucide-react';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import { createEventComment, fetchEventComments, type EventComment, type EventCommentTargetType } from '@/stores/commentsClient';
import { fetchMatchLineup, type MatchLineupEntry } from '@/stores/matchClient';
import { getScheduleEventTheme } from './scheduleEventTheme';

interface EventCommentsProps {
  clubId: string;
  targetType: EventCommentTargetType;
  targetId: string;
  phaseAnchorAt?: string | null;
  showPhase?: boolean;
  embedded?: boolean;
  themeType?: 'match' | 'vote_match' | 'training' | 'seminar' | 'etc' | 'poll';
}

export default function EventComments({
  clubId,
  targetType,
  targetId,
  phaseAnchorAt = null,
  showPhase = targetType === 'match',
  embedded = false,
  themeType = targetType === 'match' ? 'match' : 'poll',
}: EventCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<EventComment[]>([]);
  const [lineup, setLineup] = useState<MatchLineupEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const themeClasses = getScheduleEventTheme(themeType).comment;

  useEffect(() => {
    let ignore = false;

    setStatus('loading');
    
    const commentsPromise = fetchEventComments({ clubId, targetType, targetId });
    const lineupPromise = targetType === 'match' && showPhase
      ? fetchMatchLineup({ clubId, matchId: targetId }).catch(() => [] as MatchLineupEntry[])
      : Promise.resolve([] as MatchLineupEntry[]);

    Promise.all([commentsPromise, lineupPromise])
      .then(([items, lineupEntries]) => {
        if (ignore) return;
        setComments(items);
        setLineup(lineupEntries);
        setStatus('ready');
      })
      .catch(() => {
        if (ignore) return;
        setComments([]);
        setLineup([]);
        setStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [clubId, targetId, targetType, showPhase]);

  const submitComment = async () => {
    const content = newComment.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await createEventComment({ clubId, targetType, targetId, content });
      setComments((items) => [...items, comment]);
      setNewComment('');
      setStatus('ready');
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={embedded ? 'border-t border-border/40 pt-4 mt-4' : `rounded-3xl border ${themeClasses.border} ${themeClasses.bg} p-4 shadow-sm`}>
      <div className="mb-3 flex items-center justify-between gap-3" aria-label="덕담">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-bg ${themeClasses.iconText}`}>
            <MessageSquareText size={14} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <h4 className="text-[11px] font-black text-secondary">덕담</h4>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full bg-surface-bg px-2 py-0.5 text-[10px] font-black text-secondary"
          aria-label={`덕담 ${comments.length}개`}
        >
          <Bird size={12} className={`shrink-0 ${themeClasses.iconText}`} fill="currentColor" aria-hidden="true" />
          {comments.length}
        </span>
      </div>

      {status === 'loading' ? (
        <div className="mb-4 rounded-2xl border border-border/40 bg-surface-bg/40 px-4 py-4 text-center">
          <p className="text-xs font-bold text-secondary">코멘트를 불러오는 중입니다</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div role="alert" className="mb-4 rounded-2xl border border-feedback-error-border bg-feedback-error-bg px-4 py-3 text-xs font-bold text-feedback-error">
          코멘트를 불러오거나 등록하지 못했어요.
        </div>
      ) : null}

      {comments.length > 0 ? (
        <div className="mb-4 space-y-3 max-h-[260px] overflow-y-auto no-scrollbar pr-1">
          {comments.map((comment) => {
            const memberEntry = lineup.find((e) => e.membershipId === comment.membershipId);
            const teamRing = memberEntry
              ? memberEntry.teamNumber === 1
                ? 'border-2 border-red-team'
                : memberEntry.teamNumber === 2
                ? 'border-2 border-blue-team'
                : ''
              : '';
            return (
              <div key={comment.id} className="flex justify-start items-start gap-2.5 w-full">
                <Image
                  src={getFallbackAvatar(comment.authorName)}
                  alt=""
                  width={32}
                  height={32}
                  sizes="32px"
                  className={`h-[32px] w-[32px] shrink-0 rounded-full bg-surface-bg ${teamRing}`}
                  unoptimized
                />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-primary">{comment.authorName}</span>
                    {showPhase ? (
                      <span className={`rounded-full px-1.5 py-0.2 text-[8px] font-black ${getCommentPhase(comment.createdAt, phaseAnchorAt) === '경기후' ? 'bg-blue-team-bg text-blue-team' : 'bg-feedback-warning-bg text-feedback-warning'}`}>
                        {getCommentPhase(comment.createdAt, phaseAnchorAt)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-end gap-1.5">
                    <div className="rounded-2xl rounded-tl-none px-3.5 py-2 text-xs font-semibold shadow-xs bg-surface-bg border border-border/20 max-w-[85%] break-words text-primary leading-normal">
                      {comment.content}
                    </div>
                    <time dateTime={comment.createdAt} className="text-[9px] font-medium text-tertiary shrink-0 self-end mb-0.5">
                      {formatCommentTime(comment.createdAt)}
                    </time>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className={`relative flex items-center gap-2 rounded-full border border-border/80 bg-surface-bg px-2 py-1.5 focus-within:ring-1 focus-within:border-transparent ${themeClasses.inputFocus} transition-all`}>
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="할 말 있나?"
          className="flex-1 bg-transparent px-3 py-1 text-xs font-bold text-primary placeholder:text-tertiary focus:outline-none"
        />
        <button
          type="button"
          onClick={submitComment}
          disabled={!newComment.trim() || isSubmitting}
          aria-label="코멘트 등록"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white transition-all duration-150 ${
            newComment.trim() && !isSubmitting
              ? `${themeClasses.sendButtonBg} ${themeClasses.sendButtonHover} active:scale-90 cursor-pointer`
              : 'bg-action-disabled/30 text-action-disabled cursor-not-allowed'
          }`}
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}

function getCommentPhase(createdAt: string, matchFinishedAt: string | null) {
  if (!matchFinishedAt) return '경기전';
  return new Date(createdAt).getTime() > new Date(matchFinishedAt).getTime() ? '경기후' : '경기전';
}

function formatCommentTime(value: string) {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
