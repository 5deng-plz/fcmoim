import { create } from 'zustand';
import {
  cancelSchedulePoll,
  createSchedulePoll,
  fetchActiveSchedulePolls,
  getSchedulePollErrorMessage,
  promoteSchedulePoll,
  voteSchedulePoll,
  type CancelSchedulePollRequest,
  type CreateSchedulePollRequest,
  type PromoteSchedulePollRequest,
  type PromoteSchedulePollResponse,
  type SchedulePoll,
  type VoteSchedulePollRequest,
} from './schedulePollClient';
import {
  cancelMatch,
  fetchUpcomingMatches,
  type CancelMatchRequest,
  type UpcomingMatch,
} from './matchClient';

type ActivePollsStatus = 'idle' | 'loading' | 'ready' | 'error';
type UpcomingMatchesStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ScheduleState {
  selectedDate: number;
  activePolls: SchedulePoll[];
  activePollsStatus: ActivePollsStatus;
  activePollsError: string | null;
  upcomingMatches: UpcomingMatch[];
  upcomingMatchesStatus: UpcomingMatchesStatus;
  upcomingMatchesError: string | null;
  setSelectedDate: (date: number) => void;
  setActivePolls: (polls: SchedulePoll[]) => void;
  loadActivePolls: (clubId?: string) => Promise<void>;
  loadUpcomingMatches: (clubId?: string) => Promise<void>;
  createPoll: (input: CreateSchedulePollRequest) => Promise<SchedulePoll>;
  submitPollVote: (input: VoteSchedulePollRequest) => Promise<SchedulePoll>;
  cancelPoll: (input: CancelSchedulePollRequest) => Promise<SchedulePoll>;
  promotePoll: (input: PromoteSchedulePollRequest) => Promise<PromoteSchedulePollResponse>;
  cancelUpcomingMatch: (input: CancelMatchRequest) => Promise<UpcomingMatch>;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  selectedDate: new Date().getDate(),
  activePolls: [],
  activePollsStatus: 'idle',
  activePollsError: null,
  upcomingMatches: [],
  upcomingMatchesStatus: 'idle',
  upcomingMatchesError: null,
  setSelectedDate: (date) => set({ selectedDate: date }),
  setActivePolls: (polls) => set({ activePolls: polls, activePollsStatus: 'ready', activePollsError: null }),
  loadActivePolls: async (clubId) => {
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
    const poll = await createSchedulePoll(input);
    set((state) => ({
      activePolls: upsertPoll(state.activePolls, poll),
      activePollsStatus: 'ready',
      activePollsError: null,
    }));
    return poll;
  },
  submitPollVote: async (input) => {
    const poll = await voteSchedulePoll(input);
    set((state) => ({
      activePolls: upsertPoll(state.activePolls, poll),
      activePollsStatus: 'ready',
      activePollsError: null,
    }));
    return poll;
  },
  cancelPoll: async (input) => {
    const poll = await cancelSchedulePoll(input);
    set((state) => ({
      activePolls: upsertPoll(state.activePolls, poll),
      activePollsStatus: 'ready',
      activePollsError: null,
    }));
    return poll;
  },
  promotePoll: async (input) => {
    const result = await promoteSchedulePoll(input);
    set((state) => ({
      activePolls: state.activePolls.map((poll) => (
        poll.id === input.pollId
          ? { ...poll, status: 'promoted', promotedMatchId: result.matchId }
          : poll
      )),
      activePollsStatus: 'ready',
      activePollsError: null,
    }));
    return result;
  },
  loadUpcomingMatches: async (clubId) => {
    set({ upcomingMatchesStatus: 'loading', upcomingMatchesError: null });

    try {
      const upcomingMatches = await fetchUpcomingMatches(clubId);
      set({ upcomingMatches, upcomingMatchesStatus: 'ready', upcomingMatchesError: null });
    } catch (error) {
      const message = getSchedulePollErrorMessage(error, '확정 일정을 불러오지 못했어요.');
      set({ upcomingMatchesStatus: 'error', upcomingMatchesError: message });
      throw error;
    }
  },
  cancelUpcomingMatch: async (input) => {
    const match = await cancelMatch(input);
    set((state) => ({
      upcomingMatches: upsertMatch(state.upcomingMatches, match),
      upcomingMatchesStatus: 'ready',
      upcomingMatchesError: null,
    }));
    return match;
  },
}));

function upsertPoll(polls: SchedulePoll[], poll: SchedulePoll) {
  const existingIndex = polls.findIndex((candidate) => candidate.id === poll.id);
  if (existingIndex === -1) {
    return [poll, ...polls];
  }

  return polls.map((candidate) => (candidate.id === poll.id ? poll : candidate));
}

function upsertMatch(matches: UpcomingMatch[], match: UpcomingMatch) {
  const existingIndex = matches.findIndex((candidate) => candidate.id === match.id);
  if (existingIndex === -1) {
    return [match, ...matches].sort((left, right) => left.date.localeCompare(right.date));
  }

  return matches
    .map((candidate) => (candidate.id === match.id ? match : candidate))
    .sort((left, right) => left.date.localeCompare(right.date));
}
