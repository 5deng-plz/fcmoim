'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Send, MessageSquareText, ShieldAlert, LoaderCircle } from 'lucide-react';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRecordsStore } from '@/stores/useRecordsStore';
import { createEventComment, fetchEventComments, type EventComment, type EventCommentTargetType } from '@/stores/commentsClient';
import { fetchFeedPosts, createFeedPost, type FeedPost } from '@/stores/feedClient';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SeasonChatRoomProps {
  clubId: string;
  hideHeader?: boolean;
  flatLayout?: boolean;
}

export default function SeasonChatRoom({
  clubId,
  hideHeader = false,
  flatLayout = false,
}: SeasonChatRoomProps) {
  const { records } = useRecordsStore();
  const { memberProfile } = useAuthStore();
  const [chatPost, setChatPost] = useState<FeedPost | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  
  const [comments, setComments] = useState<EventComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rows = useMemo(() => records?.rankingRows ?? [], [records?.rankingRows]);
  const myMembershipId = memberProfile?.id;

  // 1. Resolve authorName based on membershipId
  const getAuthorName = useCallback((membershipId: string, authorNameFromApi?: string) => {
    if (authorNameFromApi && authorNameFromApi !== '알 수 없는 멤버') {
      return authorNameFromApi;
    }
    if (membershipId === myMembershipId && memberProfile?.name) {
      return memberProfile.name;
    }
    const match = rows.find((r) => r.membershipId === membershipId);
    return match ? match.nickname : '알 수 없는 멤버';
  }, [myMembershipId, memberProfile?.name, rows]);

  // 2. Resolve authorPhoto based on membershipId
  const getAuthorPhoto = useCallback((membershipId: string) => {
    const match = rows.find((r) => r.membershipId === membershipId);
    return match?.photoUrl || getFallbackAvatar(getAuthorName(membershipId));
  }, [rows, getAuthorName]);

  // Helper to scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
      setHasNewMessage(false);
    }
  };

  // Scroll event handler to track if user has scrolled up
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // If user is within 60px of the bottom, we consider them at the bottom
    const nearBottom = scrollHeight - scrollTop - clientHeight < 60;
    setIsNearBottom(nearBottom);
    if (nearBottom) {
      setHasNewMessage(false);
    }
  };

  // 3. Initialize/find the system feed post representing the season chat
  useEffect(() => {
    let ignore = false;
    async function initChat() {
      try {
        setIsLoadingChat(true);
        const posts = await fetchFeedPosts({ clubId });
        const existing = posts.find((p) => p.textContent?.startsWith('[SYSTEM_SEASON_CHAT]'));
        
        if (existing) {
          if (!ignore) setChatPost(existing);
        } else {
          // If none exists, create the default season chat post
          const created = await createFeedPost({
            clubId,
            contentType: 'text',
            textContent: '[SYSTEM_SEASON_CHAT] 25/26 시즌 공식 소통방입니다. 서로 격려의 대화를 나눠주세요!',
          });
          if (!ignore) setChatPost(created);
        }
      } catch (err) {
        console.error('[FC Moim] SeasonChatRoom: Init failed:', err);
      } finally {
        if (!ignore) setIsLoadingChat(false);
      }
    }
    void initChat();
    return () => {
      ignore = true;
    };
  }, [clubId]);

  // 4. Fetch comments & Subscribe to Realtime Private Broadcast Channel
  useEffect(() => {
    if (!chatPost) return;

    const postId = chatPost.id;
    let ignore = false;
    let channel: RealtimeChannel;

    async function setupRealtime() {
      setIsLoadingComments(true);

      // setAuth before subscription
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        supabase.realtime.setAuth(token);
      }

      if (ignore) return;

      channel = supabase
        .channel(`comments:feed_post:${postId}`, {
          config: {
            private: true,
          },
        })
        .on(
          'broadcast',
          { event: 'comment.created.v1' },
          (payload) => {
            if (ignore) return;
            const broadcastComment = payload.payload as EventComment;
            if (!broadcastComment) return;

            const resolvedComment: EventComment = {
              ...broadcastComment,
              authorName: getAuthorName(broadcastComment.membershipId, broadcastComment.authorName),
            };

            setComments((prev) => {
              if (prev.some((c) => c.id === resolvedComment.id)) {
                return prev;
              }
              return [...prev, resolvedComment];
            });

            // Scroll manager
            if (isNearBottom || resolvedComment.membershipId === myMembershipId) {
              setTimeout(() => scrollToBottom('smooth'), 50);
            } else {
              setHasNewMessage(true);
            }
          }
        )
        .subscribe(async (status) => {
          if (ignore) return;

          // Fetch or sync comments on subscription (initial and reconnection)
          if (status === 'SUBSCRIBED') {
            try {
              const items = await fetchEventComments({
                clubId,
                targetType: 'feed_post',
                targetId: postId,
              });
              if (!ignore) {
                setComments(items);
                setTimeout(() => scrollToBottom('auto'), 100);
              }
            } catch (err) {
              console.error('[FC Moim] SeasonChatRoom: Fetch comments failed:', err);
            } finally {
              if (!ignore) setIsLoadingComments(false);
            }
          }
        });
    }

    void setupRealtime();

    return () => {
      ignore = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [chatPost, clubId, isNearBottom, myMembershipId, rows, getAuthorName]);

  // Submit comment handler
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = newComment.trim();
    if (!content || !chatPost || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await createEventComment({
        clubId,
        targetType: 'feed_post',
        targetId: chatPost.id,
        content,
      });
      setNewComment('');

      // Add to local state immediately
      setComments((prev) => {
        if (prev.some((c) => c.id === created.id)) {
          return prev;
        }
        const resolved = {
          ...created,
          authorName: getAuthorName(created.membershipId, created.authorName),
        };
        return [...prev, resolved];
      });

      // Scroll manager
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      console.error('[FC Moim] SeasonChatRoom: Submit comment failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate a distinct theme-color per user name for modern Chzzk styling
  const getNicknameColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    // High-vibrancy HSL matching dark mode theme
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 85%, 65%)`;
  };

  if (isLoadingChat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center space-y-3">
        <LoaderCircle className="w-8 h-8 text-brand-primary animate-spin" />
        <p className="text-xs font-bold text-tertiary">채팅방 접속을 요청하고 있습니다...</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-[#070914] border-[#25283e]/60 rounded-3xl overflow-hidden shadow-2xl relative ${
        flatLayout
          ? 'flex-1 h-full min-h-0 border-0 rounded-none shadow-none'
          : 'h-[calc(100vh-var(--header-height)-var(--bottom-nav-height)-5rem)] min-h-[350px] border'
      }`}
    >
      {/* Chat Room Header */}
      {!hideHeader && (
        <div className="bg-[#0b0c16]/95 border-b border-[#25283e]/55 px-4 py-3 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00ffa3] animate-pulse" />
            <h4 className="text-xs font-black text-white tracking-wide">🏟️ 시즌 공식 채팅방</h4>
          </div>
          <span className="text-[10px] font-mono font-black text-gray-500">LIVE CHAT</span>
        </div>
      )}

      {/* Chat messages list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5 bg-gradient-to-b from-[#070914] to-[#0a0b18]"
      >
        {isLoadingComments ? (
          <div className="text-center py-10 text-[11px] text-gray-500 font-bold">이전 대화 내역 로딩 중...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 text-[11px] text-gray-500 font-bold">
            첫 메시지를 입력하고 응원을 나눠보세요! 💬
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = comment.membershipId === myMembershipId;
            const authorName = getAuthorName(comment.membershipId, comment.authorName);
            const authorPhoto = getAuthorPhoto(comment.membershipId);
            const isRank1 = rows[0]?.membershipId === comment.membershipId;

            if (flatLayout) {
              return (
                <div
                  key={comment.id}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-start gap-2 leading-relaxed ${
                    isMe
                      ? 'bg-[#00ffa3]/8 border-l-2 border-[#00ffa3] text-white'
                      : 'hover:bg-white/5 text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 shrink-0 select-none">
                    {isRank1 && <span className="text-xs" title="시즌 1위">👑</span>}
                    <span
                      className="font-extrabold text-[11px] hover:underline cursor-pointer"
                      style={{ color: getNicknameColor(authorName) }}
                    >
                      {authorName}
                    </span>
                  </div>
                  <div className="flex-1 break-all min-w-0 font-medium">
                    <span className="text-white whitespace-pre-wrap">{comment.content}</span>
                  </div>
                  <span className="text-[9px] font-mono text-gray-600 shrink-0 self-center select-none">
                    {new Date(comment.createdAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={comment.id}
                className={`flex gap-2.5 items-start text-xs ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <Image
                    src={authorPhoto}
                    alt=""
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full object-cover shrink-0 bg-gray-800 ring-1 ring-white/10"
                    unoptimized
                  />
                )}

                <div className={`flex flex-col max-w-[75%] gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span
                      className="font-extrabold text-[11px] select-none"
                      style={{ color: getNicknameColor(authorName) }}
                    >
                      {authorName}
                    </span>
                  )}
                  <div className="flex gap-1.5 items-end">
                    {isMe && (
                      <span className="text-[9px] font-mono text-gray-600 mb-0.5 select-none">
                        {new Date(comment.createdAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </span>
                    )}

                    <div
                      className={`px-3 py-2 rounded-2xl break-words text-white font-medium shadow-md leading-relaxed ${
                        isMe
                          ? 'bg-[#00ffa3] text-black font-bold rounded-tr-none shadow-[0_0_8px_rgba(0,255,163,0.15)]'
                          : 'bg-[#181a2e]/85 border border-[#25283e]/40 rounded-tl-none'
                      }`}
                    >
                      {comment.content}
                    </div>

                    {!isMe && (
                      <span className="text-[9px] font-mono text-gray-600 mb-0.5 select-none">
                        {new Date(comment.createdAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Message Floating Indicator */}
      {hasNewMessage && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#00ffa3] text-black font-extrabold text-[11px] px-3.5 py-1.5 rounded-full shadow-lg hover:bg-emerald-400 active:scale-95 transition-all select-none z-10 flex items-center gap-1 border border-black/10"
        >
          <span>⬇️</span> 새로운 메시지 보기
        </button>
      )}

      {/* Input composition area */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-[#0b0c16]/95 border-t border-[#25283e]/55 shrink-0 flex items-center gap-2"
      >
        <div className="flex-1 bg-white/5 border border-white/10 focus-within:border-[#00ffa3]/60 focus-within:ring-1 focus-within:ring-[#00ffa3]/30 rounded-full px-3.5 py-2 flex items-center transition-all">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="채팅에 참여해보세요... (덕담 한 잔)"
            className="flex-1 bg-transparent border-none text-xs font-semibold text-white placeholder:text-gray-500 focus:outline-none"
            maxLength={100}
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all select-none ${
            newComment.trim() && !isSubmitting
              ? 'bg-[#00ffa3] hover:bg-emerald-400 active:scale-90 text-black cursor-pointer shadow-[0_0_10px_rgba(0,255,163,0.3)]'
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Send size={14} className={newComment.trim() && !isSubmitting ? 'text-black' : 'text-gray-500'} />
        </button>
      </form>
    </div>
  );
}
