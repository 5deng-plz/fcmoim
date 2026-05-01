import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginScreen from '../src/components/features/LoginScreen';
import HomeTab from '../src/components/tabs/HomeTab';
import ScheduleTab from '../src/components/tabs/ScheduleTab';
import { useAppStore } from '../src/stores/useAppStore';
import { useScheduleStore } from '../src/stores/useScheduleStore';
import { getMockActiveSchedulePolls } from '../src/mocks/schedulePolls';

describe('Stage 1 auth provider UI', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows Kakao login and does not expose Google login', () => {
    render(<LoginScreen />);

    expect(screen.getByRole('button', { name: /카카오로 시작하기/ })).toBeInTheDocument();
    expect(screen.queryByText(/Google로 시작하기/)).not.toBeInTheDocument();
  });

  it('hides the Admin shortcut outside development', () => {
    render(<LoginScreen />);

    expect(screen.queryByRole('button', { name: /개발자 전용 임시 로그인/ })).not.toBeInTheDocument();
  });

  it('preserves the development-only Admin shortcut for local QA', async () => {
    const user = userEvent.setup();
    vi.stubEnv('NODE_ENV', 'development');
    useAppStore.setState({
      isAuthenticated: false,
      userRole: 'member',
      userStatus: 'guest',
      authView: 'guest',
    });

    render(<LoginScreen />);

    await user.click(screen.getByRole('button', { name: /개발자 전용 임시 로그인/ }));

    expect(useAppStore.getState()).toMatchObject({
      isAuthenticated: true,
      userRole: 'admin',
      userStatus: 'approved',
      authView: 'login',
    });
  });
});

describe('Stage 1 schedule and poll UX', () => {
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
      activePolls: getMockActiveSchedulePolls(),
      activePollsStatus: 'idle',
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
