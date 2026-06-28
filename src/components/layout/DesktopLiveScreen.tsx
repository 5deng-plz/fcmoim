'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useAppStore } from '@/stores/useAppStore';
import { useRecordsStore } from '@/stores/useRecordsStore';
import { useAnnouncementStore } from '@/stores/useAnnouncementStore';
import { 
  Trophy, Flame, Handshake, X, Users, Award,
  MessageCircle, Radio, Activity, LayoutGrid,
  Camera, LoaderCircle, ShieldCheck, UserCheck, UserX, LineChart, UserCog
} from 'lucide-react';
import { fetchFeedPosts, type FeedPost } from '@/stores/feedClient';
import EventComments from '@/components/features/EventComments';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';
import Modal from '@/components/ui/Modal';
import { fetchCalendarMatches, fetchMatchAttendees, fetchMatchLineup, type UpcomingMatch, type MatchLineupEntry } from '@/stores/matchClient';
import { useToastStore } from '@/stores/useToastStore';
import { useAuthStore } from '@/stores/useAuthStore';
import TeamEmblem from '@/components/brand/TeamEmblem';
import {
  fetchClubSettings,
  fetchPendingMemberships,
  patchClubSettings,
  reviewMembership,
  uploadClubLogo,
  withdrawMembership,
  updateMembershipRole,
  type PendingMembershipReview
} from '@/stores/membershipClient';

export default function DesktopLiveScreen() {
  const { 
    activeTab, 
    focusedPostId, 
    setFocusedPostId, 
    activeClubId,
    recordsSubTab
  } = useAppStore();

  const handleClosePost = () => setFocusedPostId(null);

  // If activeTab is home or schedule, we don't display DesktopLiveScreen (handled by page.tsx video player).
  // But just in case, we render standby screen.
  if (activeTab === 'home' || activeTab === 'schedule') {
    return <DesktopOfflinePattern message="라이브 스트리밍이 송출 중입니다." />;
  }

  return (
    <div className="flex-1 h-full relative bg-[#070914] flex flex-col justify-between hidden lg:flex overflow-hidden select-none border-r border-[#25283e]" data-exempt=":// design-exempt(reason: chzzk layout border, expires: 2026-12-31)">
      {/* Stream Header */}
      <div className="p-4 bg-gradient-to-b from-black/95 to-transparent flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex h-5 items-center justify-center rounded bg-[#00ffa3] px-2.5 text-[10px] font-black text-black gap-1 shadow-[0_0_8px_rgba(0,255,163,0.4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            FC MOIM 라이브
          </span>
          <span className="text-sm font-black text-white tracking-wide flex items-center gap-2">
            <span className="text-gray-400">|</span>
            {activeTab === 'records' && `🏆 클럽 명예의 전당 & 시즌 데이터 분석 (${recordsSubTab === 'season' ? '랭킹' : recordsSubTab === 'stats' ? '상성 분석' : '커뮤니티'})`}
            {(activeTab === 'locker_room' || activeTab === 'community') && '💬 라커룸 미디어 상세 채널'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-black text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ffa3] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ffa3]"></span>
            </span>
            <span className="text-[#00ffa3] font-bold">송출 양호 (1080p)</span>
          </span>
          <span className="border-l border-gray-800 pl-3">Bitrate: 8200 kbps</span>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 min-h-0 w-full relative z-10 flex flex-col">
        {activeTab === 'records' && (
          recordsSubTab === 'stats' ? <DesktopDetailStatsPanel /> : <DesktopRecordsPanel />
        )}
        {activeTab === 'locker_room' && <DesktopLockerRoomPanel />}
        {activeTab === 'community' && (
          focusedPostId ? (
            <DesktopPostDetailPanel postId={focusedPostId} clubId={activeClubId} onClose={handleClosePost} />
          ) : (
            <DesktopOfflinePattern message="게시글을 선택하면 상세 미디어 화면이 송출됩니다." />
          )
        )}
      </div>

      {/* Video Player Controls (Ticker Bar) */}
      <div className="p-3 bg-gradient-to-t from-black/95 to-transparent flex items-center justify-between z-20 shrink-0 text-[11px] text-gray-400 font-bold border-t border-[#25283e]/40">
        <div className="flex items-center gap-4">
          <span className="text-[#00ffa3] flex items-center gap-1">
            <Radio size={12} className="animate-pulse" /> LIVE STREAMING
          </span>
          <span className="text-gray-500">|</span>
          <span>FPS: 60.00</span>
          <span>Codec: HEVC (H.265)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hover:text-white cursor-pointer transition-colors">치지직 UI 테마 v2.0</span>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   1. DesktopRecordsPanel (기록 탭 와이드 대시보드)
   ========================================================================== */
function getMockPlayerRecentMatches(row: any) {
  const isFW = row.position === 'FW';
  const isMF = row.position === 'MF';
  const isGK = row.position === 'GK';

  return [
    {
      date: '6월 6일',
      opponent: 'FC 어반 (H)',
      score: '3 : 1 승',
      rating: (row.ovr / 10 + 0.5).toFixed(1),
      stats: isFW ? '1골 0도움' : isMF ? '0골 1도움' : isGK ? '2세이브 1실점' : '차단 3회'
    },
    {
      date: '5월 30일',
      opponent: '잠실 FS (A)',
      score: '2 : 2 무',
      rating: (row.ovr / 10 - 0.2).toFixed(1),
      stats: isFW ? '1골 1도움' : isMF ? '0골 0도움' : isGK ? '4세이브 2실점' : '차단 5회'
    },
    {
      date: '5월 23일',
      opponent: '구피 시니어 (H)',
      score: '4 : 2 승',
      rating: (row.ovr / 10 + 0.2).toFixed(1),
      stats: isFW ? '0골 1도움' : isMF ? '1골 0도움' : isGK ? '1세이브 2실점' : '차단 2회'
    }
  ];
}

function DesktopRecordsPanel() {
  const { records, recordsStatus, loadRecords } = useRecordsStore();
  const { activeClubId } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rows = records?.rankingRows ?? [];
  const summary = records?.seasonSummary ?? null;
  const topWinRateRow = rows.length > 0
    ? [...rows].sort((a, b) => b.winRate - a.winRate)[0]
    : null;

  useEffect(() => {
    if (recordsStatus === 'idle') {
      void loadRecords(activeClubId);
    }
  }, [activeClubId, loadRecords, recordsStatus]);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 winning-bg-grid relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#00ffa3]/5 via-transparent to-[#00b872]/5 pointer-events-none" />

      {/* 1. 시즌 핵심 요약 가로 패널 (Top Row) */}
      <div className="rounded-3xl border border-[#25283e] bg-[#141624]/60 p-5 shadow-lg backdrop-blur-md relative z-10 animate-fadeIn">
        <h3 className="text-xs font-black tracking-wider text-gray-400 uppercase flex items-center gap-2 mb-4">
          <Award size={14} className="text-[#00ffa3]" />
          시즌 핵심 요약
        </h3>

        {summary ? (
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: '총 경기수', value: `${summary.totalMatches || 0} 경기`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
              { label: '최다 경기장', value: summary.topVenue?.location || '-', detail: `${summary.topVenue?.count || 0} 매치`, icon: Radio, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
              { label: '최고 승률', value: topWinRateRow ? topWinRateRow.nickname : '-', detail: topWinRateRow ? `${topWinRateRow.winRate}%` : '-', icon: Trophy, color: 'text-[#00ffa3]', bg: 'bg-[#00ffa3]/10' },
              { label: '최다 득점왕', value: summary.topGoals?.nickname || '-', detail: `${summary.topGoals?.value || 0} 골`, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-400/10' },
              { label: '도움왕', value: summary.topAssists?.nickname || '-', detail: `${summary.topAssists?.value || 0} 도움`, icon: Handshake, color: 'text-[#00ffa3]', bg: 'bg-[#00ffa3]/10' },
              { label: '출장왕', value: summary.topAppearance?.nickname || '-', detail: `${summary.topAppearance?.value || 0} 경기`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl p-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.bg}`}>
                  <item.icon size={13} className={item.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-gray-500 font-bold uppercase truncate">{item.label}</p>
                  <div className="flex justify-between items-baseline gap-1 mt-0.5">
                    <p className="text-xs font-black text-white truncate">{item.value}</p>
                    {item.detail && <span className="text-[9px] font-mono font-black text-[#00ffa3] shrink-0">{item.detail}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 font-bold py-4 text-center">요약 정보를 산출하고 있습니다.</p>
        )}
      </div>

      {/* 2. 명예의 전당 랭킹 테이블 (Full Width) */}
      <div className="rounded-3xl border border-[#25283e] bg-black/60 p-5 shadow-lg backdrop-blur-md relative z-10 flex flex-col animate-fadeIn">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-black tracking-wider text-gray-400 uppercase flex items-center gap-2">
            <Trophy size={14} className="text-[#00ffa3]" />
            25/26 시즌 명예의 전당 랭킹 (선수 선택 시 최근 전적 스트리밍)
          </h3>
          <span className="font-mono text-[10px] font-black text-gray-500">TOTAL: {rows.length} PLAYERS</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/5">
          {/* Header */}
          <div className="grid grid-cols-12 bg-white/5 px-4 py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-1 text-center text-[#00ffa3]">OVR</div>
            <div className="col-span-4 px-2">선수 프로필</div>
            <div className="col-span-3 text-center">경기 전적</div>
            <div className="col-span-1 text-center">승점</div>
            <div className="col-span-2 text-center text-[#00ffa3]">승률</div>
          </div>

          {/* List */}
          {recordsStatus === 'loading' ? (
            <div className="py-20 text-center text-xs font-bold text-gray-500">데이터를 송출하는 중...</div>
          ) : rows.length > 0 ? (
            <div className="divide-y divide-white/5 bg-black/20">
              {rows.slice(0, 8).map((row, index) => {
                const isExpanded = expandedId === row.membershipId;
                return (
                  <div key={row.membershipId} className="border-b border-white/5 last:border-b-0">
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : row.membershipId)}
                      className="grid grid-cols-12 items-center px-4 py-3.5 text-xs font-bold text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="col-span-1 text-center flex items-center justify-center">
                        {index < 3 ? (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border ${
                            index === 0 ? 'bg-amber-400/20 border-amber-400 text-amber-300' :
                            index === 1 ? 'bg-slate-300/20 border-slate-300 text-slate-300' :
                            'bg-amber-700/20 border-amber-700 text-amber-600'
                          }`}>
                            {index + 1}
                          </span>
                        ) : (
                          <span className="text-gray-500 font-mono">{index + 1}</span>
                        )}
                      </div>
                      <div className="col-span-1 text-center font-mono font-black italic text-[#00ffa3]">{row.ovr}</div>
                      <div className="col-span-4 px-2 flex items-center gap-2.5">
                        <Image
                          src={row.photoUrl || getFallbackAvatar(row.nickname)}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full bg-gray-800 object-cover ring-1 ring-white/10"
                          unoptimized
                        />
                        <span className="truncate">{row.nickname}</span>
                      </div>
                      <div className="col-span-3 text-center font-mono text-[11px] text-gray-400">
                        <span className="text-result-win font-bold">{row.wins}승</span>{' '}
                        <span className="text-result-draw font-bold">{row.draws}무</span>{' '}
                        <span className="text-result-loss font-bold">{row.losses}패</span>
                      </div>
                      <div className="col-span-1 text-center font-mono font-black text-white">{row.leaguePoints}</div>
                      <div className="col-span-2 text-center font-mono font-black text-[#00ffa3]">{row.winRate}%</div>
                    </div>

                    {/* 아코디언 바 최근 경기 기록 */}
                    {isExpanded && (
                      <div className="bg-black/45 px-6 py-4 border-t border-white/5 flex flex-col gap-2.5 animate-fadeIn">
                        <p className="text-[10px] font-black tracking-wider text-gray-400 uppercase flex items-center gap-1.5">
                          <Activity size={12} className="text-[#00ffa3] animate-pulse" />
                          최근 3경기 출전 기록 리포트
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {getMockPlayerRecentMatches(row).map((m, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-1 hover:border-[#00ffa3]/30 transition-colors">
                              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                                <span>{m.date} · {m.opponent}</span>
                                <span className="text-[#00ffa3] font-mono font-black">{m.score}</span>
                              </div>
                              <div className="flex justify-between items-baseline mt-1">
                                <span className="text-[11px] font-black text-white">{m.stats}</span>
                                <span className="text-[10px] font-mono font-bold text-gray-500">
                                  평점 <strong className="text-white font-black">{m.rating}</strong>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-xs font-bold text-gray-500">시즌 전적 데이터가 아직 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   2. DesktopPostDetailPanel (커뮤니티 글 상세 뷰어)
   ========================================================================== */
interface DesktopPostDetailPanelProps {
  postId: string;
  clubId: string;
  onClose: () => void;
}

function DesktopPostDetailPanel({ postId, clubId, onClose }: DesktopPostDetailPanelProps) {
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(false);

    // Fetch all posts and find the specific one (as API is list-based)
    fetchFeedPosts({ clubId })
      .then((posts) => {
        if (ignore) return;
        const target = posts.find(p => p.id === postId);
        if (target) {
          setPost(target);
          setLoading(false);
        } else {
          // Fallback to search from announcements store
          const ann = useAnnouncementStore.getState().announcements.find(a => a.id === postId);
          if (ann) {
            setPost({
              id: ann.id,
              clubId: clubId,
              membershipId: '',
              authorName: '운영진',
              matchId: null,
              createdAt: ann.createdAt,
              updatedAt: ann.updatedAt || ann.createdAt,
              textContent: `${ann.title}\n\n${ann.content}`,
              contentType: 'text',
              mediaUrl: null,
              commentCount: 0,
              myReactions: [],
              reactionCounts: { up: 0, down: 0, check: 0, smile: 0, sad: 0 }
            });
            setError(false);
          } else {
            setError(true);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (ignore) return;
        // Fallback search from announcements store on API error
        const ann = useAnnouncementStore.getState().announcements.find(a => a.id === postId);
        if (ann) {
          setPost({
            id: ann.id,
            clubId: clubId,
            membershipId: '',
            authorName: '운영진',
            matchId: null,
            createdAt: ann.createdAt,
            updatedAt: ann.updatedAt || ann.createdAt,
            textContent: `${ann.title}\n\n${ann.content}`,
            contentType: 'text',
            mediaUrl: null,
            commentCount: 0,
            myReactions: [],
            reactionCounts: { up: 0, down: 0, check: 0, smile: 0, sad: 0 }
          });
          setError(false);
        } else {
          setError(true);
        }
        setLoading(false);
      });

    return () => { ignore = true; };
  }, [postId, clubId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black/80 space-y-3">
        <div className="w-8 h-8 rounded-full border-4 border-[#00ffa3]/10 border-t-[#00ffa3] animate-spin" />
        <p className="text-[10px] text-gray-400 font-bold">콘텐츠 미디어를 스트리밍하는 중...</p>
      </div>
    );
  }

  if (error || !post) {
    return <DesktopOfflinePattern message="게시글 정보를 스트리밍하지 못했습니다. 삭제되었거나 존재하지 않는 글입니다." />;
  }

  return (
    <div className="flex-1 flex min-h-0 bg-[#070914] relative">
      
      {/* Blog Detail Reader (Left 65%) */}
      <div className="flex-[7] h-full flex flex-col p-6 overflow-y-auto no-scrollbar border-r border-[#25283e]/50">
        {/* Header toolbar */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <span className="text-xs font-black text-[#00ffa3] bg-[#00ffa3]/10 border border-[#00ffa3]/20 px-3 py-1 rounded-full uppercase tracking-wider">
            {post.contentType === 'text' ? '📝 POST' : post.contentType === 'image' ? '🖼️ GALLERY' : '🎥 VIDEO'}
          </span>
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white transition-all active:scale-95"
          >
            <X size={12} />
            닫기
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 space-y-6">
          <div className="space-y-3.5">
            <h1 className="text-3xl font-black text-white leading-tight">{post.textContent ? post.textContent.split('\n')[0] : '무제 게시글'}</h1>
            
            {/* Meta info */}
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Image
                src={getFallbackAvatar(post.authorName)}
                alt=""
                width={36}
                height={36}
                className="rounded-full bg-gray-800"
                unoptimized
              />
              <div>
                <p className="text-sm font-black text-white">{post.authorName}</p>
                <p className="text-[11px] text-gray-500 font-bold">{new Date(post.createdAt).toLocaleString('ko-KR')}</p>
              </div>
            </div>
          </div>

          {/* Text body content */}
          {post.textContent && (
            <p className="text-base font-medium leading-relaxed text-gray-200 whitespace-pre-wrap py-2">
              {post.textContent.split('\n').slice(1).join('\n') || post.textContent}
            </p>
          )}

          {/* Media Attachments */}
          {post.mediaUrl && (
            <div className="rounded-3xl border border-white/10 bg-black/60 overflow-hidden shadow-2xl max-w-2xl mx-auto flex items-center justify-center p-2">
              {post.contentType === 'video' ? (
                <video src={post.mediaUrl} controls className="w-full max-h-[380px] rounded-2xl" />
              ) : (
                <img src={post.mediaUrl} alt="첨부 이미지" className="w-full max-h-[380px] object-contain rounded-2xl" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reply Thread (Right 35%) */}
      <div className="flex-[3] h-full flex flex-col bg-[#0b0c16]/90 backdrop-blur-md min-w-[280px]">
        <div className="p-4 border-b border-[#25283e] flex items-center justify-between shrink-0">
          <span className="text-xs font-black text-white tracking-wider flex items-center gap-2">
            <MessageCircle size={14} className="text-[#00ffa3]" />
            실시간 반응 댓글 ({post.commentCount || 0})
          </span>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-3">
          <EventComments
            clubId={clubId}
            targetType="feed_post"
            targetId={postId}
            showPhase={false}
            embedded
          />
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   3. DesktopOfflinePattern (오프라인 모니터 대시보드 화면)
   ========================================================================== */
function DesktopOfflinePattern({ message }: { message: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#070914] winning-bg-grid p-6 text-center select-none">
      
      {/* TV Color Bars - Offline Metaphor */}
      <div className="w-full max-w-[340px] h-36 rounded-2xl overflow-hidden relative flex flex-col justify-between bg-black border border-[#25283e] mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
        <div className="flex h-3/4 w-full">
          <div className="flex-1 bg-[#ffffff]" />
          <div className="flex-1 bg-[#fcfc00]" />
          <div className="flex-1 bg-[#00fcfc]" />
          <div className="flex-1 bg-[#00fc00]" />
          <div className="flex-1 bg-[#fc00fc]" />
          <div className="flex-1 bg-[#fc0000]" />
          <div className="flex-1 bg-[#0000fc]" />
        </div>
        <div className="flex h-1/4 w-full bg-[#000000] justify-around items-center px-1">
          <div className="w-10 h-full bg-[#00fcfc]" />
          <div className="w-10 h-full bg-[#141624]" />
          <div className="w-10 h-full bg-[#fc00fc]" />
          <div className="w-10 h-full bg-[#ffffff]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/90 px-4 py-1.5 border border-[#25283e] -skew-x-12 shadow-[0_0_15px_rgba(0,0,0,0.9)]">
            <span className="block text-xs font-black tracking-widest text-[#00ffa3] animate-pulse skew-x-12">
              STANDBY
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-md space-y-2">
        <p className="text-sm font-black text-[#00ffa3] shadow-sm flex items-center gap-1.5 justify-center bg-black/40 px-3 py-1 rounded-full border border-[#00ffa3]/20 inline-block">
          <span className="w-2 h-2 rounded-full bg-[#00ffa3] animate-ping" />
          대기 모드 (Standby)
        </p>
        <p className="text-xs font-semibold text-gray-400 leading-relaxed pt-2">
          {message}
        </p>
      </div>
    </div>
  );
}

/* ==========================================================================
   4. DesktopLockerRoomPanel (라커룸 탭 와이드 대시보드 - 스쿼드 전력 분석 전광판)
   ========================================================================== */
/* ==========================================================================
   4. DesktopLockerRoomPanel (라커룸 탭 와이드 대시보드 - 스쿼드 전력 분석 전광판)
   ========================================================================== */
function formatFoot(foot: string | null) {
  if (foot === 'both') return '양발';
  return foot === 'left' ? '왼발' : '오른발';
}

function formatBody(member: any) {
  const h = member.heightCm ? `${member.heightCm}cm` : '';
  const w = member.weightKg ? `${member.weightKg}kg` : '';
  if (h && w) return `${h}, ${w}`;
  return h || w || '-';
}

function DesktopLockerRoomPanel() {
  const { records, recordsStatus, loadRecords } = useRecordsStore();
  const { activeClubId, teamName, teamLogoUrl, userRole } = useAppStore();
  const { showToast } = useToastStore();
  const rows = records?.rankingRows ?? [];
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const memberProfile = useAuthStore((state) => state.memberProfile);

  // 행정 상태들
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [clubDescription, setClubDescription] = useState('');
  const [isClubPublic, setIsClubPublic] = useState(true);
  const [isSavingClubSettings, setIsSavingClubSettings] = useState(false);
  const [isUploadingClubLogo, setIsUploadingClubLogo] = useState(false);

  // Roster 관리 상태들 (운영진 임명/회수 슬롯 중심)
  const [operatorActionModal, setOperatorActionModal] = useState<{ mode: 'grant' | 'revoke'; member: any } | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [showAssignList, setShowAssignList] = useState(false);

  useEffect(() => {
    if (recordsStatus === 'idle') {
      void loadRecords(activeClubId);
    }
  }, [activeClubId, loadRecords, recordsStatus]);

  // 설정 및 신청 대기자 조회
  const loadAdminData = useCallback(async () => {
    if (!activeClubId) return;
    try {
      setIsLoadingPending(true);
      const [settings, pendings] = await Promise.all([
        fetchClubSettings(activeClubId),
        fetchPendingMemberships(activeClubId)
      ]);
      setClubDescription(settings.description || '');
      setIsClubPublic(settings.isPublic ?? true);
      setPendingMembers(pendings);
    } catch (err) {
      console.error('[FC Moim] Load admin data failed:', err);
    } finally {
      setIsLoadingPending(false);
    }
  }, [activeClubId]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  // 로고 업로드 핸들러
  const handleClubLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingClubLogo(true);
      const club = await uploadClubLogo({ clubId: activeClubId, file });
      useAppStore.setState({ teamLogoUrl: club.logoUrl });
      showToast('팀 로고를 업로드했습니다.');
      void loadAdminData();
    } catch (err) {
      showToast('로고 업로드에 실패했습니다.');
    } finally {
      setIsUploadingClubLogo(false);
    }
  };

  // 팀 설정 저장 핸들러
  const handleSaveClubSettings = async () => {
    try {
      setIsSavingClubSettings(true);
      await patchClubSettings({
        clubId: activeClubId,
        description: clubDescription,
        isPublic: isClubPublic
      });
      showToast('팀 설정을 저장했습니다.');
      void loadAdminData();
    } catch (err) {
      showToast('설정 저장에 실패했습니다.');
    } finally {
      setIsSavingClubSettings(false);
    }
  };

  // 입단 심사 핸들러
  const handleReview = async (membershipId: string, status: 'approved' | 'rejected') => {
    try {
      setReviewingId(membershipId);
      await reviewMembership({ clubId: activeClubId, membershipId, decision: status });
      showToast(status === 'approved' ? '입단을 승인했습니다.' : '입단을 반려했습니다.');
      void loadAdminData();
      void loadRecords(activeClubId); // 스쿼드가 바뀔 수 있으므로 갱신
    } catch (err) {
      showToast('심사 처리에 실패했습니다.');
    } finally {
      setReviewingId(null);
    }
  };

  // 권한 변경 처리 함수
  const handleChangeRole = async (membershipId: string, role: 'operator' | 'member') => {
    try {
      setChangingRoleId(membershipId);
      await updateMembershipRole({ clubId: activeClubId, membershipId, role });
      showToast(role === 'operator' ? '운영진을 임명했습니다.' : '운영진 권한을 회수했습니다.');
      void loadAdminData();
      void loadRecords(activeClubId);
    } catch (err) {
      showToast('역할 변경에 실패했습니다.');
    } finally {
      setChangingRoleId(null);
    }
  };

  // 모달 확인 처리
  const handleConfirmAction = async () => {
    if (!operatorActionModal) return;
    const targetRole = operatorActionModal.mode === 'grant' ? 'operator' : 'member';
    await handleChangeRole(operatorActionModal.member.membershipId, targetRole);
    setOperatorActionModal(null);
  };

  // 스쿼드 통계 계산
  const totalCount = rows.length;
  const avgOvr = totalCount > 0 
    ? Math.round(rows.reduce((sum, r) => sum + r.ovr, 0) / totalCount) 
    : 0;

  const positions = rows.reduce((acc: any, r) => {
    const pos = r.position === 'FW' || r.position === 'MF' || r.position === 'DF' || r.position === 'GK' ? r.position : 'MF';
    if (!acc[pos]) acc[pos] = { count: 0, sumOvr: 0 };
    acc[pos].count += 1;
    acc[pos].sumOvr += r.ovr;
    return acc;
  }, { FW: { count: 0, sumOvr: 0 }, MF: { count: 0, sumOvr: 0 }, DF: { count: 0, sumOvr: 0 }, GK: { count: 0, sumOvr: 0 } });

  const canReview = userRole === 'admin' || userRole === 'operator';

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 winning-bg-grid relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#00ffa3]/5 via-transparent to-[#00b872]/5 pointer-events-none" />

      {/* 1. 팀 클럽 현황 프로필 가로 프레임 */}
      <div className="rounded-3xl border border-[#25283e] bg-black/60 p-6 shadow-lg backdrop-blur-md relative z-10 flex items-center gap-6 animate-fadeIn">
        <div className="w-20 h-20 rounded-full border-2 border-[#00ffa3] bg-[#141624] overflow-hidden flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,163,0.3)]">
          {teamLogoUrl ? (
            <Image src={teamLogoUrl} alt="" width={80} height={80} className="w-full h-full object-cover" unoptimized />
          ) : (
            <span className="text-3xl">🏟️</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <span className="inline-flex items-center rounded-full bg-[#00ffa3]/10 border border-[#00ffa3]/20 px-2.5 py-0.5 text-[10px] font-black text-[#00ffa3] uppercase tracking-wider">
            FC MOIM ACTIVE SQUAD
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">{teamName}</h2>
          <p className="text-xs font-bold text-gray-400 leading-relaxed">
            클럽 회원들의 OVR 능력치 등급표 및 포지션 스쿼드 밸런스를 송출하고 있습니다. 신규 입단 회원 검토 및 역할 변경 처리는 우측 모바일 제어 콘솔을 이용해 주세요.
          </p>
        </div>
      </div>

      {/* 2. 전력 분석 보드 (OVR Summary & Position Balance) */}
      <div className="grid grid-cols-2 gap-6 relative z-10">
        
        {/* Left Card: Squad OVR Summary */}
        <div className="rounded-3xl border border-[#25283e] bg-[#141624]/60 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between animate-fadeIn">
          <div>
            <h3 className="text-xs font-black tracking-wider text-gray-400 uppercase flex items-center gap-2 mb-3">
              <Award size={14} className="text-[#00ffa3]" />
              스쿼드 전력 평가 (OVR)
            </h3>
            <p className="text-[10px] text-gray-500 font-bold leading-normal">
              등록 멤버들의 OVR 능력치 기반 클럽 평균 스펙 지표입니다.
            </p>
          </div>

          <div className="my-6 flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border-4 border-[#00ffa3]/20 border-t-[#00ffa3] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(0,255,163,0.15)] shrink-0">
              <span className="text-3xl font-black text-white font-mono">{avgOvr}</span>
              <span className="text-[8px] font-black text-[#00ffa3] uppercase tracking-widest mt-0.5">AVG OVR</span>
            </div>
            <div className="flex-1 space-y-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-gray-400">스쿼드 등급</span>
                <span className="text-sm font-black text-white">{avgOvr >= 80 ? 'WORLD CLASS 🌟' : avgOvr >= 75 ? 'PROFESSIONAL 👍' : 'SEMI-PRO ⚽'}</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                <div className="bg-[#00ffa3] h-full rounded-full shadow-[0_0_8px_rgba(0,255,163,0.5)]" style={{ width: `${avgOvr}%` }} />
              </div>
              <p className="text-[9px] font-bold text-gray-500">OVR 80 이상의 월드클래스 회원이 {rows.filter(r => r.ovr >= 80).length}명 포진되어 있습니다.</p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3.5 flex justify-between text-[11px] font-bold text-gray-400">
            <span>총 등록 인원: <strong className="text-white font-mono">{totalCount}명</strong></span>
            <span>최고 능력치: <strong className="text-[#00ffa3] font-mono">{totalCount > 0 ? Math.max(...rows.map(r => r.ovr)) : 0} OVR</strong></span>
          </div>
        </div>

        {/* Right Card: Position Balance */}
        <div className="rounded-3xl border border-[#25283e] bg-[#141624]/60 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between animate-fadeIn">
          <div>
            <h3 className="text-xs font-black tracking-wider text-gray-400 uppercase flex items-center gap-2 mb-3">
              <Users size={14} className="text-[#00ffa3]" />
              포지션별 스쿼드 밸런스
            </h3>
            <p className="text-[10px] text-gray-500 font-bold leading-normal">
              스쿼드의 균형적인 포지션 배치 현황입니다.
            </p>
          </div>

          <div className="space-y-2.5 my-4">
            {[
              { key: 'FW', label: '공격수 (FW)', color: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]', textColor: 'text-red-400' },
              { key: 'MF', label: '미드필더 (MF)', color: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]', textColor: 'text-green-400' },
              { key: 'DF', label: '수비수 (DF)', color: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]', textColor: 'text-blue-400' },
              { key: 'GK', label: '골키퍼 (GK)', color: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]', textColor: 'text-amber-400' }
            ].map((pos) => {
              const count = positions[pos.key]?.count ?? 0;
              const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              const avg = count > 0 ? Math.round(positions[pos.key].sumOvr / count) : 0;

              return (
                <div key={pos.key} className="space-y-1">
                  <div className="flex justify-between items-baseline text-[10px] font-bold text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${pos.color}`} />
                      {pos.label}
                    </span>
                    <span>{count}명 ({percent}%) · 평균 OVR {avg || '-'}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div className={`${pos.color} h-full rounded-full`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. 클럽 행정 관리 센터 (Club Administration Hub) */}
      {canReview && (
        <div className="border-t border-white/5 pt-6 space-y-6 relative z-10 animate-fadeIn">
          <div className="flex items-center gap-2 px-1">
            <ShieldCheck size={18} className="text-[#00ffa3]" />
            <h3 className="text-sm font-black text-white tracking-tight">클럽 행정 관리 센터 (Club Administration Hub)</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            
            {/* Left Hub: Team Settings Form */}
            <div className="rounded-3xl border border-[#25283e] bg-[#141624]/60 p-5 shadow-lg backdrop-blur-md space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[11px] font-black text-gray-400 uppercase">클럽 프로필 설정</span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                  isClubPublic
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-white/5 text-gray-400 border-white/10'
                }`}>
                  {isClubPublic ? '공개 클럽' : '비공개 클럽'}
                </span>
              </div>

              <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-3">
                <div className="relative w-14 h-14 rounded-full border-2 border-white/10 bg-[#141624] overflow-hidden flex items-center justify-center shrink-0">
                  <TeamEmblem teamName={teamName} logoUrl={teamLogoUrl} size={56} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white">클럽 엠블럼 로고</p>
                  <p className="text-[10px] text-gray-500 font-bold mt-0.5">JPG, PNG, WEBP · 2MB 이하</p>
                </div>
                <button
                  type="button"
                  disabled={isUploadingClubLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00ffa3] text-black hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                  aria-label="로고 업로드"
                >
                  {isUploadingClubLogo ? <LoaderCircle size={18} className="animate-spin" /> : <Camera size={18} />}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleClubLogoChange}
                  disabled={isUploadingClubLogo}
                />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-gray-400">클럽 소개글</span>
                <textarea
                  value={clubDescription}
                  onChange={(event) => setClubDescription(event.target.value)}
                  className="min-h-20 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-xs font-bold leading-relaxed text-white outline-none focus:border-[#00ffa3] transition-colors"
                  maxLength={500}
                />
              </label>

              <label className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-4 py-3 cursor-pointer select-none">
                <span className="text-xs font-black text-white">클럽 둘러보기 페이지에 공개</span>
                <input
                  type="checkbox"
                  checked={isClubPublic}
                  onChange={(event) => setIsClubPublic(event.target.checked)}
                  className="h-4.5 w-4.5 accent-[#00ffa3] cursor-pointer"
                />
              </label>

              <button
                type="button"
                disabled={isSavingClubSettings}
                onClick={() => void handleSaveClubSettings()}
                className="w-full rounded-xl bg-[#00ffa3] py-3 text-xs font-black text-black hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSavingClubSettings ? '팀 설정을 저장 중...' : '클럽 프로필 저장하기'}
              </button>
            </div>

            {/* Right Hub: Club Membership & Roster Hub (입단 신청 + 운영진 슬롯) */}
            <div className="rounded-3xl border border-[#25283e] bg-[#141624]/60 p-5 shadow-lg backdrop-blur-md space-y-5 flex flex-col justify-between">
              
              {/* Part 1: Pending Applicants */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-[11px] font-black text-gray-400 uppercase">신규 입단 신청 현황</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-[#00ffa3]/10 text-[#00ffa3] border border-[#00ffa3]/20">
                    {pendingMembers.length}명 대기 중
                  </span>
                </div>

                {isLoadingPending ? (
                  <div className="py-12 text-center text-xs font-bold text-gray-500">신청 대기열을 가져오는 중...</div>
                ) : pendingMembers.length > 0 ? (
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto no-scrollbar">
                    {pendingMembers.map((member) => (
                      <div key={member.id} className="rounded-2xl border border-white/5 bg-black/40 p-3 flex justify-between items-center hover:border-white/10 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{member.nickname}</p>
                          <p className="text-[9px] text-gray-500 font-bold mt-0.5">
                            {formatBody(member)} · {formatFoot(member.preferredFoot)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            disabled={reviewingId === member.id}
                            onClick={() => void handleReview(member.id, 'approved')}
                            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-[#00ffa3] text-black hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                            title="승인"
                          >
                            <UserCheck size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={reviewingId === member.id}
                            onClick={() => void handleReview(member.id, 'rejected')}
                            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white active:scale-95 transition-all disabled:opacity-50"
                            title="반려"
                          >
                            <UserX size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs font-bold text-gray-500 rounded-2xl border border-dashed border-white/5 bg-black/20">
                    입단 대기자가 없습니다.
                  </div>
                )}
              </div>

              {/* Part 2: Roster Operator Slots (통합 배치) */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-gray-400 uppercase">클럽 운영진 지정 및 공석 현황</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-[#00ffa3]/10 text-[#00ffa3] border border-[#00ffa3]/20">
                    최대 2명
                  </span>
                </div>

                <div className="space-y-2">
                  {/* 1. 소유주 (Owner) 슬롯 */}
                  {(() => {
                    const owner = rows.find((r: any) => r.role === 'admin');
                    if (!owner) return null;
                    return (
                      <div className="rounded-2xl border border-[#00ffa3]/10 bg-black/40 px-3 py-2 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute right-0 top-0 text-[24px] opacity-10 pointer-events-none select-none">👑</div>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Image
                            src={owner.photoUrl || getFallbackAvatar(owner.nickname)}
                            alt=""
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded-full bg-surface-bg object-cover ring-1 ring-[#00ffa3]/20"
                            unoptimized
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-black text-white truncate">{owner.nickname}</p>
                              <span className="text-[7px] bg-[#00ffa3]/10 text-[#00ffa3] border border-[#00ffa3]/20 px-1 py-0.2 rounded font-black uppercase">OWNER</span>
                            </div>
                            <p className="text-[9px] text-gray-500 font-bold">OVR {owner.ovr} · 소유주</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-[8px] font-black text-gray-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                          해임 불가
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. 운영진 슬롯 2개 */}
                  <div className="grid grid-cols-2 gap-2">
                    {(() => {
                      const operators = rows.filter((r: any) => r.role === 'operator');
                      
                      return [0, 1].map((index) => {
                        const operator = operators[index];
                        
                        if (operator) {
                          const isSelf = operator.membershipId === memberProfile?.id;
                          return (
                            <div key={operator.membershipId} className="rounded-2xl border border-white/5 bg-black/40 p-2.5 flex justify-between items-center hover:border-white/10 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <Image
                                  src={operator.photoUrl || getFallbackAvatar(operator.nickname)}
                                  alt=""
                                  width={24}
                                  height={24}
                                  className="h-6 w-6 rounded-full bg-surface-bg object-cover"
                                  unoptimized
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-white truncate flex items-center gap-1">
                                    {operator.nickname}
                                    {isSelf && <span className="text-[7px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-0.5 rounded font-bold">ME</span>}
                                  </p>
                                  <p className="text-[8px] text-gray-500 font-bold">OVR {operator.ovr}</p>
                                </div>
                              </div>
                              
                              {!isSelf && (
                                <button
                                  type="button"
                                  disabled={changingRoleId === operator.membershipId}
                                  onClick={() => setOperatorActionModal({
                                    mode: 'revoke',
                                    member: operator
                                  })}
                                  className="shrink-0 text-[8px] font-black text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 px-2 py-1 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                >
                                  해임
                                </button>
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <div key={`empty-slot-${index}`} className="rounded-2xl border border-dashed border-white/10 bg-black/25 p-2.5 flex items-center justify-between hover:border-white/20 transition-colors">
                              <div className="flex items-center gap-2 min-w-0 text-gray-500">
                                <span className="text-sm">🛠️</span>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black leading-tight">운영진 공석</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowAssignList(true)}
                                className="shrink-0 text-[8px] font-black text-black bg-[#00ffa3] hover:brightness-110 px-2.5 py-1.2 rounded-lg transition-all active:scale-95"
                              >
                                임명
                              </button>
                            </div>
                          );
                        }
                      });
                    })()}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Operator Assignment Candidate Picker Modal */}
      <Modal
        title="🛠️ 신규 운영진 임명"
        isOpen={showAssignList}
        onClose={() => setShowAssignList(false)}
        presentation="dialog"
      >
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400">
            클럽 행정(가입 승인, 클럽 정보 관리)을 지원할 새 운영진 회원을 일반 스쿼드 목록 중에서 선택해 주세요.
          </p>
          <div className="max-h-[250px] overflow-y-auto no-scrollbar space-y-2.5">
            {(() => {
              const candidates = rows.filter((r: any) => r.role === 'member');
              return candidates.length > 0 ? (
                candidates.map((member) => (
                  <div key={member.membershipId} className="rounded-xl border border-white/5 bg-black/40 p-3 flex justify-between items-center hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Image
                        src={member.photoUrl || getFallbackAvatar(member.nickname)}
                        alt=""
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded-full bg-surface-bg object-cover"
                        unoptimized
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{member.nickname}</p>
                        <p className="text-[9px] text-gray-500 font-bold">OVR {member.ovr}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignList(false);
                        setOperatorActionModal({ mode: 'grant', member });
                      }}
                      className="text-[10px] font-black text-black bg-[#00ffa3] hover:brightness-110 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                    >
                      임명 선택
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs font-bold text-gray-500 rounded-xl border border-dashed border-white/5">
                  임명할 수 있는 일반 멤버 후보가 없습니다.
                </div>
              );
            })()}
          </div>
          <button
            type="button"
            onClick={() => setShowAssignList(false)}
            className="w-full rounded-xl bg-white/5 border border-white/5 py-2.5 text-xs font-black text-gray-300 transition-all hover:bg-white/10 active:scale-95"
          >
            닫기
          </button>
        </div>
      </Modal>

      {/* Operator Action Confirmation Modal */}
      <Modal
        title={operatorActionModal?.mode === 'grant' ? '🛠️ 운영진 임명' : '🛠️ 운영진 권한 회수'}
        isOpen={operatorActionModal !== null}
        onClose={() => setOperatorActionModal(null)}
        presentation="dialog"
      >
        {operatorActionModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/5 p-3">
              <Image
                src={operatorActionModal.member.photoUrl || getFallbackAvatar(operatorActionModal.member.nickname)}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-full bg-surface-bg object-cover"
                unoptimized
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{operatorActionModal.member.nickname}</p>
                <p className="text-xs font-bold text-gray-400">
                  {operatorActionModal.mode === 'grant'
                    ? '이 회원을 클럽 운영진으로 승격시켜 행정(입단 심사 등) 권한을 부여합니다.'
                    : '이 회원의 운영진 지위를 해임하고 일반 회원 등급으로 복귀시킵니다.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOperatorActionModal(null)}
                className="rounded-xl bg-white/5 border border-white/5 px-4 py-3 text-sm font-bold text-gray-300 transition-all hover:bg-white/10 active:scale-95"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAction()}
                className="rounded-xl bg-[#00ffa3] text-black hover:brightness-110 px-4 py-3 text-sm font-bold transition-all active:scale-95"
              >
                {operatorActionModal.mode === 'grant' ? '임명 승인' : '해임 승인'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DesktopDetailStatsPanel() {
  const { records, recordsStatus, loadRecords } = useRecordsStore();
  const { activeClubId } = useAppStore();
  const { memberProfile } = useAuthStore();

  // 경기 기록 상태
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchLineupsMap, setMatchLineupsMap] = useState<Record<string, MatchLineupEntry[]>>({});
  const [isLoadingLineups, setIsLoadingLineups] = useState(false);

  useEffect(() => {
    if (recordsStatus === 'idle') {
      void loadRecords(activeClubId);
    }
  }, [activeClubId, loadRecords, recordsStatus]);

  // 경기 목록 로드
  useEffect(() => {
    if (!activeClubId) return;
    let isActive = true;
    setIsLoadingMatches(true);
    
    const currentYear = new Date().getFullYear();
    const fromStr = `${currentYear}-01-01`;
    const toStr = `${currentYear + 1}-01-01`;

    fetchCalendarMatches({ clubId: activeClubId, from: fromStr, to: toStr })
      .then((data) => {
        if (!isActive) return;
        // 완료되었거나 스코어가 입력된 경기들을 날짜 내림차순 정렬 (매트릭스는 왼쪽에서 오른쪽으로 시간 순이 보편적이므로 날짜 오름차순 정렬)
        const finished = data
          .filter((m) => m.status === 'finished' || (m.ourScore !== null && m.oppScore !== null))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setMatches(finished);
      })
      .catch((err) => {
        console.error('[FC Moim] Load match history failed:', err);
      })
      .finally(() => {
        if (isActive) setIsLoadingMatches(false);
      });

    return () => { isActive = false; };
  }, [activeClubId]);

  // 경기별 라인업 명단 병렬 로드 (참석 여부 및 소속 팀 번호 확보)
  useEffect(() => {
    if (matches.length === 0) return;
    let isActive = true;
    setIsLoadingLineups(true);

    const loadLineups = async () => {
      try {
        const lineupPromises = matches.map(async (m) => {
          const lineup = await fetchMatchLineup({ clubId: activeClubId, matchId: m.id });
          return {
            matchId: m.id,
            lineup
          };
        });

        const results = await Promise.all(lineupPromises);
        if (!isActive) return;

        const map: Record<string, MatchLineupEntry[]> = {};
        for (const res of results) {
          map[res.matchId] = res.lineup;
        }
        setMatchLineupsMap(map);
      } catch (err) {
        console.error('[FC Moim] Load match lineups map failed:', err);
      } finally {
        if (isActive) setIsLoadingLineups(false);
      }
    };

    void loadLineups();
    return () => { isActive = false; };
  }, [matches, activeClubId]);

  // 랭킹 리스트 데이터
  const rows = records?.rankingRows ?? [];

  // 로그인한 사용자의 회원 ID
  const myMembershipId = memberProfile?.id;

  // 1. 로그인 사용자 기준 경기장별 전적 동적 집계
  const dynamicStadiumStats = useMemo(() => {
    if (!myMembershipId) return [];
    
    const stadiumMap: Record<string, { name: string; matches: number; wins: number; draws: number; losses: number; rate: number }> = {};
    
    for (const match of matches) {
      if (match.ourScore === null || match.oppScore === null) continue;
      const lineup = matchLineupsMap[match.id] ?? [];
      const myEntry = lineup.find((e) => e.membershipId === myMembershipId);
      if (!myEntry) continue; // 내가 참여하지 않은 경기
      
      const loc = match.location;
      if (!stadiumMap[loc]) {
        stadiumMap[loc] = { name: loc, matches: 0, wins: 0, draws: 0, losses: 0, rate: 0 };
      }
      
      const stat = stadiumMap[loc];
      stat.matches += 1;
      
      const isWin = match.ourScore > match.oppScore;
      const isDraw = match.ourScore === match.oppScore;
      
      if (isDraw) {
        stat.draws += 1;
      } else {
        const isTeam1 = myEntry.teamNumber === 1;
        const isMyWin = isWin ? isTeam1 : !isTeam1;
        if (isMyWin) stat.wins += 1;
        else stat.losses += 1;
      }
    }
    
    return Object.values(stadiumMap).map((st) => {
      const decided = st.wins + st.losses + st.draws;
      st.rate = decided ? Math.round((st.wins / decided) * 100) : 0;
      return st;
    }).sort((a, b) => b.rate - a.rate || b.matches - a.matches);
  }, [matches, matchLineupsMap, myMembershipId]);

  // 2. 로그인 사용자 기준 동료 선수간의 시너지/상성(케미스트리) 동적 집계
  const dynamicChemistry = useMemo(() => {
    if (!myMembershipId || rows.length === 0) return { best: [], worst: [] };
    
    const partnerStats: Array<{
      nickname: string;
      matches: number;
      wins: number;
      losses: number;
      draws: number;
      rate: number;
    }> = [];
    
    for (const player of rows) {
      if (player.membershipId === myMembershipId) continue; // 나 자신은 제외
      
      let coMatches = 0;
      let coWins = 0;
      let coLosses = 0;
      let coDraws = 0;
      
      for (const match of matches) {
        if (match.ourScore === null || match.oppScore === null) continue;
        const lineup = matchLineupsMap[match.id] ?? [];
        
        // 나와 동료가 둘 다 이 경기에 참여했는지 확인
        const myEntry = lineup.find((e) => e.membershipId === myMembershipId);
        const partnerEntry = lineup.find((e) => e.membershipId === player.membershipId);
        
        if (!myEntry || !partnerEntry) continue; // 둘 중 한 명이라도 불참했으면 패스
        
        // 같은 팀(RED 또는 BLUE)으로 같이 뛰었을 때만 상성으로 집계
        if (myEntry.teamNumber === partnerEntry.teamNumber) {
          coMatches += 1;
          const isWin = match.ourScore > match.oppScore;
          const isDraw = match.ourScore === match.oppScore;
          
          if (isDraw) {
            coDraws += 1;
          } else {
            const isTeam1 = myEntry.teamNumber === 1;
            const isMyWin = isWin ? isTeam1 : !isTeam1;
            if (isMyWin) coWins += 1;
            else coLosses += 1;
          }
        }
      }
      
      if (coMatches > 0) {
        partnerStats.push({
          nickname: player.nickname,
          matches: coMatches,
          wins: coWins,
          losses: coLosses,
          draws: coDraws,
          rate: Math.round((coWins / coMatches) * 100)
        });
      }
    }
    
    // 승률 및 함께 뛴 경기 수 순으로 내림차순 정렬
    const sortedBest = [...partnerStats].sort((a, b) => b.rate - a.rate || b.matches - a.matches);
    const sortedWorst = [...partnerStats].sort((a, b) => a.rate - b.rate || a.matches - b.matches);
    
    // 베스트와 워스트 리스트 추출 (최대 3명씩)
    const bestCandidates = sortedBest.filter((p) => p.rate >= 50);
    const worstCandidates = sortedWorst.filter((p) => p.rate < 50);
    
    // 설명 템플릿 매핑
    const bestDescs = [
      '완벽한 티키타카 빌드업 듀오 ⚽',
      '공수 전환의 마스터클래스 ⚡',
      '눈빛만 봐도 통하는 연계 시너지 🔥'
    ];
    
    const worstDescs = [
      '동선 오버랩으로 역습 자주 허용 ⚠️',
      '패스 미스 빌드업 불안 요소 노출 📉',
      '공격 템포 조율 어긋남 발생 🧩'
    ];
    
    const best = bestCandidates.slice(0, 3).map((item, idx) => ({
      partner: item.nickname,
      desc: bestDescs[idx % bestDescs.length],
      rate: item.rate,
      stats: `${item.matches}경기 ${item.wins}승 ${item.losses}패`
    }));
    
    const worst = worstCandidates.slice(0, 3).map((item, idx) => ({
      partner: item.nickname,
      desc: worstDescs[idx % worstDescs.length],
      rate: item.rate,
      stats: `${item.matches}경기 ${item.wins}승 ${item.losses}패`
    }));
    
    return { best, worst };
  }, [rows, matches, matchLineupsMap, myMembershipId]);

  // 경기장 승률 모의 데이터 및 동적 결합
  const stadiums = dynamicStadiumStats.length > 0 ? dynamicStadiumStats.map((st, i) => ({
    name: st.name,
    matches: st.matches,
    wins: st.wins,
    draws: st.draws,
    losses: st.losses,
    rate: st.rate,
    color: st.rate >= 75 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : st.rate >= 50 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : st.rate >= 30 ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.5)]'
  })) : [
    { name: 'FC 어반 홈피치 (H)', matches: 5, wins: 4, draws: 1, losses: 0, rate: 80, color: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
    { name: '잠실 FS 돔구장 (A)', matches: 4, wins: 2, draws: 1, losses: 1, rate: 50, color: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' },
    { name: '구피 시니어 구장 (H)', matches: 3, wins: 2, draws: 0, losses: 1, rate: 67, color: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' },
    { name: '하남 풋살 스타디움 (A)', matches: 2, wins: 0, draws: 2, losses: 0, rate: 0, color: 'bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.5)]' }
  ];

  // 베스트/워스트 케미 조합 동적 결합
  const bestChemistry = dynamicChemistry.best.length > 0 ? dynamicChemistry.best : [
    { partner: '최광수 & 박영철', desc: '공수 전환의 마스터클래스', stats: '6경기 5승 1패', rate: 83 },
    { partner: '이영식 & 김영수', desc: '완벽한 티키타카 빌드업 듀오', stats: '5경기 4승 1무', rate: 80 },
    { partner: '정상철 & 한민수', desc: '철벽의 통곡의 벽 수비 파트너', stats: '4경기 3승 1무', rate: 75 }
  ];

  const worstChemistry = dynamicChemistry.worst.length > 0 ? dynamicChemistry.worst : [
    { partner: '김영수 & 정상철', desc: '동선 오버랩으로 역습 자주 허용', stats: '5경기 1승 4패', rate: 20 },
    { partner: '박영철 & 한민수', desc: '패스 미스 빌드업 불안 요소 노출', stats: '4경기 1승 1무 2패', rate: 25 }
  ];

  // 각 선수별 매트릭스 실시간 승무패 집계 (청백전에서 RED vs BLUE로 나누어 승리/패배 지정)
  const playerMatrixStats = useMemo(() => {
    const stats: Record<string, { wins: number; losses: number; draws: number; winRate: number }> = {};
    
    for (const player of rows) {
      let wins = 0;
      let losses = 0;
      let draws = 0;
      
      for (const match of matches) {
        if (match.ourScore === null || match.oppScore === null) continue;
        const lineup = matchLineupsMap[match.id] ?? [];
        const entry = lineup.find((e) => e.membershipId === player.membershipId);
        if (!entry) continue; // 불참
        
        const isWin = match.ourScore > match.oppScore;
        const isDraw = match.ourScore === match.oppScore;
        
        if (isDraw) {
          draws += 1;
        } else {
          // entry.teamNumber === 1 이면 Team 1 (RED)
          // entry.teamNumber === 2 이면 Team 2 (BLUE)
          const isTeam1 = entry.teamNumber === 1;
          if (isWin) {
            if (isTeam1) wins += 1;
            else losses += 1;
          } else {
            if (isTeam1) losses += 1;
            else wins += 1;
          }
        }
      }
      
      const total = wins + losses + draws;
      const winRate = total ? Math.round((wins / total) * 100) : 0;
      stats[player.membershipId] = { wins, losses, draws, winRate };
    }
    
    return stats;
  }, [rows, matches, matchLineupsMap]);

  // 날짜 변환 헬퍼 (ex. 2026-05-02 -> 26.5.2)
  const formatHeaderDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const yy = d.getFullYear().toString().substring(2);
      const m = d.getMonth() + 1;
      const date = d.getDate();
      return `${yy}.${m}.${date}`;
    } catch {
      return '';
    }
  };

  // 경기장명 축약 헬퍼
  const shrinkLocation = (loc: string) => {
    if (loc.includes('잠실')) return '잠실';
    if (loc.includes('상암')) return '상암';
    if (loc.includes('하남')) return '하남';
    if (loc.includes('어반')) return '어반';
    return loc.substring(0, 3);
  };

  const isWorking = isLoadingMatches || isLoadingLineups;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 winning-bg-grid relative animate-fadeIn">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#00ffa3]/5 via-transparent to-[#00b872]/5 pointer-events-none" />

      {/* 1. 분석실 타이틀 배너 */}
      <div className="rounded-3xl border border-[#25283e] bg-black/60 p-6 shadow-lg backdrop-blur-md relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#00ffa3]/10 border border-[#00ffa3]/20 flex items-center justify-center text-2xl text-[#00ffa3]">
          <Activity size={24} className="animate-pulse" />
        </div>
        <div>
          <span className="text-[10px] font-black text-[#00ffa3] tracking-widest uppercase">FC MOIM ANALYTICS CABINET</span>
          <h2 className="text-xl font-black text-white tracking-tight">클럽 정밀 상성 분석실 (Chemistry & Match stats)</h2>
        </div>
      </div>

      {/* 2. 메인 분석 보드 */}
      <div className="grid grid-cols-2 gap-6 relative z-10">
        
        {/* Left Column: 경기장 승률 분석 */}
        <div className="rounded-3xl border border-[#25283e] bg-[#141624]/60 p-5 shadow-lg backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black tracking-wider text-gray-400 uppercase flex items-center gap-2 mb-3">
              <Radio size={14} className="text-[#00ffa3]" /> 경기장별 누적 전적 & 승률 (Stadium Win Rate)
            </h3>
            <p className="text-[10px] text-gray-500 font-bold mb-4">
              매치 위치에 따른 승률 변화 및 핏치 친화도 데이터입니다.
            </p>
          </div>

          <div className="space-y-4">
            {stadiums.map((st, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between items-baseline text-xs font-bold text-gray-300">
                  <span>{st.name}</span>
                  <span className="font-mono text-[11px] text-gray-400">
                    {st.wins}승 {st.draws}무 {st.losses}패 (승률 <strong className="text-white">{st.rate}%</strong>)
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                  <div className={`h-full rounded-full ${st.color}`} style={{ width: `${st.rate || 5}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: 선수단 상성 케미스트리 */}
        <div className="rounded-3xl border border-[#25283e] bg-[#141624]/60 p-5 shadow-lg backdrop-blur-md space-y-5">
          {/* Best Chemistry */}
          <div className="space-y-3">
            <h3 className="text-xs font-black tracking-wider text-[#00ffa3] uppercase flex items-center gap-1.5">
              🔥 최강 시너지 듀오 (Best Chemistry)
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {bestChemistry.map((bc: any, i: number) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-3 flex justify-between items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-white">
                        {bc.partner.includes('&') ? bc.partner : `나 & ${bc.partner}`}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Best</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold mt-1">{bc.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-black text-[#00ffa3] font-mono">{bc.rate}% 승률</p>
                    <p className="text-[9px] font-mono text-gray-500 font-bold mt-0.5">{bc.stats}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Chemistry */}
          <div className="space-y-3">
            <h3 className="text-xs font-black tracking-wider text-red-400 uppercase flex items-center gap-1.5">
              ⚠️ 상성 보완 조합 (Chemistry Warning)
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {worstChemistry.map((wc: any, i: number) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-3 flex justify-between items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-white">
                        {wc.partner.includes('&') ? wc.partner : `나 & ${wc.partner}`}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">Warning</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold mt-1">{wc.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-black text-red-400 font-mono">{wc.rate}% 승률</p>
                    <p className="text-[9px] font-mono text-gray-500 font-bold mt-0.5">{wc.stats}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 3. 선수별 통합 전적 현황판 (Player Match Matrix & Stadium Insights) */}
      <div className="rounded-3xl border border-[#25283e] bg-[#141624]/60 p-5 shadow-lg backdrop-blur-md relative z-10 animate-fadeIn space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <h3 className="text-xs font-black tracking-wider text-gray-400 uppercase flex items-center gap-2">
            <LayoutGrid size={14} className="text-[#00ffa3]" />
            선수별 통합 전적 현황판 (Player Match Matrix & Stadium Insights)
          </h3>
          <span className="font-mono text-[9px] font-black text-[#00ffa3] bg-[#00ffa3]/10 border border-[#00ffa3]/20 px-2 py-0.5 rounded">
            경기장 상성 연동 완료
          </span>
        </div>

        {isWorking ? (
          <div className="py-16 text-center text-xs font-bold text-gray-500 flex flex-col items-center justify-center gap-2">
            <LoaderCircle size={20} className="animate-spin text-[#00ffa3]" />
            <span>선수단 전적 매트릭스를 로드 중...</span>
          </div>
        ) : matches.length > 0 ? (
          <div className="overflow-x-auto no-scrollbar rounded-2xl border border-white/5 bg-black/25">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="bg-white/5 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-white/5">
                  <th className="py-3 px-3 text-left font-extrabold text-[10px] min-w-[80px]">구분</th>
                  
                  {/* 경기별 날짜 및 경기장 명칭 헤더 */}
                  {matches.map((match) => (
                    <th key={match.id} className="py-2.5 px-2 border-l border-white/5 min-w-[75px]">
                      <div className="text-[10px] font-black text-white font-mono">{formatHeaderDate(match.date)}</div>
                      <div className="text-[8px] font-extrabold text-[#00ffa3] mt-0.5 tracking-tighter truncate max-w-[70px] mx-auto" title={match.location}>
                        {shrinkLocation(match.location)}
                      </div>
                    </th>
                  ))}
                  
                  {/* 누적 승무패 헤더 */}
                  <th className="py-3 px-3.5 border-l border-white/10 text-emerald-400 font-bold min-w-[45px]">승</th>
                  <th className="py-3 px-3.5 border-l border-white/5 text-red-400 font-bold min-w-[45px]">패</th>
                  <th className="py-3 px-3.5 border-l border-white/5 text-[#00ffa3] font-black min-w-[55px]">승률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-white">
                {rows.map((player) => {
                  const mStats = playerMatrixStats[player.membershipId] || { wins: 0, losses: 0, draws: 0, winRate: 0 };
                  
                  return (
                    <tr key={player.membershipId} className="hover:bg-white/5 transition-colors">
                      {/* 구분 (선수 이름) */}
                      <td className="py-2.5 px-3 text-left font-black text-white flex items-center gap-2">
                        <Image
                          src={player.photoUrl || getFallbackAvatar(player.nickname)}
                          alt=""
                          width={20}
                          height={20}
                          className="h-5 w-5 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                          unoptimized
                        />
                        <span className="truncate max-w-[65px]">{player.nickname}</span>
                      </td>

                      {/* 각 경기별 승무패 결과 배지 */}
                      {matches.map((match) => {
                        const isWin = (match.ourScore ?? 0) > (match.oppScore ?? 0);
                        const isDraw = (match.ourScore ?? 0) === (match.oppScore ?? 0);
                        const lineup = matchLineupsMap[match.id] ?? [];
                        const entry = lineup.find((e) => e.membershipId === player.membershipId);

                        let resultLabel = '-';
                        let hasAttended = !!entry;
                        let cellClass = 'bg-white/5 text-gray-400 border border-white/10';

                        if (entry) {
                          if (isDraw) {
                            resultLabel = '무';
                            cellClass = 'bg-white/5 text-gray-400 border border-white/10';
                          } else {
                            const isTeam1 = entry.teamNumber === 1;
                            const isPlayerWin = isWin ? isTeam1 : !isTeam1;
                            resultLabel = isPlayerWin ? '승' : '패';
                            cellClass = isPlayerWin
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20';
                          }
                        }

                        return (
                          <td key={match.id} className="py-2.5 px-2 border-l border-white/5">
                            {hasAttended ? (
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black ${cellClass}`}>
                                {resultLabel}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-700">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* 누적 기록 */}
                      <td className="py-2.5 px-3.5 border-l border-white/10 text-emerald-400 font-mono font-bold">{mStats.wins}</td>
                      <td className="py-2.5 px-3.5 border-l border-white/5 text-red-400 font-mono font-bold">{mStats.losses}</td>
                      <td className="py-2.5 px-3.5 border-l border-white/5 text-[#00ffa3] font-mono font-black">{mStats.winRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs font-bold text-gray-500 rounded-2xl border border-dashed border-white/5 bg-black/20">
            아직 완료 보고된 공식 매치 기록이 없습니다.
          </div>
        )}
      </div>

    </div>
  );
}
