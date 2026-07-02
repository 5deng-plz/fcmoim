'use client';

import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Megaphone, Pin, MessageSquare, Image as ImageIcon, Pencil, Trash2, X, Plus, MessageCircle, Video, Send, Heart, LayoutGrid, LayoutList, Play, Upload, LoaderCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useAnnouncementStore } from '@/stores/useAnnouncementStore';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Announcement } from '@/stores/announcementClient';
import { useAppStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useToastStore';
import EventComments from '@/components/features/EventComments';
import {
  createFeedPost,
  deleteFeedPost,
  fetchFeedPosts,
  toggleFeedReaction,
  type FeedContentType,
  type FeedPost,
  type FeedReactionType,
} from '@/stores/feedClient';

const filterOptions = [
  { key: 'all' as const, label: '전체', Icon: MessageSquare },
  { key: 'notice' as const, label: '공지', Icon: Megaphone },
  { key: 'text' as const, label: '일반', Icon: MessageSquare },
  { key: 'media' as const, label: '미디어', Icon: ImageIcon },
] as const;

type FeedFilterType = (typeof filterOptions)[number]['key'];

export default function CommunityPage({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  hideHeaderTabs = false,
}: {
  activeTab?: 'announcements' | 'board' | 'gallery';
  setActiveTab?: (tab: 'announcements' | 'board' | 'gallery') => void;
  hideHeaderTabs?: boolean;
}) {
  const { activeClubId, userRole, setFocusedPostId } = useAppStore();
  const { memberProfile } = useAuthStore();
  const { showToast } = useToastStore();
  const authorName = memberProfile?.name || '나';

  const {
    announcements,
    announcementsStatus,
    announcementsError,
    loadAnnouncements,
    updateAnnouncement,
    deleteAnnouncement,
  } = useAnnouncementStore();

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedStatus, setFeedStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [activePostDetail, setActivePostDetail] = useState<FeedPost | null>(null);

  // Convert backward compatibility activeTab to filter type
  const initialFilter = useMemo(() => {
    if (propActiveTab === 'announcements') return 'notice';
    if (propActiveTab === 'gallery') return 'media';
    return 'all';
  }, [propActiveTab]);

  const [filter, setFilter] = useState<FeedFilterType>(initialFilter);

  // Sync prop changes
  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPinned, setEditPinned] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<FeedContentType>('text');
  const [composeText, setComposeText] = useState('');
  const [composeMediaUrl, setComposeMediaUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const canManageAnnouncements = userRole === 'admin' || userRole === 'operator';

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
    setEditPinned(announcement.isPinned);
  };

  const closeEditModal = () => {
    if (isSavingEdit) return;
    setEditingAnnouncement(null);
    setEditTitle('');
    setEditContent('');
    setEditPinned(false);
  };

  const handleSaveEdit = async () => {
    if (!editingAnnouncement || !editTitle.trim() || !editContent.trim()) return;

    setIsSavingEdit(true);
    try {
      await updateAnnouncement({
        announcementId: editingAnnouncement.id,
        title: editTitle.trim(),
        content: editContent.trim(),
        isPinned: editPinned,
      });
      showToast('공지사항을 수정했어요.');
      setEditingAnnouncement(null);
      setEditTitle('');
      setEditContent('');
      setEditPinned(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '공지사항을 수정하지 못했어요.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    if (confirmingDeleteId !== announcement.id) {
      setConfirmingDeleteId(announcement.id);
      return;
    }

    setDeletingId(announcement.id);
    try {
      await deleteAnnouncement(announcement.id);
      setConfirmingDeleteId(null);
      showToast('공지사항을 삭제했어요.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '공지사항을 삭제하지 못했어요.');
    } finally {
      setDeletingId(null);
    }
  };

  const loadFeed = async () => {
    setFeedStatus('loading');
    try {
      const posts = await fetchFeedPosts({ clubId: activeClubId });
      setFeedPosts(posts);
      setFeedStatus('ready');
    } catch (error) {
      setFeedStatus('error');
      showToast(error instanceof Error ? error.message : '피드를 불러오지 못했어요.');
    }
  };

  // Load both Announcements and Feed Posts on mount
  useEffect(() => {
    if (!activeClubId) return;

    void loadAnnouncements(activeClubId).catch((error) => {
      showToast(error instanceof Error ? error.message : '공지사항을 불러오지 못했어요.');
    });
    void loadFeed();
  }, [activeClubId]);

  const handleCreatePost = async () => {
    if (isPosting) return;
    setIsPosting(true);
    try {
      await createFeedPost({
        clubId: activeClubId,
        contentType: composeType,
        textContent: composeText,
        mediaUrl: composeMediaUrl,
      });
      setComposeText('');
      setComposeMediaUrl('');
      setComposeType('text');
      setIsComposeOpen(false);
      await loadFeed();
      showToast('피드를 등록했어요.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '피드를 등록하지 못했어요.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleCancelCompose = () => {
    if (isPosting) return;
    setIsComposeOpen(false);
    setComposeText('');
    setComposeMediaUrl('');
    setComposeType('text');
  };

  const handleComposeTypeChange = (type: FeedContentType) => {
    setComposeType(type);
    if (type === 'text') {
      setComposeMediaUrl('');
    }
  };

  const handleReaction = async (post: FeedPost, reactionType: FeedReactionType) => {
    try {
      const selected = post.myReactions.includes(reactionType);
      setFeedPosts((posts) =>
        posts.map((candidate) => {
          if (candidate.id !== post.id) return candidate;

          const myReactions = selected
            ? candidate.myReactions.filter((r) => r !== reactionType)
            : [...candidate.myReactions, reactionType];

          const countDiff = selected ? -1 : 1;
          const reactionCounts = {
            ...candidate.reactionCounts,
            [reactionType]: Math.max(0, (candidate.reactionCounts[reactionType] ?? 0) + countDiff),
          };

          return { ...candidate, myReactions, reactionCounts };
        })
      );

      await toggleFeedReaction({ clubId: activeClubId, postId: post.id, reactionType });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '리액션을 저장하지 못했어요.');
    }
  };

  const handleDeletePost = async (post: FeedPost) => {
    try {
      await deleteFeedPost({ clubId: activeClubId, postId: post.id });
      setFeedPosts((posts) => posts.filter((candidate) => candidate.id !== post.id));
      showToast('피드를 삭제했어요.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '피드를 삭제하지 못했어요.');
    }
  };

  const updateFeedPostCommentCount = (postId: string, count: number) => {
    setFeedPosts((posts) =>
      posts.map((post) => (post.id === postId ? { ...post, commentCount: count } : post))
    );
  };

  // Merge announcements and posts, filter [SYSTEM_SEASON_CHAT]
  const unifiedItems = useMemo(() => {
    const list: Array<
      | { type: 'announcement'; id: string; isPinned: boolean; createdAt: string; data: Announcement }
      | { type: 'post'; id: string; isPinned: boolean; createdAt: string; data: FeedPost }
    > = [];

    (Array.isArray(announcements) ? announcements : []).forEach((ann) => {
      list.push({
        type: 'announcement',
        id: ann.id,
        isPinned: ann.isPinned,
        createdAt: ann.createdAt,
        data: ann,
      });
    });

    (Array.isArray(feedPosts) ? feedPosts : [])
      .filter((post) => !post.textContent?.startsWith('[SYSTEM_SEASON_CHAT]'))
      .forEach((post) => {
        list.push({
          type: 'post',
          id: post.id,
          isPinned: false,
          createdAt: post.createdAt,
          data: post,
        });
      });

    // Pinned notices first, then sorted by date descending
    const pinned = list.filter((item) => item.isPinned).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const unpinned = list.filter((item) => !item.isPinned).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { pinned, unpinned };
  }, [announcements, feedPosts]);

  const filteredPinned = useMemo(() => {
    return unifiedItems.pinned;
  }, [unifiedItems.pinned]);

  const filteredUnpinned = useMemo(() => {
    return unifiedItems.unpinned;
  }, [unifiedItems.unpinned]);

  const handleChipClick = (key: FeedFilterType) => {
    setFilter(key);
    // Propagate changes if callbacks provided
    if (propSetActiveTab) {
      if (key === 'notice') propSetActiveTab('announcements');
      else if (key === 'media') propSetActiveTab('gallery');
      else propSetActiveTab('board');
    }
  };

  const isTimelineLoading = announcementsStatus === 'loading' || feedStatus === 'loading';
  const isTimelineError = announcementsStatus === 'error' || feedStatus === 'error';
  const hasNoItems = filteredPinned.length === 0 && filteredUnpinned.length === 0;

  // Memoize unpinned posts specifically for grid view
  const filteredUnpinnedPosts = useMemo(() => {
    return filteredUnpinned
      .filter((item) => item.type === 'post')
      .map((item) => item.data as FeedPost);
  }, [filteredUnpinned]);

  return (
    <div className={`space-y-4 animate-fadeIn pb-20 ${hideHeaderTabs ? '' : '-mx-4 -mt-4'}`}>
      <main className="px-4 space-y-3">
        {/* Write Button & Composer */}
        <div className="space-y-3">
          <FeedHeader
            title="커뮤니티 피드"
            icon={<MessageSquare size={18} />}
            onCompose={() => setIsComposeOpen((open) => !open)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          {isComposeOpen && (
            <FeedComposer
              composeType={composeType}
              composeText={composeText}
              composeMediaUrl={composeMediaUrl}
              isPosting={isPosting}
              onComposeTypeChange={handleComposeTypeChange}
              onComposeTextChange={setComposeText}
              onComposeMediaUrlChange={setComposeMediaUrl}
              onCreatePost={handleCreatePost}
              onCancelCompose={handleCancelCompose}
              authorName={authorName}
            />
          )}
        </div>

        {isTimelineLoading ? (
          <div className="rounded-xl border border-border bg-surface-card p-6 text-center text-xs font-bold text-tertiary">
            타임라인을 불러오는 중입니다...
          </div>
        ) : null}

        {isTimelineError ? (
          <div role="alert" className="rounded-xl border border-feedback-error-border bg-feedback-error-bg p-4 text-xs font-bold text-feedback-error">
            타임라인 로드에 실패했습니다. 네트워크 상태를 확인해주세요.
          </div>
        ) : null}

        {feedStatus === 'ready' && announcementsStatus === 'ready' && hasNoItems && !isTimelineLoading ? (
          <div className="rounded-xl border border-border bg-surface-card p-6 text-center text-xs font-bold text-tertiary">
            해당 카테고리에 등록된 피드가 없습니다.
          </div>
        ) : null}

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-1.5 lg:gap-2.5">
            {filteredUnpinnedPosts.map((post) => (
              <FeedGridItem
                key={post.id}
                post={post}
                onClick={() => setActivePostDetail(post)}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Pinned Announcements Render */}
            {filteredPinned.map((item) => {
              const ann = item.data as Announcement;
              const isExpanded = expandedId === ann.id;
              return (
                <article
                  key={ann.id}
                  onClick={() => {
                    if (window.innerWidth >= 1024) {
                      setFocusedPostId(ann.id);
                    }
                  }}
                  className="overflow-hidden rounded-2xl border-2 border-highlight-rose bg-surface-card shadow-md transition-all duration-200 cursor-pointer lg:hover:border-highlight-rose/80"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      if (window.innerWidth >= 1024) {
                        e.stopPropagation();
                        setFocusedPostId(ann.id);
                      } else {
                        setExpandedId(isExpanded ? null : ann.id);
                      }
                    }}
                    aria-expanded={isExpanded}
                    aria-controls={`announcement-${ann.id}`}
                    className="flex w-full items-center gap-3 p-4 text-left hover:shadow-md active:scale-[0.98] transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-highlight-rose-bg text-highlight-rose">
                      <Megaphone size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Pin size={12} className="text-highlight-rose shrink-0" />
                        <p className="text-sm font-black text-primary truncate">
                          {ann.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-tertiary mt-0.5 font-bold">
                        중요 공지사항 · {formatRelativeDate(ann.createdAt)}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-tertiary lg:hidden" /> : <ChevronDown size={18} className="text-tertiary lg:hidden" />}
                  </button>

                  {isExpanded && (
                    <div id={`announcement-${ann.id}`} className="border-t border-border px-4 py-3 lg:hidden" onClick={(e) => e.stopPropagation()}>
                      <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-secondary">
                        {ann.content}
                      </p>
                      {canManageAnnouncements && (
                        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                          {confirmingDeleteId === ann.id && (
                            <button
                              type="button"
                              disabled={deletingId === ann.id}
                              onClick={() => setConfirmingDeleteId(null)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-bg text-secondary transition-all hover:bg-surface-hover active:scale-95 disabled:opacity-50"
                            >
                              <X size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={deletingId === ann.id}
                            onClick={() => openEditModal(ann)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-bg text-secondary transition-all hover:bg-surface-hover active:scale-95 disabled:opacity-50"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === ann.id}
                            onClick={() => void handleDelete(ann)}
                            className={`flex h-8 items-center justify-center rounded-lg border px-2 text-xs font-black transition-all active:scale-95 disabled:opacity-50 ${
                              confirmingDeleteId === ann.id
                                ? 'border-feedback-error-border bg-feedback-error-bg text-feedback-error'
                                : 'border-border bg-surface-bg text-secondary'
                            }`}
                          >
                            {confirmingDeleteId === ann.id ? '삭제 확인' : <Trash2 size={15} />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {/* Regular Items (Unified Feed Timeline) */}
            <div className="space-y-3.5">
              {filteredUnpinned.map((item) => {
                if (item.type === 'announcement') {
                  const ann = item.data;
                  const isExpanded = expandedId === ann.id;
                  return (
                    <article
                      key={ann.id}
                      onClick={() => {
                        if (window.innerWidth >= 1024) {
                          setFocusedPostId(ann.id);
                        }
                      }}
                      className="overflow-hidden rounded-2xl border border-border bg-surface-card shadow-sm transition-all duration-200 cursor-pointer lg:hover:border-brand-primary"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          if (window.innerWidth >= 1024) {
                            e.stopPropagation();
                            setFocusedPostId(ann.id);
                          } else {
                            setExpandedId(isExpanded ? null : ann.id);
                          }
                        }}
                        aria-expanded={isExpanded}
                        className="flex w-full items-center gap-3 p-4 text-left hover:shadow-md active:scale-[0.98] transition-all duration-200"
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-surface-bg text-secondary">
                          <Megaphone size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-primary truncate">
                            {ann.title}
                          </p>
                          <p className="text-[11px] text-tertiary mt-0.5 font-bold">
                            공지사항 · {formatRelativeDate(ann.createdAt)}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="text-tertiary lg:hidden" /> : <ChevronDown size={18} className="text-tertiary lg:hidden" />}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-4 py-3 lg:hidden" onClick={(e) => e.stopPropagation()}>
                          <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-secondary">
                            {ann.content}
                          </p>
                          {canManageAnnouncements && (
                            <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                              {confirmingDeleteId === ann.id && (
                                <button
                                  type="button"
                                  disabled={deletingId === ann.id}
                                  onClick={() => setConfirmingDeleteId(null)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-bg text-secondary transition-all hover:bg-surface-hover active:scale-95 disabled:opacity-50"
                                >
                                  <X size={15} />
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={deletingId === ann.id}
                                onClick={() => openEditModal(ann)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-bg text-secondary transition-all hover:bg-surface-hover active:scale-95 disabled:opacity-50"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === ann.id}
                                onClick={() => void handleDelete(ann)}
                                className={`flex h-8 items-center justify-center rounded-lg border px-2 text-xs font-black transition-all active:scale-95 disabled:opacity-50 ${
                                  confirmingDeleteId === ann.id
                                    ? 'border-feedback-error-border bg-feedback-error-bg text-feedback-error'
                                    : 'border-border bg-surface-bg text-secondary'
                                }`}
                              >
                                {confirmingDeleteId === ann.id ? '삭제 확인' : <Trash2 size={15} />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                }

                // Render normal feed post card
                const post = item.data;
                return (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    onReaction={handleReaction}
                    onDelete={handleDeletePost}
                    commentsOpen={commentsPostId === post.id}
                    setCommentsOpen={(open) => setCommentsPostId(open ? post.id : null)}
                    onCommentCountChange={(count) => updateFeedPostCommentCount(post.id, count)}
                    clubId={activeClubId}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Edit Announcement Modal */}
      <Modal title="공지 수정" isOpen={editingAnnouncement !== null} onClose={closeEditModal}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-gray-500">제목</span>
            <input
              type="text"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-gray-500">본문</span>
            <textarea
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              rows={5}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-500 focus:outline-none"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={editPinned}
              onChange={(event) => setEditPinned(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm font-bold text-gray-700">상단 고정</span>
          </label>
          <button
            type="button"
            disabled={!editTitle.trim() || !editContent.trim() || isSavingEdit}
            onClick={() => void handleSaveEdit()}
            className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition-all duration-150 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isSavingEdit ? '수정 중' : '공지 수정하기'}
          </button>
        </div>
      </Modal>

      {/* Grid Detail Post Modal */}
      {activePostDetail && (
        <Modal
          title="게시물 상세"
          isOpen={activePostDetail !== null}
          onClose={() => setActivePostDetail(null)}
        >
          <div className="-mx-4 -my-4 max-h-[85vh] overflow-y-auto">
            <FeedPostCard
              post={activePostDetail}
              onReaction={handleReaction}
              onDelete={(p) => {
                void handleDeletePost(p);
                setActivePostDetail(null);
              }}
              commentsOpen={true}
              setCommentsOpen={() => {}}
              onCommentCountChange={(count) => {
                updateFeedPostCommentCount(activePostDetail.id, count);
                setActivePostDetail({ ...activePostDetail, commentCount: count });
              }}
              clubId={activeClubId}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function FeedHeader({
  title,
  icon,
  onCompose,
  viewMode,
  onViewModeChange,
}: {
  title: string;
  icon: ReactNode;
  onCompose: () => void;
  viewMode: 'feed' | 'grid';
  onViewModeChange: (mode: 'feed' | 'grid') => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-card px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-black text-primary">
        <span className="text-social-like">{icon}</span>
        {title}
      </h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onViewModeChange('feed')}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            viewMode === 'feed'
              ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
              : 'text-tertiary hover:text-secondary border border-transparent'
          }`}
          aria-label="피드 뷰"
        >
          <LayoutList size={15} />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('grid')}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            viewMode === 'grid'
              ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
              : 'text-tertiary hover:text-secondary border border-transparent'
          }`}
          aria-label="그리드 뷰"
        >
          <LayoutGrid size={15} />
        </button>
        <button
          type="button"
          onClick={onCompose}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-action-primary text-white transition-all hover:brightness-110 active:scale-95 cursor-pointer"
          aria-label={`${title} 작성`}
        >
          <Plus size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function FeedComposer({
  composeType,
  composeText,
  composeMediaUrl,
  isPosting,
  onComposeTypeChange,
  onComposeTextChange,
  onComposeMediaUrlChange,
  onCreatePost,
  onCancelCompose,
  authorName,
}: {
  composeType: FeedContentType;
  composeText: string;
  composeMediaUrl: string;
  isPosting: boolean;
  onComposeTypeChange: (type: FeedContentType) => void;
  onComposeTextChange: (text: string) => void;
  onComposeMediaUrlChange: (url: string) => void;
  onCreatePost: () => void;
  onCancelCompose: () => void;
  authorName: string;
}) {
  const { showToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [mediaFileName, setMediaFileName] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (composeType === 'image') {
      if (!file.type.startsWith('image/')) {
        showToast('이미지 파일만 업로드할 수 있어요.');
        return;
      }
    } else if (composeType === 'video') {
      if (!file.type.startsWith('video/')) {
        showToast('동영상 파일만 업로드할 수 있어요.');
        return;
      }
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast('동영상 파일은 최대 10MB까지만 가능해요.');
        return;
      }
    }

    setIsReadingFile(true);
    setMediaFileName(file.name);

    try {
      if (composeType === 'image') {
        const dataUrl = await createFeedImageDataUrl(file);
        onComposeMediaUrlChange(dataUrl);
      } else {
        const dataUrl = await createFeedVideoDataUrl(file);
        onComposeMediaUrlChange(dataUrl);
      }
    } catch (error) {
      console.error('[FC Moim] Media file reading failed:', error);
      showToast('미디어 파일을 읽지 못했어요.');
      setMediaFileName('');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleRemoveMedia = () => {
    onComposeMediaUrlChange('');
    setMediaFileName('');
  };

  const canSubmit = !isPosting && !isReadingFile && (
    composeType === 'text'
      ? composeText.trim().length > 0
      : composeMediaUrl.trim().length > 0
  );

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="feed-inline-composer">
      <div className="w-full max-w-[420px] bg-surface-elevated border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] max-h-[720px] animate-fadeIn">
        
        {/* Scrollable container for Form & Preview */}
        <div className="flex-1 flex flex-col p-5 overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-border/30 mb-4 shrink-0">
            <h3 className="text-sm font-black text-white">새 피드 만들기</h3>
            <button
              type="button"
              onClick={onCancelCompose}
              className="text-tertiary hover:text-secondary cursor-pointer"
              aria-label="피드 작성 닫기"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {/* Post Type Selector */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-black text-gray-400 uppercase">콘텐츠 유형</span>
              <div className="flex gap-2">
                {(['text', 'image', 'video'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onComposeTypeChange(type)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      composeType === type
                        ? 'bg-brand-primary text-black shadow-md shadow-brand-primary/20'
                        : 'bg-white/5 border border-white/10 text-tertiary hover:text-secondary'
                    }`}
                  >
                    {type === 'text' ? '글 전용' : type === 'image' ? '사진 피드' : '비디오 피드'}
                  </button>
                ))}
              </div>
            </div>

            {/* Content text */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-black text-gray-400 uppercase">설명 및 문구</span>
              <textarea
                value={composeText}
                onChange={(event) => onComposeTextChange(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder={composeType === 'text' ? '무슨 이야기를 남길까요?' : '미디어와 함께 남길 말을 적어주세요...'}
                className="w-full resize-none rounded-xl border border-border/80 bg-white/5 px-3 py-2 text-xs font-bold text-white placeholder:text-gray-500 focus:border-brand-primary/50 focus:outline-none transition-colors"
              />
              <div className="text-right text-[10px] text-gray-500 font-bold">
                {composeText.length}/500자
              </div>
            </div>

            {/* Media File Upload Area */}
            {composeType !== 'text' && (
              <div className="space-y-2">
                <span className="block text-[11px] font-black text-gray-400 uppercase">
                  {composeType === 'image' ? '사진 업로드' : '동영상 업로드'}
                </span>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={composeType === 'image' ? 'image/*' : 'video/*'}
                  className="sr-only"
                  onChange={handleFileChange}
                />

                {composeMediaUrl ? (
                  <div className="flex items-center justify-between rounded-xl border border-border/80 bg-white/5 px-3.5 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {composeType === 'image' ? (
                        <ImageIcon size={16} className="text-brand-primary shrink-0" />
                      ) : (
                        <Video size={16} className="text-brand-primary shrink-0" />
                      )}
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">
                        {mediaFileName || (composeType === 'image' ? '업로드된 사진' : '업로드된 동영상')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] font-black text-gray-400 hover:text-white bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        변경
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveMedia}
                        className="text-[10px] font-black text-result-loss hover:brightness-110 bg-result-loss/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReadingFile}
                    className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 hover:border-brand-primary/50 bg-white/5 py-6 px-4 transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isReadingFile ? (
                      <LoaderCircle size={20} className="animate-spin text-brand-primary" />
                    ) : composeType === 'image' ? (
                      <Upload size={18} className="text-gray-400" />
                    ) : (
                      <Video size={18} className="text-gray-400" />
                    )}
                    <span className="text-xs font-bold text-gray-400">
                      {isReadingFile 
                        ? '파일 읽는 중...' 
                        : composeType === 'image' 
                          ? '사진 파일 선택하기' 
                          : '동영상 파일 선택하기'}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold">
                      {composeType === 'image' ? 'JPEG, PNG 지원 (정사각 크롭)' : 'MP4, WebM 지원 (최대 10MB)'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Live Preview Panel */}
            <div className="pt-4 border-t border-border/30 flex flex-col items-center">
              <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3.5">실시간 피드 미리보기</span>
              
              <div className="w-full max-w-[260px] bg-surface-card border border-border/50 rounded-2xl overflow-hidden shadow-xl p-3 space-y-3 text-left">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-400 font-bold select-none">
                    {authorName.slice(0, 1)}
                  </div>
                  <span className="text-[10px] font-black text-white">{authorName}</span>
                </div>

                {/* Media Area Preview */}
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/30 border border-white/5 flex items-center justify-center relative">
                  {composeType === 'image' && composeMediaUrl.trim() ? (
                    <img src={composeMediaUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : composeType === 'video' && composeMediaUrl.trim() ? (
                    <video src={composeMediaUrl} muted className="w-full h-full object-cover" />
                  ) : (
                    /* Text Gradient Card Preview */
                    <div className="w-full h-full bg-gradient-to-tr from-surface-card via-brand-primary/15 to-surface-bg flex items-center justify-center p-3 text-center">
                      <p className="text-[11px] font-extrabold text-white leading-relaxed line-clamp-5 max-w-full">
                        {composeText.trim() || '내용을 작성하면 이곳에 카드뉴스로 표시됩니다.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Caption Preview */}
                {composeType !== 'text' && composeText.trim() && (
                  <p className="text-[10px] font-medium text-gray-400 line-clamp-2">
                    <strong className="text-white mr-1.5">{authorName}</strong>
                    {composeText}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Area */}
        <div className="p-4 border-t border-border/30 bg-surface-elevated flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onCancelCompose}
            className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onCreatePost}
            className="inline-flex h-9 min-w-24 items-center justify-center gap-1.5 rounded-xl bg-brand-primary text-black px-4 text-xs font-black transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-gray-500 cursor-pointer"
          >
            <Send size={13} />
            {isPosting ? '공유 중...' : '공유하기'}
          </button>
        </div>

      </div>
    </div>
  );
}

function FeedVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.6 } // 60% visibility triggers autoplay
    );

    observer.observe(video);

    return () => {
      observer.unobserve(video);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      loop
      controls
      className="w-full h-full object-cover rounded-2xl bg-black"
    />
  );
}

function FeedCaption({ authorName, content }: { authorName: string; content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldCollapse = content.length > 120;
  
  const displayText = isExpanded || !shouldCollapse 
    ? content 
    : `${content.slice(0, 120)}...`;

  return (
    <div className="text-xs font-medium leading-relaxed text-primary mb-3">
      <span className="font-extrabold text-[12px] mr-2 select-none">{authorName}</span>
      <span className="whitespace-pre-wrap">{displayText}</span>
      {shouldCollapse && !isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="text-tertiary font-bold hover:text-secondary ml-1 cursor-pointer"
        >
          더 보기
        </button>
      )}
    </div>
  );
}

function FeedGridItem({
  post,
  onClick,
}: {
  post: FeedPost;
  onClick: () => void;
}) {
  const hasMedia = !!post.mediaUrl;
  const isVideo = post.contentType === 'video';

  return (
    <div
      onClick={onClick}
      className="relative aspect-square w-full rounded-xl overflow-hidden cursor-pointer bg-surface-card border border-border/40 group hover:opacity-95 transition-all"
    >
      {hasMedia ? (
        isVideo ? (
          <div className="relative w-full h-full">
            <video src={post.mediaUrl || undefined} muted className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full z-10">
              <Play size={10} fill="currentColor" />
            </div>
          </div>
        ) : (
          <img src={post.mediaUrl || undefined} alt="" className="w-full h-full object-cover" />
        )
      ) : (
        /* Gradient card for text-only */
        <div className="w-full h-full bg-gradient-to-tr from-surface-card via-brand-primary/10 to-surface-bg flex items-center justify-center p-3 text-center">
          <p className="text-[10px] md:text-xs font-bold text-gray-300 line-clamp-4 leading-normal">
            {post.textContent}
          </p>
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-black z-10 select-none">
        <span className="flex items-center gap-1">
          <Heart size={14} fill="currentColor" /> {post.reactionCounts['up'] ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle size={14} fill="currentColor" /> {post.commentCount}
        </span>
      </div>
    </div>
  );
}

function FeedPostCard({
  post,
  onReaction,
  onDelete,
  commentsOpen,
  setCommentsOpen,
  onCommentCountChange,
  clubId,
}: {
  post: FeedPost;
  onReaction: (post: FeedPost, reactionType: FeedReactionType) => void;
  onDelete: (post: FeedPost) => void;
  commentsOpen: boolean;
  setCommentsOpen: (open: boolean) => void;
  onCommentCountChange: (count: number) => void;
  clubId: string;
}) {
  const { setFocusedPostId } = useAppStore();
  const [showHeartPop, setShowHeartPop] = useState(false);
  const lastTap = useRef(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!post.myReactions.includes('up')) {
        void onReaction(post, 'up');
      }
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 700);
    }
    lastTap.current = now;
  };

  const handleCardClick = () => {
    if (window.innerWidth >= 1024) {
      setFocusedPostId(post.id);
    }
  };

  const hasMedia = !!post.mediaUrl;

  return (
    <article
      onClick={handleCardClick}
      className="rounded-2xl border border-border bg-surface-card p-4 shadow-sm cursor-pointer lg:hover:border-brand-primary transition-all relative overflow-hidden"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400 select-none">
            {post.authorName.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-primary leading-tight">{post.authorName}</p>
            <p className="text-[10px] font-bold text-tertiary mt-0.5">{formatFeedDateTime(post.createdAt)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(post);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-feedback-error-border bg-feedback-error-bg text-feedback-error relative z-10 hover:bg-feedback-error-bg/80 cursor-pointer transition-colors"
          aria-label="피드 삭제"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>

      {/* Media or Text Gradient Card */}
      <div className="mb-3">
        {hasMedia ? (
          <div
            onClick={handleDoubleTap}
            className="relative w-full aspect-square bg-surface-bg flex items-center justify-center overflow-hidden border border-border rounded-2xl select-none"
          >
            {post.contentType === 'video' ? (
              <FeedVideo src={post.mediaUrl || ''} />
            ) : (
              <img
                src={post.mediaUrl || undefined}
                alt=""
                className="w-full h-full object-cover rounded-2xl"
              />
            )}
            {showHeartPop && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-social-like animate-heart-pop pointer-events-none z-20">
                <Heart size={64} fill="currentColor" />
              </div>
            )}
          </div>
        ) : (
          /* Q1: Gradient background for text-only posts */
          <div
            onClick={handleDoubleTap}
            className="relative w-full aspect-square bg-gradient-to-tr from-surface-card via-brand-primary/15 to-surface-bg border border-border rounded-2xl flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer overflow-hidden"
          >
            <span className="text-gray-500/10 absolute -bottom-10 -right-10 text-[180px] font-black select-none pointer-events-none">FC</span>
            <p className="text-sm md:text-base font-extrabold text-white leading-relaxed whitespace-pre-wrap max-w-full drop-shadow-md z-10 px-2">
              {post.textContent}
            </p>
            {showHeartPop && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-social-like animate-heart-pop pointer-events-none z-20">
                <Heart size={64} fill="currentColor" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="mt-3 flex items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
        <FeedReactions post={post} onReaction={onReaction} />
        <button
          type="button"
          onClick={() => {
            if (window.innerWidth >= 1024) {
              setFocusedPostId(post.id);
            } else {
              setCommentsOpen(!commentsOpen);
            }
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-bg px-2.5 py-1 text-[10px] font-black text-secondary hover:text-primary transition-colors cursor-pointer"
          aria-label={`댓글 ${post.commentCount}개`}
        >
          <MessageCircle size={13} aria-hidden="true" />
          {post.commentCount}
        </button>
      </div>

      {/* Instagram Stats (Likes & Captions) */}
      <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="text-[11px] font-extrabold text-primary">
          좋아요 {post.reactionCounts['up'] ?? 0}개
        </div>
        
        {/* Caption */}
        {hasMedia && post.textContent && (
          <FeedCaption authorName={post.authorName} content={post.textContent} />
        )}
      </div>

      {/* Inline Comments Drawer Toggle for Mobile */}
      {commentsOpen && (
        <div className="lg:hidden mt-3 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
          <EventComments
            clubId={clubId}
            targetType="feed_post"
            targetId={post.id}
            showPhase={false}
            embedded
            onCommentCountChange={onCommentCountChange}
          />
        </div>
      )}
    </article>
  );
}

function FeedReactions({
  post,
  onReaction,
}: {
  post: FeedPost;
  onReaction: (post: FeedPost, reactionType: FeedReactionType) => void;
}) {
  const liked = post.myReactions.includes('up');

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onReaction(post, 'up')}
        className={`flex items-center justify-center p-1 rounded-full hover:bg-white/5 active:scale-90 transition-all cursor-pointer ${
          liked ? 'text-social-like' : 'text-secondary hover:text-primary'
        }`}
        aria-label="좋아요"
      >
        <Heart size={18} fill={liked ? 'currentColor' : 'none'} className={liked ? 'animate-bounce' : ''} />
      </button>

      {/* Supplementary reactions (smile, check) if counts exist */}
      {(['smile', 'check'] as const).map((type) => {
        const selected = post.myReactions.includes(type);
        const count = post.reactionCounts[type] ?? 0;
        if (count === 0 && !selected) return null;

        const emoji = type === 'smile' ? '🙂' : '✅';
        return (
          <button
            key={type}
            type="button"
            onClick={() => onReaction(post, type)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black transition-all cursor-pointer ${
              selected
                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                : 'border-border bg-surface-bg text-secondary'
            }`}
          >
            <span aria-hidden="true">{emoji}</span>
            {count}
          </button>
        );
      })}
    </div>
  );
}

function FeedStatus({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-card p-4 text-center text-xs font-bold text-secondary">
      {label}
    </div>
  );
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatFeedDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${hours}:${minutes}`;
}

async function createFeedImageDataUrl(file: File) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load error'));
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context error');

    // Instagram square size (e.g., 800x800)
    const size = 800;
    canvas.width = size;
    canvas.height = size;

    const minDim = Math.min(image.width, image.height);
    const sx = (image.width - minDim) / 2;
    const sy = (image.height - minDim) / 2;

    context.drawImage(image, sx, sy, minDim, minDim, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function createFeedVideoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(new Error('Video read error'));
    reader.readAsDataURL(file);
  });
}
