'use client';

import { create } from 'zustand';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
  type Announcement,
  type CreateAnnouncementRequest,
  type UpdateAnnouncementRequest,
} from './announcementClient';

type AnnouncementsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AnnouncementState {
  announcements: Announcement[];
  announcementsStatus: AnnouncementsStatus;
  announcementsError: string | null;
  loadAnnouncements: (clubId?: string) => Promise<void>;
  createAnnouncement: (input: CreateAnnouncementRequest) => Promise<Announcement>;
  updateAnnouncement: (input: UpdateAnnouncementRequest) => Promise<Announcement>;
  deleteAnnouncement: (announcementId: string) => Promise<void>;
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
  updateAnnouncement: async (input) => {
    const announcement = await updateAnnouncement(input);
    set((state) => ({
      announcements: state.announcements
        .map((candidate) => candidate.id === announcement.id ? announcement : candidate)
        .sort((left, right) => Number(right.isPinned) - Number(left.isPinned) || right.createdAt.localeCompare(left.createdAt)),
      announcementsStatus: 'ready',
      announcementsError: null,
    }));
    return announcement;
  },
  deleteAnnouncement: async (announcementId) => {
    await deleteAnnouncement(announcementId);
    set((state) => ({
      announcements: state.announcements.filter((announcement) => announcement.id !== announcementId),
      announcementsStatus: 'ready',
      announcementsError: null,
    }));
  },
}));
