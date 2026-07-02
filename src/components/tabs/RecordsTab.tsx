'use client';

import { useEffect } from 'react';
import { Megaphone, MessageSquare } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import CommunityPage from '@/components/tabs/CommunityPage';
import SeasonChatRoom from '@/components/features/SeasonChatRoom';

export default function RecordsTab() {
  const { activeClubId, recordsSubTab, setRecordsSubTab } = useAppStore();

  const subTabs = [
    { key: 'chat' as const, label: 'Chat', Icon: MessageSquare },
    { key: 'board' as const, label: '게시판', Icon: Megaphone },
  ] as const;

  // Adjust active tab if it's season/stats or invalid
  useEffect(() => {
    if (recordsSubTab === 'season' || recordsSubTab === 'stats') {
      setRecordsSubTab('chat');
    } else if (recordsSubTab === 'announcements' || recordsSubTab === 'gallery') {
      setRecordsSubTab('board');
    }
  }, [recordsSubTab, setRecordsSubTab]);

  // Scroll Lock for Chat tab to prevent dual vertical scrollbars
  useEffect(() => {
    if (recordsSubTab === 'chat') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [recordsSubTab]);

  const containerClass = recordsSubTab === 'chat'
    ? "flex flex-col h-full overflow-hidden animate-fadeIn"
    : "space-y-4 animate-fadeIn pb-20 p-4";

  return (
    <div className={containerClass}>
      {/* Sub Tab Navigation */}
      <div
        className={`flex gap-1 border-b border-border bg-surface-card px-4 py-2 sticky top-0 z-10 no-scrollbar ${
          recordsSubTab === 'chat' ? 'mx-0 mt-0 mb-0' : '-mx-4 -mt-4 mb-4'
        }`}
        style={{ overflowX: 'auto' }}
        data-exempt=":// design-exempt(reason: legacy layout overflow, expires: 2026-12-31)"
      >
        {subTabs.map((tab) => {
          const isActive = recordsSubTab === tab.key;
          const TabIcon = tab.Icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRecordsSubTab(tab.key)}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-b-2 border-brand-primary font-bold text-brand-primary'
                  : 'font-medium text-tertiary hover:text-secondary'
              }`}
            >
              <TabIcon size={14} className={isActive ? 'text-brand-primary' : 'text-tertiary'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {recordsSubTab === 'chat' ? (
        <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
          <SeasonChatRoom clubId={activeClubId} hideHeader={true} flatLayout={true} />
        </div>
      ) : (
        /* Unified board subtab (Announcements, Board, Gallery integrated) */
        <CommunityPage
          activeTab="board"
          setActiveTab={() => setRecordsSubTab('board')}
          hideHeaderTabs={true}
        />
      )}
    </div>
  );
}
