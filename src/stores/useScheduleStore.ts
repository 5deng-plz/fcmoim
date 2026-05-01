import { create } from 'zustand';
import { appConfig } from '@/config/app.config';
import {
  createSchedulePoll,
  fetchActiveSchedulePolls,
  getSchedulePollErrorMessage,
  voteSchedulePoll,
  type CreateSchedulePollRequest,
  type SchedulePoll,
  type VoteSchedulePollRequest,
} from './schedulePollClient';
import {
  applyMockSchedulePollVote,
  createMockSchedulePoll,
  getMockActiveSchedulePolls,
} from '@/mocks/schedulePolls';

type ActivePollsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ScheduleState {
  selectedDate: number;
  activePolls: SchedulePoll[];
  activePollsStatus: ActivePollsStatus;
  activePollsError: string | null;
  setSelectedDate: (date: number) => void;
  setActivePolls: (polls: SchedulePoll[]) => void;
  loadActivePolls: (clubId?: string) => Promise<void>;
  createPoll: (input: CreateSchedulePollRequest) => Promise<SchedulePoll>;
  submitPollVote: (input: VoteSchedulePollRequest) => Promise<SchedulePoll>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  selectedDate: new Date().getDate(),
  activePolls: appConfig.useMockData ? getMockActiveSchedulePolls() : [],
  activePollsStatus: appConfig.useMockData ? 'ready' : 'idle',
  activePollsError: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  setActivePolls: (polls) => set({ activePolls: polls, activePollsStatus: 'ready', activePollsError: null }),
  loadActivePolls: async (clubId = appConfig.defaultClubId) => {
    if (appConfig.useMockData) {
      set((state) => ({
        activePolls: state.activePolls.length > 0 ? state.activePolls : getMockActiveSchedulePolls(),
        activePollsStatus: 'ready',
        activePollsError: null,
      }));
      return;
    }

    set({ activePollsStatus: 'loading', activePollsError: null });

    try {
      const activePolls = await fetchActiveSchedulePolls(clubId);
      set({ activePolls, activePollsStatus: 'ready', activePollsError: null });
    } catch (error) {
      const message = getSchedulePollErrorMessage(error, '일정 투표를 불러오지 못했어요.');
      set({ activePollsStatus: 'error', activePollsError: message });
      throw error;
    }
  },
  createPoll: async (input) => {
    if (appConfig.useMockData) {
      const poll = createMockSchedulePoll(input);
      set((state) => ({
        activePolls: upsertPoll(state.activePolls, poll),
        activePollsStatus: 'ready',
        activePollsError: null,
      }));
      return poll;
    }

    const poll = await createSchedulePoll(input);
    set((state) => ({
      activePolls: upsertPoll(state.activePolls, poll),
      activePollsStatus: 'ready',
      activePollsError: null,
    }));
    return poll;
  },
  submitPollVote: async (input) => {
    if (appConfig.useMockData) {
      const poll = get().activePolls.find((candidate) => candidate.id === input.pollId);
      if (!poll) {
        throw new Error('일정 투표를 찾지 못했어요.');
      }

      const updatedPoll = applyMockSchedulePollVote(poll, input.selectedOptionIds);
      set((state) => ({
        activePolls: upsertPoll(state.activePolls, updatedPoll),
        activePollsStatus: 'ready',
        activePollsError: null,
      }));
      return updatedPoll;
    }

    const poll = await voteSchedulePoll(input);
    set((state) => ({
      activePolls: upsertPoll(state.activePolls, poll),
      activePollsStatus: 'ready',
      activePollsError: null,
    }));
    return poll;
  },
}));

function upsertPoll(polls: SchedulePoll[], poll: SchedulePoll) {
  const existingIndex = polls.findIndex((candidate) => candidate.id === poll.id);
  if (existingIndex === -1) {
    return [poll, ...polls];
  }

  return polls.map((candidate) => (candidate.id === poll.id ? poll : candidate));
}
