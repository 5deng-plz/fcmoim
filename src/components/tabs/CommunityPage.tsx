'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Megaphone, Pin, MessageSquare, Image as ImageIcon, Pencil, Trash2, X, Plus, MessageCircle, Paperclip, Video, Send } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useAnnouncementStore } from '@/stores/useAnnouncementStore';
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

const communityTabs = [
  { key: 'announcements', label: '공지사항' },
  { key: 'board', label: '게시판' },
  { key: 'gallery', label: '갤러리' },
] as const;

type CommunityTab = (typeof communityTabs)[number]['key'];

export default function CommunityPage({
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  hideHeaderTabs = false,
}: {
  activeTab?: CommunityTab;
  setActiveTab?: (tab: CommunityTab) => void;
  hideHeaderTabs?: boolean;
}) {
  const { activeClubId, userRole } = useAppStore();
  const { showToast } = useToastStore();
  const {
    announcements,
    announcementsStatus,
    announcementsError,
    loadAnnouncements,
    updateAnnouncement,
    deleteAnnouncement,
  } = useAnnouncementStore();
  const [localActiveTab, setLocalActiveTab] = useState<CommunityTab>('announcements');
  const activeTab = propActiveTab ?? localActiveTab;
  const setActiveTab = propSetActiveTab ?? setLocalActiveTab;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPinned, setEditPinned] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedStatus, setFeedStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
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
      if (expandedId === announcement.id) setExpandedId(null);
      showToast('공지사항을 삭제했어요.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '공지사항을 삭제하지 못했어요.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (announcementsStatus !== 'idle') return;

    void loadAnnouncements(activeClubId).catch((error) => {
      showToast(error instanceof Error ? error.message : '공지사항을 불러오지 못했어요.');
    });
  }, [activeClubId, announcementsStatus, loadAnnouncements, showToast]);

  const loadFeed = async () => {
    setFeedStatus('loading');
    try {
      const contentType = activeTab === 'gallery' ? null : null;
      const posts = await fetchFeedPosts({ clubId: activeClubId, contentType });
      setFeedPosts(activeTab === 'gallery'
        ? posts.filter((post) => post.contentType === 'image' || post.contentType === 'video')
        : posts);
      setFeedStatus('ready');
    } catch (error) {
      setFeedStatus('error');
      showToast(error instanceof Error ? error.message : '피드를 불러오지 못했어요.');
    }
  };

  useEffect(() => {
    if (activeTab !== 'board' && activeTab !== 'gallery') return;
    void loadFeed();
  }, [activeClubId, activeTab]);

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
    if (type === 'text') setComposeMediaUrl('');
  };

  const updateFeedPostCommentCount = (postId: string, count: number) => {
    setFeedPosts((posts) => posts.map((post) => (
      post.id === postId ? { ...post, commentCount: count } : post
    )));
  };

  const handleReaction = async (post: FeedPost, reactionType: FeedReactionType) => {
    try {
      await toggleFeedReaction({ clubId: activeClubId, postId: post.id, reactionType });
      await loadFeed();
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

  return (
    <div className={`space-y-4 animate-fadeIn pb-20 ${hideHeaderTabs ? '' : '-mx-4 -mt-4'}`}>
      {!hideHeaderTabs && (
        <div className="px-4 py-2 flex gap-1 border-b border-border bg-surface-card sticky top-0 z-10">
          {communityTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = {
              announcements: Megaphone,
              board: MessageSquare,
              gallery: ImageIcon,
            }[tab.key];

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={isActive}
                className={`px-4 py-2 text-sm transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'border-b-2 border-brand-primary font-bold text-brand-primary'
                    : 'font-medium text-tertiary hover:text-secondary'
                }`}
              >
                <TabIcon size={15} className={isActive ? 'text-brand-primary' : 'text-tertiary'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <main className={hideHeaderTabs ? 'space-y-2' : 'px-4 space-y-2'}>
        {activeTab === 'board' ? (
          <FeedTimeline
            posts={feedPosts}
            status={feedStatus}
            composeOpen={isComposeOpen}
            composeType={composeType}
            composeText={composeText}
            composeMediaUrl={composeMediaUrl}
            isPosting={isPosting}
            onCompose={() => setIsComposeOpen((open) => !open)}
            onComposeTypeChange={handleComposeTypeChange}
            onComposeTextChange={setComposeText}
            onComposeMediaUrlChange={setComposeMediaUrl}
            onCreatePost={handleCreatePost}
            onCancelCompose={handleCancelCompose}
            onReaction={handleReaction}
            onDelete={handleDeletePost}
            onCommentCountChange={updateFeedPostCommentCount}
            commentsPostId={commentsPostId}
            setCommentsPostId={setCommentsPostId}
            clubId={activeClubId}
          />
        ) : null}

        {activeTab === 'gallery' ? (
          <FeedGallery
            posts={feedPosts}
            status={feedStatus}
            composeOpen={isComposeOpen}
            composeType={composeType}
            composeText={composeText}
            composeMediaUrl={composeMediaUrl}
            isPosting={isPosting}
            onCompose={() => {
              setComposeType('image');
              setIsComposeOpen((open) => !open);
            }}
            onComposeTypeChange={handleComposeTypeChange}
            onComposeTextChange={setComposeText}
            onComposeMediaUrlChange={setComposeMediaUrl}
            onCreatePost={handleCreatePost}
            onCancelCompose={handleCancelCompose}
            onReaction={handleReaction}
            onCommentCountChange={updateFeedPostCommentCount}
            commentsPostId={commentsPostId}
            setCommentsPostId={setCommentsPostId}
            clubId={activeClubId}
          />
        ) : null}

        {activeTab === 'announcements' && announcementsStatus === 'loading' ? (
          <div role="status" className="bg-surface-card rounded-xl border border-border p-4 text-xs font-bold text-secondary">
            공지사항을 불러오는 중입니다
          </div>
        ) : null}

        {activeTab === 'announcements' && announcementsStatus === 'error' && announcementsError ? (
          <div role="alert" className="rounded-xl border border-feedback-error-border bg-feedback-error-bg p-4">
            <p className="text-sm font-bold text-feedback-error">{announcementsError}</p>
          </div>
        ) : null}

        {activeTab === 'announcements' ? announcements.map((announcement) => {
          const isExpanded = expandedId === announcement.id;

          return (
            <article
              key={announcement.id}
              className="overflow-hidden rounded-xl border border-border bg-surface-card shadow-sm transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : announcement.id)}
                aria-expanded={isExpanded}
                aria-controls={`announcement-${announcement.id}`}
                className="flex w-full items-center gap-3 p-4 text-left hover:shadow-md active:scale-[0.98] transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  announcement.isPinned ? 'bg-highlight-rose-bg text-highlight-rose' : 'bg-surface-bg text-tertiary'
                }`}>
                  <Megaphone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {announcement.isPinned && <Pin size={12} className="text-highlight-rose shrink-0" />}
                    <p className="text-sm font-bold text-primary truncate">
                      {announcement.title}
                    </p>
                  </div>
                  <p className="text-[11px] text-tertiary mt-0.5">
                    운영진 · {formatRelativeDate(announcement.createdAt)}
                  </p>
                </div>
                {isExpanded ? <ChevronUp size={18} className="text-tertiary" /> : <ChevronDown size={18} className="text-tertiary" />}
              </button>

              {isExpanded ? (
                <div id={`announcement-${announcement.id}`} className="border-t border-border px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-secondary">
                    {announcement.content}
                  </p>
                  {canManageAnnouncements ? (
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                      {confirmingDeleteId === announcement.id ? (
                        <button
                          type="button"
                          disabled={deletingId === announcement.id}
                          onClick={() => setConfirmingDeleteId(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-bg text-secondary transition-all hover:bg-surface-hover active:scale-95 disabled:opacity-50"
                          aria-label="공지 삭제 취소"
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={deletingId === announcement.id}
                        onClick={() => openEditModal(announcement)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-bg text-secondary transition-all hover:bg-surface-hover active:scale-95 disabled:opacity-50"
                        aria-label={`${announcement.title} 수정`}
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === announcement.id}
                        onClick={() => void handleDelete(announcement)}
                        className={`flex h-8 items-center justify-center rounded-lg border px-2 text-xs font-black transition-all active:scale-95 disabled:opacity-50 ${
                          confirmingDeleteId === announcement.id
                            ? 'border-feedback-error-border bg-feedback-error-bg text-feedback-error'
                            : 'border-border bg-surface-bg text-secondary hover:bg-surface-hover'
                        }`}
                        aria-label={confirmingDeleteId === announcement.id ? `${announcement.title} 삭제 확인` : `${announcement.title} 삭제`}
                      >
                        {confirmingDeleteId === announcement.id ? '삭제 확인' : <Trash2 size={15} aria-hidden="true" />}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        }) : null}

        {activeTab === 'announcements' && announcementsStatus === 'ready' && announcements.length === 0 ? (
          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-card p-4 text-xs font-bold text-tertiary">
            <Megaphone size={14} className="shrink-0 opacity-80" />
            <span>등록된 공지사항이 없어요</span>
          </div>
        ) : null}
      </main>
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
    </div>
  );
}

const FEED_REACTIONS: Array<{ type: FeedReactionType; label: string; emoji: string }> = [
  { type: 'up', label: '좋아요', emoji: '👍' },
  { type: 'down', label: '별로예요', emoji: '👎' },
  { type: 'check', label: '확인', emoji: '✅' },
  { type: 'smile', label: '웃어요', emoji: '🙂' },
  { type: 'sad', label: '아쉬워요', emoji: '😢' },
];

function FeedTimeline({
  posts,
  status,
  composeOpen,
  composeType,
  composeText,
  composeMediaUrl,
  isPosting,
  onCompose,
  onComposeTypeChange,
  onComposeTextChange,
  onComposeMediaUrlChange,
  onCreatePost,
  onCancelCompose,
  onReaction,
  onDelete,
  onCommentCountChange,
  commentsPostId,
  setCommentsPostId,
  clubId,
}: {
  posts: FeedPost[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  composeOpen: boolean;
  composeType: FeedContentType;
  composeText: string;
  composeMediaUrl: string;
  isPosting: boolean;
  onCompose: () => void;
  onComposeTypeChange: (type: FeedContentType) => void;
  onComposeTextChange: (text: string) => void;
  onComposeMediaUrlChange: (url: string) => void;
  onCreatePost: () => void;
  onCancelCompose: () => void;
  onReaction: (post: FeedPost, reactionType: FeedReactionType) => void;
  onDelete: (post: FeedPost) => void;
  onCommentCountChange: (postId: string, count: number) => void;
  commentsPostId: string | null;
  setCommentsPostId: (postId: string | null) => void;
  clubId: string;
}) {
  return (
    <section className="space-y-3">
      <FeedHeader title="게시판" icon={<MessageSquare size={18} />} onCompose={onCompose} />
      {composeOpen ? (
        <FeedComposer
          composeType={composeType}
          composeText={composeText}
          composeMediaUrl={composeMediaUrl}
          isPosting={isPosting}
          onComposeTypeChange={onComposeTypeChange}
          onComposeTextChange={onComposeTextChange}
          onComposeMediaUrlChange={onComposeMediaUrlChange}
          onCreatePost={onCreatePost}
          onCancelCompose={onCancelCompose}
        />
      ) : null}
      {status === 'loading' ? <FeedStatus label="피드를 불러오는 중입니다" /> : null}
      {status === 'error' ? <FeedStatus label="피드를 불러오지 못했어요" /> : null}
      {status === 'ready' && posts.length === 0 ? <FeedStatus label="아직 피드가 없어요" /> : null}
      {posts.map((post) => (
        <FeedPostCard
          key={post.id}
          post={post}
          onReaction={onReaction}
          onDelete={onDelete}
          commentsOpen={commentsPostId === post.id}
          setCommentsOpen={(open) => setCommentsPostId(open ? post.id : null)}
          onCommentCountChange={(count) => onCommentCountChange(post.id, count)}
          clubId={clubId}
        />
      ))}
    </section>
  );
}

function FeedGallery({
  posts,
  status,
  composeOpen,
  composeType,
  composeText,
  composeMediaUrl,
  isPosting,
  onCompose,
  onComposeTypeChange,
  onComposeTextChange,
  onComposeMediaUrlChange,
  onCreatePost,
  onCancelCompose,
  onReaction,
  onCommentCountChange,
  commentsPostId,
  setCommentsPostId,
  clubId,
}: {
  posts: FeedPost[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  composeOpen: boolean;
  composeType: FeedContentType;
  composeText: string;
  composeMediaUrl: string;
  isPosting: boolean;
  onCompose: () => void;
  onComposeTypeChange: (type: FeedContentType) => void;
  onComposeTextChange: (text: string) => void;
  onComposeMediaUrlChange: (url: string) => void;
  onCreatePost: () => void;
  onCancelCompose: () => void;
  onReaction: (post: FeedPost, reactionType: FeedReactionType) => void;
  onCommentCountChange: (postId: string, count: number) => void;
  commentsPostId: string | null;
  setCommentsPostId: (postId: string | null) => void;
  clubId: string;
}) {
  return (
    <section className="space-y-3">
      <FeedHeader title="갤러리" icon={<ImageIcon size={18} />} onCompose={onCompose} />
      {composeOpen ? (
        <FeedComposer
          composeType={composeType}
          composeText={composeText}
          composeMediaUrl={composeMediaUrl}
          isPosting={isPosting}
          onComposeTypeChange={onComposeTypeChange}
          onComposeTextChange={onComposeTextChange}
          onComposeMediaUrlChange={onComposeMediaUrlChange}
          onCreatePost={onCreatePost}
          onCancelCompose={onCancelCompose}
        />
      ) : null}
      {status === 'loading' ? <FeedStatus label="갤러리를 불러오는 중입니다" /> : null}
      {status === 'error' ? <FeedStatus label="갤러리를 불러오지 못했어요" /> : null}
      {status === 'ready' && posts.length === 0 ? <FeedStatus label="아직 미디어 피드가 없어요" /> : null}
      <div className="grid grid-cols-2 gap-2">
        {posts.map((post) => (
          <div key={post.id} className="overflow-hidden rounded-xl border border-border bg-surface-card">
            <FeedMedia post={post} compact />
            <div className="p-2">
              <FeedReactions post={post} onReaction={onReaction} />
              <button
                type="button"
                onClick={() => setCommentsPostId(commentsPostId === post.id ? null : post.id)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-secondary"
                aria-label={`댓글 ${post.commentCount}개`}
              >
                <MessageCircle size={13} aria-hidden="true" />
                {post.commentCount}
              </button>
              {commentsPostId === post.id ? (
                <EventComments
                  clubId={clubId}
                  targetType="feed_post"
                  targetId={post.id}
                  showPhase={false}
                  embedded
                  onCommentCountChange={(count) => onCommentCountChange(post.id, count)}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeedHeader({ title, icon, onCompose }: { title: string; icon: ReactNode; onCompose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-card px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-black text-primary">
        <span className="text-social-like">{icon}</span>
        {title}
      </h2>
      <button
        type="button"
        onClick={onCompose}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-action-primary text-white transition-all hover:brightness-110 active:scale-95"
        aria-label={`${title} 작성`}
      >
        <Plus size={17} aria-hidden="true" />
      </button>
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
}) {
  const canSubmit = !isPosting && (
    composeType === 'text'
      ? composeText.trim().length > 0
      : composeMediaUrl.trim().length > 0
  );

  return (
    <div className="rounded-xl border border-glass-border bg-glass-bg p-3 shadow-glass-shadow backdrop-blur-md" data-testid="feed-inline-composer">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex gap-1.5" role="group" aria-label="피드 유형">
          {([
            { type: 'text' as const, label: '글', icon: <MessageSquare size={14} aria-hidden="true" /> },
            { type: 'image' as const, label: '사진', icon: <ImageIcon size={14} aria-hidden="true" /> },
            { type: 'video' as const, label: '영상', icon: <Video size={14} aria-hidden="true" /> },
          ]).map((option) => {
            const selected = composeType === option.type;

            return (
              <button
                key={option.type}
                type="button"
                onClick={() => onComposeTypeChange(option.type)}
                aria-pressed={selected}
                className={`inline-flex h-8 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-black transition-all ${
                  selected
                    ? 'border-brand-primary bg-brand-primary-bg text-brand-primary'
                    : 'border-border bg-surface-bg text-secondary'
                }`}
              >
                {option.icon}
                {option.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onCancelCompose}
          disabled={isPosting}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-bg text-secondary transition-all hover:bg-surface-hover active:scale-95 disabled:opacity-50"
          aria-label="피드 작성 닫기"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <textarea
        value={composeText}
        onChange={(event) => onComposeTextChange(event.target.value)}
        rows={2}
        maxLength={500}
        placeholder={composeType === 'text' ? '무슨 이야기를 남길까요?' : '미디어와 함께 남길 말'}
        className="w-full resize-none rounded-xl border border-border bg-surface-bg px-3 py-2 text-xs font-bold text-primary placeholder:text-tertiary focus:border-brand-primary focus:outline-none"
      />

      {composeType !== 'text' ? (
        <label className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-surface-bg px-3 py-2">
          <Paperclip size={14} className="shrink-0 text-secondary" aria-hidden="true" />
          <input
            value={composeMediaUrl}
            onChange={(event) => onComposeMediaUrlChange(event.target.value)}
            placeholder="미디어 URL"
            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-primary placeholder:text-tertiary focus:outline-none"
          />
        </label>
      ) : null}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void onCreatePost()}
          className="inline-flex h-9 min-w-20 items-center justify-center gap-1.5 rounded-xl bg-action-primary px-3 text-xs font-black text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-tertiary"
        >
          <Send size={13} aria-hidden="true" />
          {isPosting ? '등록 중' : '등록'}
        </button>
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
  return (
    <article className="rounded-xl border border-border bg-surface-card p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-primary">{post.authorName}</p>
          <p className="text-[11px] font-bold text-tertiary">{formatFeedDateTime(post.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(post)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-feedback-error-border bg-feedback-error-bg text-feedback-error"
          aria-label="피드 삭제"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
      {post.textContent ? <p className="mb-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-primary">{post.textContent}</p> : null}
      <FeedMedia post={post} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <FeedReactions post={post} onReaction={onReaction} />
        <button
          type="button"
          onClick={() => setCommentsOpen(!commentsOpen)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-bg px-2 py-1 text-[11px] font-black text-secondary"
          aria-label={`댓글 ${post.commentCount}개`}
        >
          <MessageCircle size={13} aria-hidden="true" />
          {post.commentCount}
        </button>
      </div>
      {commentsOpen ? (
        <EventComments
          clubId={clubId}
          targetType="feed_post"
          targetId={post.id}
          showPhase={false}
          embedded
          onCommentCountChange={onCommentCountChange}
        />
      ) : null}
    </article>
  );
}

function FeedMedia({ post, compact = false }: { post: FeedPost; compact?: boolean }) {
  if (!post.mediaUrl) return null;
  if (post.contentType === 'video') {
    return (
      <video
        src={post.mediaUrl}
        muted
        playsInline
        loop
        controls
        className={`${compact ? 'aspect-square' : 'max-h-[320px]'} w-full rounded-xl bg-black object-cover`}
      />
    );
  }
  return (
    <img
      src={post.mediaUrl}
      alt=""
      className={`${compact ? 'aspect-square' : 'max-h-[320px]'} w-full rounded-xl bg-surface-bg object-cover`}
    />
  );
}

function FeedReactions({ post, onReaction }: { post: FeedPost; onReaction: (post: FeedPost, reactionType: FeedReactionType) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {FEED_REACTIONS.map(({ type, label, emoji }) => {
        const selected = post.myReactions.includes(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => onReaction(post, type)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black transition-all ${
              selected
                ? 'border-social-like bg-social-like/10 text-social-like'
                : 'border-border bg-surface-bg text-secondary'
            }`}
            aria-label={label}
          >
            <span aria-hidden="true">{emoji}</span>
            {post.reactionCounts[type]}
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
