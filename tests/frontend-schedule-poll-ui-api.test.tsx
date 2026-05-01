import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SchedulePoll } from '../src/stores/schedulePollClient';

vi.mock('@/config/app.config', () => ({
  activeProfile: 'prod',
  appConfig: {
    profile: 'prod',
    firebase: {
      apiKey: '',
      authDomain: '',
      projectId: '',
      messagingSenderId: '',
      appId: '',
    },
    supabase: {
      url: 'https://project.supabase.co',
      publishableKey: 'public-key',
    },
    vapidKey: '',
    defaultClubId: 'club-real',
    useMockData: false,
  },
}));

import PollCreateModal from '../src/components/features/PollCreateModal';
import RecentNotice from '../src/components/features/RecentNotice';
import { useAppStore } from '../src/stores/useAppStore';
import { useModalStore } from '../src/stores/useModalStore';
import { useScheduleStore } from '../src/stores/useScheduleStore';
import { useToastStore } from '../src/stores/useToastStore';

const createdPoll: SchedulePoll = {
  id: 'poll-created',
  clubId: 'club-real',
  seasonId: null,
  title: '3월 친선 경기 일정 투표',
  status: 'open',
  commonTime: '18:00',
  location: '서울 용산 풋살장',
  memo: null,
  closesAt: null,
  createdByMembershipId: 'membership-operator',
  promotedMatchId: null,
  options: [
    { id: 'option-1', pollId: 'poll-created', optionDate: '2026-03-21', sortOrder: 0 },
    { id: 'option-2', pollId: 'poll-created', optionDate: '2026-03-22', sortOrder: 1 },
  ],
  votes: [],
};

describe('PollCreateModal real API wiring', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    useAppStore.setState({
      userRole: 'member',
      userStatus: 'approved',
      activeTab: 'home',
      showMyPage: false,
      showCommunity: false,
      showJoinForm: false,
    });
    useModalStore.setState({ activeModal: 'pollCreate' });
    useScheduleStore.setState({
      selectedDate: 1,
      activePolls: [],
      activePollsStatus: 'idle',
      activePollsError: null,
    });
    useToastStore.setState({ message: null });
  });

  it('posts selected dates to the schedule poll API without authUid', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify(createdPoll), { status: 201 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    render(<PollCreateModal />);

    await user.click(screen.getByRole('button', { name: /3월 21일/ }));
    await user.click(screen.getByRole('button', { name: /3월 22일/ }));
    await user.type(screen.getByPlaceholderText('서울 용산 풋살장'), '서울 용산 풋살장');
    await user.click(screen.getByRole('button', { name: '투표 생성하기' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const requestInit = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(requestInit.body as string);

    expect(body).toEqual({
      clubId: 'club-real',
      seasonId: null,
      title: '3월 친선 경기 일정 투표',
      commonTime: '18:00',
      location: '서울 용산 풋살장',
      memo: null,
      closesAt: null,
      optionDates: ['2026-03-21', '2026-03-22'],
    });
    expect(body).not.toHaveProperty('authUid');
    expect(useModalStore.getState().activeModal).toBeNull();
    expect(useToastStore.getState().message).toBe('일정 투표가 생성되었어요!');
  });

  it('keeps the modal open and shows the API failure message', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => (
      new Response(JSON.stringify({
        error: {
          code: 'membership_not_approved',
          message: 'This action requires an approved team membership.',
        },
      }), { status: 403 })
    ));
    vi.stubGlobal('fetch', fetchMock);

    render(<PollCreateModal />);

    await user.click(screen.getByRole('button', { name: /3월 21일/ }));
    await user.click(screen.getByRole('button', { name: /3월 22일/ }));
    await user.type(screen.getByPlaceholderText('서울 용산 풋살장'), '서울 용산 풋살장');
    await user.click(screen.getByRole('button', { name: '투표 생성하기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This action requires an approved team membership.');
    expect(useModalStore.getState().activeModal).toBe('pollCreate');
    expect(useToastStore.getState().message).toBe('This action requires an approved team membership.');
  });
});

describe('RecentNotice schedule poll API participation', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    useAppStore.setState({
      userRole: 'member',
      userStatus: 'approved',
      activeTab: 'home',
      showMyPage: false,
      showCommunity: false,
      showJoinForm: false,
    });
    useScheduleStore.setState({
      selectedDate: 1,
      activePolls: [],
      activePollsStatus: 'idle',
      activePollsError: null,
    });
    useToastStore.setState({ message: null });
  });

  it('loads active polls from the API and posts Home votes without authUid', async () => {
    const user = userEvent.setup();
    const updatedPoll: SchedulePoll = {
      ...createdPoll,
      votes: [
        {
          id: 'vote-1',
          pollId: createdPoll.id,
          optionId: 'option-1',
          membershipId: 'membership-member',
          isAvailable: true,
        },
      ],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([createdPoll]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(updatedPoll), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<RecentNotice />);

    const pollToggle = await screen.findByRole('button', { name: /3월 친선 경기 일정 투표/ });
    expect(fetchMock).toHaveBeenCalledWith('/api/schedule-polls?clubId=club-real', expect.objectContaining({
      method: 'GET',
    }));

    await user.click(pollToggle);
    await user.click(screen.getByText(/3월 21일 토 18:00/));
    await user.click(screen.getByRole('button', { name: '투표 제출하기' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(fetchMock).toHaveBeenLastCalledWith('/api/schedule-polls/vote', expect.objectContaining({
      method: 'POST',
    }));

    const requestInit = (fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(requestInit.body as string);

    expect(body).toEqual({
      clubId: 'club-real',
      pollId: 'poll-created',
      selectedOptionIds: ['option-1'],
    });
    expect(body).not.toHaveProperty('authUid');
    expect(useToastStore.getState().message).toBe('투표가 저장되었어요!');
  });

  it('shows active poll load API failures with retry UI', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          code: 'poll_load_failed',
          message: '일정 투표를 불러오지 못했어요.',
        },
      }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([createdPoll]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<RecentNotice />);

    expect(await screen.findByRole('alert')).toHaveTextContent('일정 투표를 불러오지 못했어요.');
    expect(useToastStore.getState().message).toBe('일정 투표를 불러오지 못했어요.');

    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByRole('button', { name: /3월 친선 경기 일정 투표/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps denied Home votes in an error state instead of showing success', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([createdPoll]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          code: 'membership_not_approved',
          message: 'This action requires an approved team membership.',
        },
      }), { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    render(<RecentNotice />);

    await user.click(await screen.findByRole('button', { name: /3월 친선 경기 일정 투표/ }));
    await user.click(screen.getByText(/3월 21일 토 18:00/));
    await user.click(screen.getByRole('button', { name: '투표 제출하기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This action requires an approved team membership.');
    expect(useToastStore.getState().message).toBe('This action requires an approved team membership.');
  });
});
