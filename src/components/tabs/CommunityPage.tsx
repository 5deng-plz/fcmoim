'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Megaphone, Pin, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { useAnnouncementStore } from '@/stores/useAnnouncementStore';
import { useAppStore } from '@/stores/useAppStore';
import { useToastStore } from '@/stores/useToastStore';

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
  const { activeClubId } = useAppStore();
  const { showToast } = useToastStore();
  const {
    announcements,
    announcementsStatus,
    announcementsError,
    loadAnnouncements,
  } = useAnnouncementStore();
  const [localActiveTab, setLocalActiveTab] = useState<CommunityTab>('announcements');
  const activeTab = propActiveTab ?? localActiveTab;
  const setActiveTab = propSetActiveTab ?? setLocalActiveTab;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (announcementsStatus !== 'idle') return;

    void loadAnnouncements(activeClubId).catch((error) => {
      showToast(error instanceof Error ? error.message : '공지사항을 불러오지 못했어요.');
    });
  }, [activeClubId, announcementsStatus, loadAnnouncements, showToast]);

  return (
    <div className={`space-y-4 animate-fadeIn pb-20 ${hideHeaderTabs ? '' : '-mx-4 -mt-4'}`}>
      {!hideHeaderTabs && (
        <div className="px-4 py-2 flex gap-1 border-b border-border bg-surface-card sticky top-0 z-10">
          {communityTabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={isActive}
                className={`px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'border-b-2 border-brand-primary font-bold text-brand-primary'
                    : 'font-medium text-tertiary hover:text-secondary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <main className={hideHeaderTabs ? 'space-y-2' : 'px-4 space-y-2'}>
        {activeTab !== 'announcements' ? (
          <div className="rounded-xl border border-highlight-purple/20 bg-highlight-purple-bg p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-highlight-purple/10 rounded-full flex items-center justify-center shrink-0 text-highlight-purple">
              {activeTab === 'board' ? <MessageSquare size={18} /> : <ImageIcon size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary">
                {activeTab === 'board' ? '게시판은' : '갤러리는'} 준비 중입니다
              </p>
              <p className="text-[11px] text-tertiary mt-0.5">
                공지사항은 바로 확인할 수 있어요.
              </p>
            </div>
          </div>
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
    </div>
  );
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
