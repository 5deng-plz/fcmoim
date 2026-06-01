'use client';

import { create } from 'zustand';
import {
  fetchRecordsSeasonSummary,
  type RecordsSeasonSummaryResponse,
} from './recordsClient';

type RecordsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface RecordsState {
  records: RecordsSeasonSummaryResponse | null;
  recordsStatus: RecordsStatus;
  recordsError: string | null;
  loadRecords: (clubId?: string) => Promise<void>;
}

export const useRecordsStore = create<RecordsState>((set) => ({
  records: null,
  recordsStatus: 'idle',
  recordsError: null,
  loadRecords: async (clubId) => {
    set({ recordsStatus: 'loading', recordsError: null });

    try {
      const records = await fetchRecordsSeasonSummary(clubId);
      set({ records, recordsStatus: 'ready', recordsError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : '시즌 기록을 불러오지 못했어요.';
      set({ recordsStatus: 'error', recordsError: message });
      throw error;
    }
  },
}));
