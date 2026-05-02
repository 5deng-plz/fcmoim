import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginScreen from '../src/components/features/LoginScreen';
import HomeTab from '../src/components/tabs/HomeTab';
import ScheduleTab from '../src/components/tabs/ScheduleTab';
import { useAppStore } from '../src/stores/useAppStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useScheduleStore } from '../src/stores/useScheduleStore';
import type { SchedulePoll } from '../src/stores/schedulePollClient';

const activePoll: SchedulePoll = {
  id: 'poll-march-friendly',
  clubId: 'club-test',
  seasonId: null,
  title: '3월 친선 경기 일정 투표',
  status: 'open',
  commonTime: '19:00',
  location: '서울 용산 풋살장',
  memo: '가능한 날짜를 모두 선택해주세요',
  closesAt: null,
  createdByMembershipId: 'membership-operator',
  promotedMatchId: null,
  options: [
    { id: 'option-1', pollId: 'poll-march-friendly', optionDate: '2026-03-21', sortOrder: 0 },
    { id: 'option-2', pollId: 'poll-march-friendly', optionDate: '2026-03-22', sortOrder: 1, displayTime: '10:00' },
  ],
  votes: [
    { id: 'vote-1', pollId: 'poll-march-friendly', optionId: 'option-1', membershipId: 'membership-1', isAvailable: true },
    { id: 'vote-2', pollId: 'poll-march-friendly', optionId: 'option-2', membershipId: 'membership-2', isAvailable: true },
  ],
};

describe('v1.0 auth provider UI', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    if (typeof window.localStorage.removeItem === 'function') {
      window.localStorage.removeItem('fcmoim.devAdminSession');
    }
    useAuthStore.setState({
      authUser: null,
      memberProfile: null,
      isLoading: false,
    });
  });

  it('shows Kakao login and does not expose Google login', () => {
    render(<LoginScreen />);

    expect(screen.getByRole('button', { name: /카카오로 시작하기/ })).toBeInTheDocument();
    expect(screen.queryByText(/Google로 시작하기/)).not.toBeInTheDocument();
  });

  it('hides the Admin shortcut outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');

    render(<LoginScreen />);

    expect(screen.queryByRole('button', { name: /테스트 관리자 로그인/ })).not.toBeInTheDocument();
  });

  it('shows the Admin shortcut by default in local development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_ADMIN_TEST_BYPASS', '');

    render(<LoginScreen />);

    expect(screen.getByRole('button', { name: /테스트 관리자 로그인/ })).toBeInTheDocument();
  });

  it('preserves the explicit local Admin shortcut for QA', async () => {
    const user = userEvent.setup();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_ADMIN_TEST_BYPASS', 'true');
    useAppStore.setState({
      isAuthenticated: false,
      userRole: 'member',
      userStatus: 'guest',
      authView: 'guest',
    });

    render(<LoginScreen />);

    await user.click(screen.getByRole('button', { name: /테스트 관리자 로그인/ }));

    expect(useAppStore.getState()).toMatchObject({
      isAuthenticated: true,
      userRole: 'admin',
      userStatus: 'approved',
      authView: 'login',
    });
    expect(useAuthStore.getState().memberProfile).toMatchObject({
      role: 'admin',
      status: 'approved',
    });
    expect(window.localStorage.getItem('fcmoim.devAdminSession')).toBe('admin');
  });

  it('restores the local Admin shortcut session during auth initialization', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_ADMIN_TEST_BYPASS', 'true');
    window.localStorage.setItem('fcmoim.devAdminSession', 'admin');

    useAppStore.setState({
      isAuthenticated: false,
      userRole: 'member',
      userStatus: 'guest',
      authView: 'login',
      showJoinForm: false,
    });
    useAuthStore.setState({
      authUser: null,
      memberProfile: null,
      isLoading: true,
    });

    await useAuthStore.getState().initialize();

    expect(useAppStore.getState()).toMatchObject({
      isAuthenticated: true,
      userRole: 'admin',
      userStatus: 'approved',
      authView: 'login',
    });
    expect(useAuthStore.getState().memberProfile).toMatchObject({
      role: 'admin',
      status: 'approved',
    });
  });
});

describe('v1.0 schedule and poll UX', () => {
  beforeEach(() => {
    useAppStore.setState({
      userRole: 'admin',
      userStatus: 'approved',
      activeTab: 'home',
      showMyPage: false,
      showCommunity: false,
      showJoinForm: false,
    });
    useScheduleStore.setState({
      activePolls: [activePoll],
      activePollsStatus: 'ready',
      activePollsError: null,
    });
  });

  it('separates schedule poll creation from confirmed event creation', () => {
    render(<ScheduleTab />);

    expect(screen.getByRole('button', { name: '일정 만들기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '투표 만들기' })).toBeInTheDocument();
    expect(screen.queryByText('3월 친선 경기 일정 투표')).not.toBeInTheDocument();
    expect(screen.queryByText('경기(투표)')).not.toBeInTheDocument();
  });

  it('marks active poll option dates on the calendar and keeps the legend visible', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 1));

    try {
      render(<ScheduleTab />);

      expect(screen.getByText('투표중')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3월 21일, 1개 일정' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3월 22일, 1개 일정' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps schedule creation out of Home while surfacing active poll participation', async () => {
    const user = userEvent.setup();

    render(<HomeTab />);

    expect(screen.getByText('다음 일정')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '일정 만들기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '투표 만들기' })).not.toBeInTheDocument();

    const pollToggle = screen.getByRole('button', { name: /3월 친선 경기 일정 투표/ });
    expect(pollToggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(pollToggle);

    expect(pollToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/3월 21일 토 19:00/)).toBeInTheDocument();
    expect(screen.getByText(/3월 22일 일 10:00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '투표 제출하기' })).toBeInTheDocument();
  });

  it('does not expose a successful poll vote action for non-approved memberships', async () => {
    const user = userEvent.setup();

    useAppStore.setState({
      userRole: 'member',
      userStatus: 'pending',
    });

    render(<HomeTab />);

    const pollToggle = screen.getByRole('button', { name: /3월 친선 경기 일정 투표/ });
    await user.click(pollToggle);

    expect(screen.getByText('승인된 회원만 일정 투표에 참여할 수 있어요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '승인 후 투표 가능' })).toBeDisabled();
  });
});
