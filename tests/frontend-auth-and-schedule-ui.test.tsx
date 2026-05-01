import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import LoginScreen from '../src/components/features/LoginScreen';
import HomeTab from '../src/components/tabs/HomeTab';
import ScheduleTab from '../src/components/tabs/ScheduleTab';
import { useAppStore } from '../src/stores/useAppStore';

describe('Stage 1 auth provider UI', () => {
  it('shows Kakao login and does not expose Google login', () => {
    render(<LoginScreen />);

    expect(screen.getByRole('button', { name: /카카오로 시작하기/ })).toBeInTheDocument();
    expect(screen.queryByText(/Google로 시작하기/)).not.toBeInTheDocument();
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
});
