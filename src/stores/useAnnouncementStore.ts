'use client';

import { create } from 'zustand';
import {
  createAnnouncement,
  fetchAnnouncements,
  type Announcement,
  type CreateAnnouncementRequest,
} from './announcementClient';

type AnnouncementsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AnnouncementState {
  announcements: Announcement[];
  announcementsStatus: AnnouncementsStatus;
  announcementsError: string | null;
  loadAnnouncements: (clubId?: string) => Promise<void>;
  createAnnouncement: (input: CreateAnnouncementRequest) => Promise<Announcement>;
}

export const useAnnouncementStore = create<AnnouncementState>((set) => ({
  announcements: [],
  announcementsStatus: 'idle',
  announcementsError: null,
  loadAnnouncements: async (clubId) => {
    set({ announcementsStatus: 'loading', announcementsError: null });

    try {
      const announcements = await fetchAnnouncements(clubId);
      set({ announcements, announcementsStatus: 'ready', announcementsError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : '공지사항을 불러오지 못했어요.';
      set({ announcementsStatus: 'error', announcementsError: message });
      throw error;
    }
  },
  createAnnouncement: async (input) => {
    const announcement = await createAnnouncement(input);
    set((state) => ({
      announcements: [announcement, ...state.announcements]
        .sort((left, right) => Number(right.isPinned) - Number(left.isPinned) || right.createdAt.localeCompare(left.createdAt)),
      announcementsStatus: 'ready',
      announcementsError: null,
    }));
    return announcement;
  },
}));
