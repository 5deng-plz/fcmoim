import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoginScreen from '../src/components/features/LoginScreen';
import ScheduleTab from '../src/components/tabs/ScheduleTab';

describe('Stage 1 auth provider UI', () => {
  it('shows Kakao login and does not expose Google login', () => {
    render(<LoginScreen />);

    expect(screen.getByRole('button', { name: /카카오로 시작하기/ })).toBeInTheDocument();
    expect(screen.queryByText(/Google로 시작하기/)).not.toBeInTheDocument();
  });
});

describe('Stage 1 schedule and poll UX', () => {
  it('separates schedule poll creation from confirmed event creation', () => {
    render(<ScheduleTab />);

    expect(screen.getByRole('button', { name: '일정 생성' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '투표 만들기' })).toBeInTheDocument();
    expect(screen.getByText('3월 친선 경기 일정 투표')).toBeInTheDocument();
    expect(screen.queryByText('경기(투표)')).not.toBeInTheDocument();
  });
});
