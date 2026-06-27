'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAppStore } from '@/stores/useAppStore';
import { useRecordsStore } from '@/stores/useRecordsStore';
import { useAnnouncementStore } from '@/stores/useAnnouncementStore';
import { 
  Trophy, Flame, Handshake, X, Users, Award,
  MessageCircle, Radio, Activity, LayoutGrid
} from 'lucide-react';
import { fetchFeedPosts, type FeedPost } from '@/stores/feedClient';
import EventComments from '@/components/features/EventComments';
import { getFallbackAvatar } from '@/components/ui/fallbackAvatars';

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
            {activeTab === 'records' && `🏆 클럽 명예의 전당 & 시즌 데이터 분석 (${recordsSubTab === 'season' ? '랭킹' : '커뮤니티'})`}
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
        {activeTab === 'records' && <DesktopRecordsPanel />}
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
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: '총 경기수', value: `${summary.totalMatches || 0} 경기`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
              { label: '최다 득점왕', value: summary.topGoals?.nickname || '-', detail: `${summary.topGoals?.value || 0} 골`, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-400/10' },
              { label: '도움왕', value: summary.topAssists?.nickname || '-', detail: `${summary.topAssists?.value || 0} 도움`, icon: Handshake, color: 'text-[#00ffa3]', bg: 'bg-[#00ffa3]/10' },
              { label: '출장왕', value: summary.topAppearance?.nickname || '-', detail: `${summary.topAppearance?.value || 0} 경기`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3.5 bg-white/5 border border-white/5 rounded-2xl p-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>
                  <item.icon size={18} className={item.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{item.label}</p>
                  <div className="flex justify-between items-baseline mt-0.5">
                    <p className="text-sm font-black text-white truncate">{item.value}</p>
                    {item.detail && <span className="text-xs font-mono font-black text-[#00ffa3]">{item.detail}</span>}
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
function DesktopLockerRoomPanel() {
  const { records, recordsStatus, loadRecords } = useRecordsStore();
  const { activeClubId, teamName, teamLogoUrl } = useAppStore();
  const rows = records?.rankingRows ?? [];

  useEffect(() => {
    if (recordsStatus === 'idle') {
      void loadRecords(activeClubId);
    }
  }, [activeClubId, loadRecords, recordsStatus]);

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
    </div>
  );
}
