import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GuestDashboard from '../src/components/features/GuestDashboard';
import Header from '../src/components/layout/Header';
import LoginScreen from '../src/components/features/LoginScreen';
import LockerProfile from '../src/components/features/LockerProfile';
import MatchCreateModal from '../src/components/features/MatchCreateModal';
import EventComments from '../src/components/features/EventComments';
import NotificationPanel from '../src/components/features/NotificationPanel';
import HomeTab from '../src/components/tabs/HomeTab';
import CommunityPage from '../src/components/tabs/CommunityPage';
import LockerRoomTab from '../src/components/tabs/LockerRoomTab';
import MyPage from '../src/components/tabs/MyPage';
import RecordsTab from '../src/components/tabs/RecordsTab';
import ScheduleTab from '../src/components/tabs/ScheduleTab';
import TacticsDragBuilder, { buildMatchAnticipationState } from '../src/components/features/TacticsDragBuilder';
import HomePage from '../src/app/page';
import { useAppStore } from '../src/stores/useAppStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useScheduleStore } from '../src/stores/useScheduleStore';
import { useModalStore } from '../src/stores/useModalStore';
import { useAnnouncementStore } from '../src/stores/useAnnouncementStore';
import { useRecordsStore } from '../src/stores/useRecordsStore';
import { useToastStore } from '../src/stores/useToastStore';
import type { SchedulePoll } from '../src/stores/schedulePollClient';
import { DEFAULT_STATS } from '../src/types';

const OWNER_PROFILE_NAME = '권나라';
const OWNER_PROFILE_PHOTO_URL =
  'https://talkimg.imbc.com/TVianUpload/tvian/TViews/image/2022/06/02/636802e8-f6a1-40e7-aa29-ac8c51ad55b3.jpg';

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

const authActions = {
  initialize: useAuthStore.getState().initialize,
  signInGoogle: useAuthStore.getState().signInGoogle,
  signInKakao: useAuthStore.getState().signInKakao,
  signInEmail: useAuthStore.getState().signInEmail,
  signOut: useAuthStore.getState().signOut,
};

describe('match anticipation state helper', () => {
  const baseMatch = {
    redLeaderConfirmed: false,
    blueLeaderConfirmed: false,
    tacticsCompleted: false,
  };

  it('derives pre-match teaser stage and member state from existing match data', () => {
    expect(buildMatchAnticipationState({
      match: baseMatch,
      players: [],
      lineup: [],
      currentMembershipId: 'member-1',
    })).toMatchObject({ stage: 'waitingRoster', memberState: 'notAttending' });

    expect(buildMatchAnticipationState({
      match: baseMatch,
      players: [{ id: 'member-1' }],
      lineup: [],
      currentMembershipId: 'member-1',
    })).toMatchObject({ stage: 'drafting', memberState: 'bench' });

    expect(buildMatchAnticipationState({
      match: { ...baseMatch, redLeaderConfirmed: true },
      players: [{ id: 'member-1' }, { id: 'member-2' }],
      lineup: [{ membershipId: 'member-1', teamNumber: 1 }],
      currentMembershipId: 'member-1',
    })).toMatchObject({ stage: 'redReady', memberState: 'red', redCount: 1 });

    expect(buildMatchAnticipationState({
      match: { ...baseMatch, blueLeaderConfirmed: true },
      players: [{ id: 'member-1' }, { id: 'member-2' }],
      lineup: [{ membershipId: 'member-2', teamNumber: 2 }],
      currentMembershipId: 'member-2',
    })).toMatchObject({ stage: 'blueReady', memberState: 'blue', blueCount: 1 });

    expect(buildMatchAnticipationState({
      match: { ...baseMatch, redLeaderConfirmed: true, blueLeaderConfirmed: true },
      players: [{ id: 'member-1' }, { id: 'member-2' }, { id: 'bench-member' }],
      lineup: [
        { membershipId: 'member-1', teamNumber: 1 },
        { membershipId: 'member-2', teamNumber: 2 },
      ],
      currentMembershipId: 'bench-member',
    })).toMatchObject({ stage: 'finalizing', memberState: 'bench', benchCount: 1 });
  });
});

describe('v1.0 auth provider UI', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: false }),
    }));
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
    useAppStore.setState({
      authView: 'login',
      isAuthenticated: false,
      userStatus: 'guest',
      showJoinForm: false,
      showTeamBrowse: false,
      teamBrowseJoinStatus: null,
      selectedJoinClubId: 'club-test',
      joinIntent: null,
      activeClubId: 'club-test',
      teamName: 'FC moim',
      userRole: 'member',
      availableClubs: [],
      settlementNotification: null,
    });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    if (typeof window.localStorage.removeItem === 'function') {
      window.localStorage.removeItem('fcmoim.devAdminSession');
    }
    useAuthStore.setState({
      ...authActions,
      authUser: null,
      memberProfile: null,
      isLoading: false,
    });
  });

  it('shows production-safe OAuth login choices without email password login by default', () => {
    render(<LoginScreen />);

    expect(screen.queryByRole('button', { name: /이메일로 로그인/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '이메일' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google로 계속하기/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Google로 계속하기/ }).querySelector('img[src="/brand/google-g.svg"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /카카오로 시작하기/ })).toBeInTheDocument();
  });

  it('starts Google OAuth from the login choice', async () => {
    const signInGoogle = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ signInGoogle });

    render(<LoginScreen />);

    await userEvent.click(screen.getByRole('button', { name: /Google로 계속하기/ }));

    expect(signInGoogle).toHaveBeenCalledOnce();
  });

  it('shows an error when Google OAuth cannot start', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    useAuthStore.setState({
      signInGoogle: vi.fn().mockRejectedValue(new Error('provider disabled')),
    });

    render(<LoginScreen />);

    await userEvent.click(screen.getByRole('button', { name: /Google로 계속하기/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.',
    );

    consoleError.mockRestore();
  });

  it('shows public team browse feedback and returns to login', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/public/clubs') {
        return new Response(JSON.stringify([
          {
            id: 'club-1',
            name: 'FC Guppy',
            slug: 'fc-guppy',
            description: 'Default club',
            logoUrl: null,
            isPublic: true,
            memberCount: 12,
            activeSeason: null,
            recentMatchCount: 4,
            upcomingMatchCount: 0,
          },
          {
            id: 'club-2',
            name: 'FC Orca',
            slug: 'fc-orca',
            description: 'Second club',
            logoUrl: null,
            isPublic: true,
            memberCount: 8,
            activeSeason: null,
            recentMatchCount: 1,
            upcomingMatchCount: 0,
          },
          {
            id: 'club-3',
            name: 'FC Lynx',
            slug: 'fc-lynx',
            description: 'Third club',
            logoUrl: null,
            isPublic: true,
            memberCount: 4,
            activeSeason: null,
            recentMatchCount: 0,
            upcomingMatchCount: 0,
          },
        ]), { status: 200 });
      }

      if (url === '/api/public/clubs/club-1') {
        return new Response(JSON.stringify({
          id: 'club-1',
          name: 'FC Guppy',
          slug: 'fc-guppy',
          description: 'Default club',
          logoUrl: null,
          isPublic: true,
          memberCount: 12,
          activeSeason: null,
          recentMatchCount: 4,
          upcomingMatchCount: 0,
          recentMatches: [
            {
              id: 'match-1',
              title: 'Round 5',
              date: '2026-05-01T10:00:00.000Z',
              location: '서울 용산 풋살장',
              type: 'match',
              status: 'finished',
              ourScore: 2,
              oppScore: 1,
              attendeeCount: 2,
              attendeeTotal: 12,
            },
            {
              id: 'training-1',
              title: '5월 전지훈련',
              date: '2026-05-02T10:00:00.000Z',
              location: '하남 훈련장',
              type: 'training',
              status: 'scheduled',
              ourScore: null,
              oppScore: null,
              attendeeCount: 6,
              attendeeTotal: 12,
            },
            {
              id: 'etc-1',
              title: '5월 장비 점검',
              date: '2026-05-03T10:00:00.000Z',
              location: '잠실 풋살파크',
              type: 'etc',
              status: 'scheduled',
              ourScore: null,
              oppScore: null,
              attendeeCount: 0,
              attendeeTotal: 12,
            },
          ],
          upcomingMatches: [],
        }), { status: 200 });
      }

      if (url === '/api/public/clubs/club-2') {
        return new Response(JSON.stringify({
          id: 'club-2',
          name: 'FC Orca',
          slug: 'fc-orca',
          description: 'Second club',
          logoUrl: null,
          isPublic: true,
          memberCount: 8,
          activeSeason: null,
          recentMatchCount: 1,
          upcomingMatchCount: 0,
          recentMatches: [],
          upcomingMatches: [],
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    });
    useAppStore.setState({ authView: 'guest', selectedJoinClubId: 'club-1' });

    const { container } = render(<GuestDashboard />);

    expect(await screen.findByText('최근 경기 요약')).toBeInTheDocument();
    expect(container.querySelector('.sticky.top-0')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('FC Guppy emblem')).toHaveLength(2);
    expect(screen.getByText('FC Orca')).toBeInTheDocument();
    expect(screen.getByText('FC Lynx')).toBeInTheDocument();
    expect(screen.getAllByText('Default club')).toHaveLength(2);
    expect(screen.getByText('현재 멤버')).toBeInTheDocument();
    expect(screen.getByText('시즌 경기')).toBeInTheDocument();
    expect(screen.getByText('최근 경기')).toBeInTheDocument();
    expect(screen.getByText('2 : 1')).toBeInTheDocument();
    expect(screen.getByText('2/12명 참석')).toBeInTheDocument();
    expect(screen.getByText('Round 5').closest('.rounded-lg')).toHaveClass('bg-event-match-bg', 'border-event-match-border');
    expect(screen.getByText('5월 전지훈련').closest('.rounded-lg')).toHaveClass('bg-event-training-bg', 'border-event-training-border');
    expect(screen.getByText('5월 장비 점검').closest('.rounded-lg')).toHaveClass('bg-event-etc-bg', 'border-event-etc-border');
    expect(screen.getByRole('button', { name: /입단신청 시작/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /FC moim 랜딩으로 이동/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /FC Orca/ }));

    expect(await screen.findByRole('heading', { name: 'FC Orca' })).toBeInTheDocument();
    expect(useAppStore.getState().selectedJoinClubId).toBe('club-2');
  });

  it('moves a selected public team into the login-first join flow', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/public/clubs') {
        return new Response(JSON.stringify([
          {
            id: 'club-1',
            name: 'FC Guppy',
            slug: 'fc-guppy',
            description: 'Default club',
            logoUrl: null,
            isPublic: true,
            memberCount: 12,
            activeSeason: null,
            recentMatchCount: 0,
            upcomingMatchCount: 0,
          },
        ]), { status: 200 });
      }

      if (url === '/api/public/clubs/club-1') {
        return new Response(JSON.stringify({
          id: 'club-1',
          name: 'FC Guppy',
          slug: 'fc-guppy',
          description: 'Default club',
          logoUrl: null,
          isPublic: true,
          memberCount: 12,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
          recentMatches: [],
          upcomingMatches: [],
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    });
    useAppStore.setState({ authView: 'guest', selectedJoinClubId: 'club-1' });

    render(<GuestDashboard />);

    await userEvent.click(await screen.findByRole('button', { name: /입단신청 시작/ }));

    expect(useAppStore.getState()).toMatchObject({
      authView: 'login',
      selectedJoinClubId: 'club-1',
      showJoinForm: false,
      joinIntent: { clubId: 'club-1' },
    });
    expect(useToastStore.getState().message).toBe('입단을 위해 로그인이 먼저 필요합니다. 로그인해주세요.');
  });

  it('shows the login-required banner and returns to landing before unauthenticated team creation', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/public/clubs') {
        return new Response(JSON.stringify([{
          id: 'club-1',
          name: 'FC Guppy',
          slug: 'fc-guppy',
          description: 'Default club',
          logoUrl: null,
          isPublic: true,
          memberCount: 12,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
        }]), { status: 200 });
      }

      if (url === '/api/public/clubs/club-1') {
        return new Response(JSON.stringify({
          id: 'club-1',
          name: 'FC Guppy',
          slug: 'fc-guppy',
          description: 'Default club',
          logoUrl: null,
          isPublic: true,
          memberCount: 12,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
          recentMatches: [],
          upcomingMatches: [],
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    });
    useAuthStore.setState({ initialize: vi.fn(async () => undefined), isLoading: false });
    useAppStore.setState({
      authView: 'guest',
      isAuthenticated: false,
      userStatus: 'guest',
      selectedJoinClubId: 'club-1',
      joinIntent: { clubId: 'club-1' },
      showJoinForm: false,
    });

    render(<HomePage />);

    await userEvent.click(await screen.findByRole('button', { name: /새로운 팀 만들기/ }));

    expect(await screen.findByRole('heading', { name: 'FC moim' })).toBeInTheDocument();
    expect(screen.getByText('팀 생성을 위해 로그인이 먼저 필요합니다.')).toBeInTheDocument();
    expect(useAppStore.getState()).toMatchObject({
      authView: 'login',
      showJoinForm: false,
      joinIntent: null,
    });
  });

  it('creates a new team from the authenticated guest dashboard and enters the created club', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/public/clubs') {
        return new Response(JSON.stringify([{
          id: 'club-1',
          name: 'FC Guppy',
          slug: 'fc-guppy',
          description: 'Default club',
          logoUrl: null,
          isPublic: true,
          memberCount: 12,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
        }]), { status: 200 });
      }

      if (url === '/api/public/clubs/club-1') {
        return new Response(JSON.stringify({
          id: 'club-1',
          name: 'FC Guppy',
          slug: 'fc-guppy',
          description: 'Default club',
          logoUrl: null,
          isPublic: true,
          memberCount: 12,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
          recentMatches: [],
          upcomingMatches: [],
        }), { status: 200 });
      }

      if (url === '/api/clubs' && init?.method === 'GET') {
        return new Response(JSON.stringify({ ownedClubCount: 0, canCreate: true }), { status: 200 });
      }

      if (url === '/api/clubs/check-slug?slug=fc-amigo') {
        return new Response(JSON.stringify({ exists: false }), { status: 200 });
      }

      if (url === '/api/clubs' && init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, clubId: 'club-created' }), { status: 201 });
      }

      if (url === '/api/membership/clubs') {
        return new Response(JSON.stringify([{
          membershipId: 'membership-created',
          clubId: 'club-created',
          clubName: 'FC Amigo',
          role: 'admin',
          status: 'approved',
        }]), { status: 200 });
      }

      if (url === '/api/membership?clubId=club-created') {
        return new Response(JSON.stringify({
          account: { id: 'auth-guest', email: 'guest@fcmoim.test' },
          membershipState: 'approved',
          membership: {
            id: 'membership-created',
            accountId: 'auth-guest',
            clubId: 'club-created',
            role: 'admin',
            status: 'approved',
            nickname: 'guest',
            position: 'MF',
            heightCm: null,
            weightKg: null,
            birthDate: null,
            residence: null,
            photoUrl: null,
            ovr: 60,
            stats: DEFAULT_STATS,
            matchPoints: 100,
            preferredFoot: 'right',
          },
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    });
    useAuthStore.setState({
      authUser: {
        id: 'auth-guest',
        email: 'guest@fcmoim.test',
        user_metadata: {},
      } as never,
    });
    useAppStore.setState({
      isAuthenticated: true,
      userStatus: 'guest',
      selectedJoinClubId: 'club-1',
    });

    render(<GuestDashboard />);

    await userEvent.click(await screen.findByRole('button', { name: /새로운 팀 만들기/ }));
    expect(screen.getByLabelText('웹 주소용 영문 아이디')).toHaveAttribute('placeholder', 'www.fcmoim.com/{team-id}');
    await userEvent.type(screen.getByLabelText('팀 이름'), 'FC Amigo');
    await userEvent.type(screen.getByLabelText('웹 주소용 영문 아이디'), 'fc-amigo');
    await userEvent.type(screen.getByLabelText('팀 소개'), '주말 오전에 경기하는 팀입니다.');

    await waitFor(() => expect(screen.getByText('사용 가능한 주소입니다.')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: '팀 생성하기' }));

    await waitFor(() => {
      expect(useAppStore.getState()).toMatchObject({
        activeClubId: 'club-created',
        userStatus: 'approved',
        teamName: 'FC Amigo',
      });
    });
    expect(useToastStore.getState().message).toBe('팀이 생성되었습니다.');
  });

  it('blocks the create team modal when the authenticated account already owns two clubs', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/public/clubs') {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url === '/api/clubs') {
        return new Response(JSON.stringify({ ownedClubCount: 2, canCreate: false }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });
    useAuthStore.setState({
      authUser: {
        id: 'auth-guest',
        email: 'guest@fcmoim.test',
        user_metadata: {},
      } as never,
    });
    useAppStore.setState({
      isAuthenticated: true,
      userStatus: 'guest',
    });

    render(<GuestDashboard />);

    await userEvent.click(await screen.findByRole('button', { name: /새로운 팀 만들기/ }));

    expect(screen.queryByRole('dialog', { name: '팀 만들기' })).not.toBeInTheDocument();
    expect(useToastStore.getState().message).toBe('계정당 최대 2개의 팀만 생성할 수 있습니다.');
  });

  it('opens the selected team join modal after login when membership is new', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/public/clubs') {
        return new Response(JSON.stringify([{
          id: 'club-2',
          name: 'FC Orca',
          slug: 'fc-orca',
          description: 'Second club',
          logoUrl: null,
          isPublic: true,
          memberCount: 8,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
        }]), { status: 200 });
      }

      if (url === '/api/public/clubs/club-2') {
        return new Response(JSON.stringify({
          id: 'club-2',
          name: 'FC Orca',
          slug: 'fc-orca',
          description: 'Second club',
          logoUrl: null,
          isPublic: true,
          memberCount: 8,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
          recentMatches: [],
          upcomingMatches: [],
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    });
    useAuthStore.setState({ initialize: vi.fn(async () => undefined), isLoading: false });
    useAppStore.setState({
      authView: 'login',
      isAuthenticated: true,
      userStatus: 'guest',
      selectedJoinClubId: 'club-2',
      joinIntent: { clubId: 'club-2' },
      showJoinForm: true,
    });

    render(<HomePage />);

    expect(await screen.findByRole('dialog', { name: '입단신청' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('이름 입력 *')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /FC Orca Second club/ })).toBeInTheDocument();
  });

  it('renders pending join state after login without opening a duplicate submit path', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/membership?clubId=club-3') {
        return new Response(JSON.stringify({
          account: { id: 'auth-user-1', email: 'player@example.com' },
          membershipState: 'pending',
          membership: {
            id: 'membership-pending',
            accountId: 'auth-user-1',
            clubId: 'club-3',
            role: 'member',
            status: 'pending',
            nickname: '대기 멤버',
            position: 'MF',
            heightCm: null,
            weightKg: null,
            birthDate: null,
            residence: null,
            photoUrl: null,
            ovr: 66,
            stats: DEFAULT_STATS,
            matchPoints: 100,
            preferredFoot: 'right',
          },
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    });
    useAuthStore.setState({ initialize: vi.fn(async () => undefined), isLoading: false });
    useAppStore.setState({
      authView: 'login',
      isAuthenticated: true,
      userStatus: 'pending',
      selectedJoinClubId: 'club-3',
      joinIntent: { clubId: 'club-3' },
      showJoinForm: true,
    });

    render(<HomePage />);

    expect(await screen.findByRole('button', { name: /운영진 승인을 기다려주세요/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^입단신청$/ })).not.toBeInTheDocument();
  });

  it.each([
    ['rejected', '가입 신청이 반려되었어요', '입력한 정보 확인이 필요해요. 팀 운영진에게 문의해주세요.'],
    ['suspended', '이용이 일시 중지되었어요', '팀 운영진에게 멤버십 상태 확인을 요청해주세요.'],
    ['withdrawn', '가입 신청이 반려되었어요', '입력한 정보 확인이 필요해요. 팀 운영진에게 문의해주세요.'],
  ] as const)('renders %s membership as a blocked login state', async (userStatus, title, description) => {
    useAuthStore.setState({ initialize: vi.fn(async () => undefined), isLoading: false });
    useAppStore.setState({
      authView: 'login',
      isAuthenticated: true,
      userStatus,
      selectedJoinClubId: 'club-3',
      joinIntent: { clubId: 'club-3' },
      showJoinForm: false,
    });

    render(<HomePage />);

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('does not show a join action for teams the user already belongs to', async () => {
    const switchClub = vi.fn(async () => undefined);
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/public/clubs') {
        return new Response(JSON.stringify([{
          id: 'club-1',
          name: 'FC Guppy',
          slug: 'fc-guppy',
          description: 'Default club',
          logoUrl: null,
          isPublic: true,
          memberCount: 12,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
        }]), { status: 200 });
      }

      if (url === '/api/public/clubs/club-1') {
        return new Response(JSON.stringify({
          id: 'club-1',
          name: 'FC Guppy',
          slug: 'fc-guppy',
          description: 'Default club',
          logoUrl: null,
          isPublic: true,
          memberCount: 12,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
          recentMatches: [],
          upcomingMatches: [],
        }), { status: 200 });
      }

      if (url === '/api/membership?clubId=club-1') {
        return new Response(JSON.stringify({
          account: { id: 'auth-user-1', email: 'player@example.com' },
          membershipState: 'approved',
          membership: {
            id: 'membership-1',
            accountId: 'auth-user-1',
            clubId: 'club-1',
            role: 'member',
            status: 'approved',
            nickname: '기존 멤버',
            position: 'MF',
            heightCm: null,
            weightKg: null,
            birthDate: null,
            residence: null,
            photoUrl: null,
            ovr: 66,
            stats: DEFAULT_STATS,
            matchPoints: 100,
            preferredFoot: 'right',
          },
        }), { status: 200 });
      }

      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    });
    useAuthStore.setState({ switchClub });
    useAppStore.setState({
      authView: 'guest',
      isAuthenticated: true,
      userStatus: 'guest',
      selectedJoinClubId: 'club-1',
      availableClubs: [
        { membershipId: 'membership-1', clubId: 'club-1', clubName: 'FC Guppy', role: 'member', status: 'approved' },
      ],
      showJoinForm: false,
      joinIntent: null,
    });

    render(<GuestDashboard />);

    expect(await screen.findByRole('heading', { name: 'FC Guppy' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /입단신청 시작/ })).not.toBeInTheDocument();
    expect(switchClub).not.toHaveBeenCalled();
    expect(useAppStore.getState().showJoinForm).toBe(false);
  });

  it('keeps joined teams selectable while showing join action only for teams the user does not belong to', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/public/clubs') {
        return new Response(JSON.stringify([
          {
            id: 'club-1',
            name: 'FC Guppy',
            slug: 'fc-guppy',
            description: 'Already joined club',
            logoUrl: null,
            isPublic: true,
            memberCount: 12,
            activeSeason: null,
            recentMatchCount: 0,
            upcomingMatchCount: 0,
          },
          {
            id: 'club-2',
            name: 'FC Orca',
            slug: 'fc-orca',
            description: 'Open club',
            logoUrl: null,
            isPublic: true,
            memberCount: 8,
            activeSeason: null,
            recentMatchCount: 0,
            upcomingMatchCount: 0,
          },
        ]), { status: 200 });
      }

      if (url === '/api/public/clubs/club-1' || url === '/api/public/clubs/club-2') {
        const isJoinedClub = url.endsWith('/club-1');
        return new Response(JSON.stringify({
          id: isJoinedClub ? 'club-1' : 'club-2',
          name: isJoinedClub ? 'FC Guppy' : 'FC Orca',
          slug: isJoinedClub ? 'fc-guppy' : 'fc-orca',
          description: isJoinedClub ? 'Already joined club' : 'Open club',
          logoUrl: null,
          isPublic: true,
          memberCount: isJoinedClub ? 12 : 8,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
          recentMatches: [],
          upcomingMatches: [],
        }), { status: 200 });
      }

      if (url === '/api/membership/snapshot?clubId=club-2') {
        return new Response(JSON.stringify({ membershipState: 'new' }), { status: 200 });
      }

      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    });
    useAppStore.setState({
      authView: 'guest',
      isAuthenticated: true,
      userStatus: 'guest',
      selectedJoinClubId: 'club-1',
      availableClubs: [
        { membershipId: 'membership-1', clubId: 'club-1', clubName: 'FC Guppy', role: 'member', status: 'approved' },
      ],
      showJoinForm: false,
      joinIntent: null,
    });

    render(<GuestDashboard />);

    expect(await screen.findByRole('heading', { name: 'FC Guppy' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /입단신청 시작/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /FC Orca/ }));

    expect(await screen.findByRole('heading', { name: 'FC Orca' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /입단신청 시작/ }));

    expect(useAppStore.getState()).toMatchObject({
      selectedJoinClubId: 'club-2',
      showJoinForm: true,
      joinIntent: { clubId: 'club-2' },
    });
  });

  it('hides join entry when no public teams are available', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/public/clubs') {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    });
    useAppStore.setState({ authView: 'guest', selectedJoinClubId: 'club-test' });

    render(<GuestDashboard />);

    expect(await screen.findByText('공개된 팀이 아직 없어요')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /입단신청 시작/ })).not.toBeInTheDocument();
    expect(screen.queryByText('최근 경기 요약')).not.toBeInTheDocument();
  });

  it('does not expose the removed Admin shortcut in development', () => {
    vi.stubEnv('NODE_ENV', 'development');

    render(<LoginScreen />);

    expect(screen.queryByRole('button', { name: /테스트 관리자 로그인/ })).not.toBeInTheDocument();
  });

  it('shows QA email login only when DEV_TEST is enabled by the server', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response);

    render(<LoginScreen />);

    expect(await screen.findByRole('button', { name: 'QA 이메일 로그인' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'QA 이메일 계정' })).toHaveValue('qa-admin@fcmoim.test');
    expect(screen.getByLabelText('비밀번호')).toHaveValue('');
  });

  it('submits QA email credentials through the auth store', async () => {
    const signInEmail = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ signInEmail });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response);

    render(<LoginScreen />);

    await screen.findByRole('button', { name: 'QA 이메일 로그인' });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'QA 이메일 계정' }), 'qa-member1@fcmoim.test');
    await userEvent.type(screen.getByLabelText('비밀번호'), 'local-supabase-qa-password');
    await userEvent.click(screen.getByRole('button', { name: 'QA 이메일 로그인' }));

    expect(signInEmail).toHaveBeenCalledWith('qa-member1@fcmoim.test', 'local-supabase-qa-password');
  });

  it('shows a password error when Supabase rejects email credentials', async () => {
    const signInEmail = vi.fn().mockRejectedValue(new Error('Invalid login credentials'));
    useAuthStore.setState({ signInEmail });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response);

    render(<LoginScreen />);

    await screen.findByRole('button', { name: 'QA 이메일 로그인' });
    await userEvent.type(screen.getByLabelText('비밀번호'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'QA 이메일 로그인' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('비밀번호가 올바르지 않습니다.');
  });

  it('shows a membership loading error when login succeeds but profile bootstrap fails', async () => {
    const signInEmail = vi.fn().mockRejectedValue(new Error('멤버십 상태를 확인하지 못했습니다.'));
    useAuthStore.setState({ signInEmail });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: true }),
    } as Response);

    render(<LoginScreen />);

    await screen.findByRole('button', { name: 'QA 이메일 로그인' });
    await userEvent.type(screen.getByLabelText('비밀번호'), 'local-supabase-qa-password');
    await userEvent.click(screen.getByRole('button', { name: 'QA 이메일 로그인' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인은 되었지만 멤버십 정보를 불러오지 못했습니다.',
    );
  });

  it('keeps auth initialization unauthenticated without a real Supabase user', async () => {
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
      isAuthenticated: false,
      userRole: 'member',
      userStatus: 'guest',
      authView: 'login',
    });
    expect(useAuthStore.getState().memberProfile).toBeNull();
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
      showNotifications: false,
      settlementNotification: null,
      showJoinForm: false,
      activeClubId: 'club-test',
      teamName: 'FC moim',
      availableClubs: [],
    });
    useScheduleStore.setState({
      activePolls: [activePoll],
      activePollsStatus: 'ready',
      activePollsError: null,
      upcomingMatches: [],
      upcomingMatchesStatus: 'ready',
      upcomingMatchesError: null,
      calendarMatches: [],
      calendarMatchesStatus: 'idle',
      calendarMatchesError: null,
    });
    useAnnouncementStore.setState({
      announcements: [],
      announcementsStatus: 'ready',
      announcementsError: null,
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

      expect(screen.getAllByText('투표중').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: '3월 21일, 1개 일정' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3월 22일, 1개 일정' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders rich May demo calendar entries for every event category', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 1));

    try {
      useScheduleStore.setState({
        activePolls: [{
          ...activePoll,
          id: 'may-poll',
          options: [{ id: 'may-poll-option', pollId: 'may-poll', optionDate: '2026-05-22', sortOrder: 0 }],
          votes: [],
        }],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [
          createCalendarMatch('may-match', '경기', '2026-05-20T20:00:00.000+09:00', 'match'),
          createCalendarMatch('may-training', '전지훈련', '2026-05-21T20:00:00.000+09:00', 'training'),
          createCalendarMatch('may-seminar', '정신교육', '2026-05-24T20:00:00.000+09:00', 'seminar'),
          createCalendarMatch('may-etc', '기타', '2026-05-25T20:00:00.000+09:00', 'etc'),
        ],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
      });

      const { container } = render(<ScheduleTab />);

      ['5월 20일, 1개 일정', '5월 21일, 1개 일정', '5월 22일, 1개 일정', '5월 24일, 1개 일정', '5월 25일, 1개 일정'].forEach((name) => {
        expect(screen.getByRole('button', { name })).toBeInTheDocument();
      });
      ['경기', '투표중', '정신교육', '전지훈련', '기타'].forEach((label) => {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      });
      expect(container.querySelector('.bg-event-match-icon-bg')).toBeInTheDocument();
      expect(container.querySelector('.bg-event-training-icon-bg')).toBeInTheDocument();
      expect(container.querySelector('.bg-event-seminar-icon-bg')).toBeInTheDocument();
      expect(container.querySelector('.bg-event-etc-icon-bg')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5월 20일, 1개 일정' }).querySelector('span')).not.toHaveClass('bg-red-team-bg');
      expect(container.querySelector('.lucide-vote')).toBeInTheDocument();
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
    await user.click(screen.getByText(/3월 21일 토 19:00/));
    expect(screen.getByRole('button', { name: '투표 제출하기' })).toHaveClass('bg-feedback-warning');
    expect(screen.getByRole('button', { name: '아쉽지만 불참' })).toHaveClass('hover:shadow-sm');
  });

  it('keeps internal upcoming match errors out of the home card', () => {
    useScheduleStore.setState({
      upcomingMatches: [],
      upcomingMatchesStatus: 'error',
      upcomingMatchesError: '확정 일정을 불러오지 못했어요.',
    });

    render(<HomeTab />);

    expect(screen.getByRole('alert')).toHaveTextContent('확정 일정을 불러오지 못했어요.');
    expect(screen.queryByText('Failed to fetch upcoming matches.')).not.toBeInTheDocument();
  });

  it('shows weather and fine dust forecast on the upcoming match card', () => {
    useScheduleStore.setState({
      upcomingMatches: [
        {
          id: 'match-weather',
          clubId: 'club-test',
          seasonId: 'season-1',
          round: null,
          title: 'Round 7',
          date: '2026-06-13T20:00:00.000+09:00',
          location: '잠실 풋살파크',
          type: 'match',
          status: 'scheduled',
          ourScore: null,
          oppScore: null,
          tacticsCompleted: false,
          memo: null,
          createdByMembershipId: 'membership-admin',
          cancellationReason: null,
          cancelledAt: null,
        },
      ],
      upcomingMatchesStatus: 'ready',
      upcomingMatchesError: null,
    });

    const { container } = render(<HomeTab />);

    const scheduleIcon = container.querySelector('img[src*="svgrepo-football.svg"]');
    expect(scheduleIcon).toBeInTheDocument();
    expect(scheduleIcon).toHaveClass('animate-counter-spin');
    expect(screen.getByText('6월 13일 토 20:00')).toHaveClass('text-blue-team');
    expect(screen.getByText('잠실 풋살파크')).toHaveClass('text-blue-team');
    expect(container.querySelector('.lucide-clock-3')).toHaveClass('text-blue-team');
    expect(container.querySelector('.lucide-map-pin')).toHaveClass('text-blue-team');
    const forecastLink = screen.getByRole('link', { name: /경기일 예보/ });
    expect(forecastLink).toHaveAttribute('href', expect.stringContaining('search.naver.com'));
    expect(decodeURIComponent(forecastLink.getAttribute('href') ?? '')).toContain('잠실 풋살파크 날씨');
    expect(forecastLink).toHaveAttribute('target', '_blank');
    expect(screen.getByText('날씨')).toBeInTheDocument();
    expect(screen.getByText('맑음 24°')).toBeInTheDocument();
    expect(screen.getByText('미세먼지')).toBeInTheDocument();
    expect(screen.getByText('보통')).toBeInTheDocument();
  });

  it('renders compact comments composer without an empty placeholder panel', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })));

    render(
      <EventComments
        clubId="club-test"
        targetType="schedule_poll_option"
        targetId="poll-empty-comments"
        showPhase={false}
      />,
    );

    expect(await screen.findByLabelText('덕담 0개')).toBeInTheDocument();
    expect(screen.getByText('덕담')).toBeInTheDocument();
    expect(screen.getByLabelText('덕담')).toBeInTheDocument();
    expect(screen.queryByText('...')).not.toBeInTheDocument();
    expect(screen.queryByText('아직 등록된 코멘트가 없어요')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '코멘트' })).not.toBeInTheDocument();
  });

  it('skips past confirmed matches on the next schedule card', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-05-20T23:50:00+09:00'));

    try {
      useScheduleStore.setState({
        upcomingMatches: [
          {
            id: 'past-match',
            clubId: 'club-test',
            seasonId: 'season-1',
            round: null,
            title: '5월 지난 경기',
            date: '2026-05-15T18:00:00+09:00',
            location: '서울 영등포 SKY풋살파크',
            type: 'match',
            status: 'scheduled',
            ourScore: null,
            oppScore: null,
            tacticsCompleted: false,
            memo: null,
            createdByMembershipId: 'membership-admin',
            cancellationReason: null,
            cancelledAt: null,
          },
          {
            id: 'future-match',
            clubId: 'club-test',
            seasonId: 'season-1',
            round: null,
            title: '6월 다음 경기',
            date: '2026-06-06T20:00:00+09:00',
            location: '잠실 풋살파크',
            type: 'match',
            status: 'scheduled',
            ourScore: null,
            oppScore: null,
            tacticsCompleted: false,
            memo: null,
            createdByMembershipId: 'membership-admin',
            cancellationReason: null,
            cancelledAt: null,
          },
        ],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
      });

      render(<HomeTab />);

      expect(screen.queryByText('5월 지난 경기')).not.toBeInTheDocument();
      expect(screen.getByText('6월 다음 경기')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('limits active poll cards on home notices to two', () => {
    useScheduleStore.setState({
      activePolls: [
        { ...activePoll, id: 'poll-1', title: '첫 번째 투표' },
        { ...activePoll, id: 'poll-2', title: '두 번째 투표' },
        { ...activePoll, id: 'poll-3', title: '세 번째 투표' },
      ],
      activePollsStatus: 'ready',
      activePollsError: null,
      upcomingMatches: [],
      upcomingMatchesStatus: 'ready',
      upcomingMatchesError: null,
    });

    render(<HomeTab />);

    expect(screen.getByText('첫 번째 투표')).toBeInTheDocument();
    expect(screen.getByText('두 번째 투표')).toBeInTheDocument();
    expect(screen.queryByText('세 번째 투표')).not.toBeInTheDocument();
  });

  it('shows confirmed match details and tactics instead of the empty state on selected match dates', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 1));

    try {
      useScheduleStore.setState({
        selectedDate: 17,
        activePolls: [],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [
          {
            id: 'match-confirmed',
            clubId: 'club-test',
            seasonId: 'season-1',
            round: 7,
            title: '5월 확정 경기',
            date: '2026-05-17T09:00:00.000Z',
            location: '서울 용산 풋살장',
            type: 'match',
            status: 'scheduled',
            ourScore: null,
            oppScore: null,
            tacticsCompleted: false,
            memo: null,
            createdByMembershipId: 'membership-admin',
            cancellationReason: null,
            cancelledAt: null,
          },
        ],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
      });
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/membership/approved')) {
          return new Response(JSON.stringify([
            createApprovedMember('membership-admin', OWNER_PROFILE_NAME, 'admin'),
            createApprovedMember('membership-member', '김멤버', 'member'),
          ]), { status: 200 });
        }
        if (url.startsWith('/api/matches/attendees')) {
          return new Response(JSON.stringify([
            {
              matchId: 'match-confirmed',
              membershipId: 'membership-admin',
              status: 'attend',
              playerName: OWNER_PROFILE_NAME,
              playerOvr: 70,
              playerPhotoUrl: null,
              matchPoints: 2000,
            },
            {
              matchId: 'match-confirmed',
              membershipId: 'membership-member',
              status: 'attend',
              playerName: '김멤버',
              playerOvr: 66,
              playerPhotoUrl: null,
              matchPoints: 900,
            },
          ]), { status: 200 });
        }
        if (url.startsWith('/api/matches/lineup')) {
          return new Response(JSON.stringify([
            {
              id: 'lineup-red-leader',
              matchId: 'match-confirmed',
              membershipId: 'membership-admin',
              teamNumber: 1,
              isLeader: true,
              position: 'MF',
              playerName: OWNER_PROFILE_NAME,
              playerPosition: null,
              playerOvr: 70,
              playerPhotoUrl: null,
              playerMatchPoints: 2000,
            },
            {
              id: 'lineup-blue-leader',
              matchId: 'match-confirmed',
              membershipId: 'membership-member',
              teamNumber: 2,
              isLeader: true,
              position: 'MF',
              playerName: '김멤버',
              playerPosition: null,
              playerOvr: 66,
              playerPhotoUrl: null,
              playerMatchPoints: 900,
            },
          ]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      const { container } = render(<ScheduleTab />);
      vi.useRealTimers();

      expect(screen.queryByText('텅')).not.toBeInTheDocument();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
        '/api/matches/lineup?clubId=club-test&matchId=match-confirmed',
        expect.objectContaining({ method: 'GET' }),
      ));
      await waitFor(() => expect(container.querySelector('[data-testid="tactics-field"]')).toBeInTheDocument());
      expect(screen.getByText('5월 확정 경기')).toBeInTheDocument();
      expect(screen.queryByText('정규리그 Round 7')).not.toBeInTheDocument();
      expect(screen.queryByText('확정 경기')).not.toBeInTheDocument();
      expect(screen.queryByText('맑음 24°')).not.toBeInTheDocument();
      expect(screen.queryByText('보통')).not.toBeInTheDocument();
      expect(screen.queryByText('전술 설정이 완료되었습니다.')).not.toBeInTheDocument();
      expect(screen.queryByText('경기 시간이 지났어요. 운영진의 종료 처리를 기다리는 중입니다.')).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="tactics-field"]')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Red 전술 확정' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Blue 전술 확정' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('tactics-kick-arena')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Red' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Blue' })).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="red-tactics-zone"]')).not.toHaveClass('border-red-team-border');
      expect(container.querySelector('[data-testid="blue-tactics-zone"]')).not.toHaveClass('border-blue-team-border');
      expect(screen.getByLabelText('Red 6x3 배치 구획')).toBeInTheDocument();
      expect(screen.getByLabelText('Blue 6x3 배치 구획')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="red-tactics-slot-17"]')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: OWNER_PROFILE_NAME })).toHaveClass('border-red-team');
      expect(screen.getByRole('button', { name: '김멤버' })).toHaveClass('border-blue-team');
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders finished match result, post-match comments, and settlement CTA for losing team members', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 22));

    try {
      useAppStore.setState({
        availableClubs: [{ membershipId: 'membership-red', clubId: 'club-test', clubName: 'FC moim', role: 'member' }],
      });
      useScheduleStore.setState({
        selectedDate: 17,
        activePolls: [],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [
          {
            ...createCalendarMatch('finished-match', 'Round 7', '2026-05-17T20:00:00.000+09:00', 'match'),
            status: 'finished',
            ourScore: 1,
            oppScore: 3,
            tacticsCompleted: true,
            updatedAt: '2026-05-17T21:00:00.000+09:00',
          },
        ],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
      });
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/matches/attendees')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.startsWith('/api/matches/lineup')) {
          return new Response(JSON.stringify([
            {
              id: 'red-player',
              matchId: 'finished-match',
              membershipId: 'membership-red',
              teamNumber: 1,
              isLeader: true,
              position: 'MF',
              playerName: '레드멤버',
              playerPosition: null,
              playerOvr: 65,
              playerPhotoUrl: null,
              playerMatchPoints: 100,
            },
            {
              id: 'blue-player',
              matchId: 'finished-match',
              membershipId: 'membership-blue',
              teamNumber: 2,
              isLeader: true,
              position: 'MF',
              playerName: '블루멤버',
              playerPosition: null,
              playerOvr: 67,
              playerPhotoUrl: null,
              playerMatchPoints: 100,
            },
          ]), { status: 200 });
        }
        if (url.startsWith('/api/comments')) {
          return new Response(JSON.stringify([
            {
              id: 'post-comment',
              targetType: 'match',
              targetId: 'finished-match',
              membershipId: 'membership-blue',
              authorName: '블루멤버',
              content: '경기 끝!',
              createdAt: '2026-05-17T22:00:00.000+09:00',
            },
          ]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }));

      render(
        <>
          <Header />
          <ScheduleTab />
          <NotificationPanel />
        </>,
      );
      vi.useRealTimers();

      await screen.findByText('경기 결과');
      expect(screen.getByText('Round 7')).toBeInTheDocument();
      expect(screen.getByText('5월 17일 일 20:00')).toBeInTheDocument();
      expect(screen.getByText('잠실 풋살파크')).toBeInTheDocument();
      const resultField = screen.getByTestId('match-result-field');
      expect(resultField).toBeInTheDocument();
      const resultCard = resultField.closest('.bg-event-match-bg');
      expect(resultCard).toBeInTheDocument();
      expect(resultCard).toHaveClass('rounded-3xl', 'border-event-match-border', 'p-5');
      expect(within(resultCard as HTMLElement).getByText('종료')).toBeInTheDocument();
      expect(within(resultCard as HTMLElement).getByText('2/2명 참석')).toBeInTheDocument();
      expect(screen.getByTestId('match-result-section')).not.toHaveClass('tactics-frame', 'overflow-hidden');
      expect(within(resultField).getByText('VS')).toBeInTheDocument();
      expect(within(resultField).getByText('1')).toHaveClass('text-red-team');
      expect(within(resultField).getByText('3')).toHaveClass('text-blue-team');
      expect(screen.getByTestId('red-result-side')).toHaveClass('opacity-60', 'saturate-50', 'bg-surface-card/20');
      expect(screen.getByTestId('blue-result-side')).not.toHaveClass('opacity-60');
      const redResultAvatar = screen.getByTestId('red-result-avatar-6');
      expect(redResultAvatar).toHaveAttribute('tabindex', '0');
      expect(redResultAvatar).toHaveClass('group', 'border-red-team');
      expect(within(redResultAvatar).getByText('레드멤버')).toHaveClass('group-hover:opacity-100', 'group-focus-visible:opacity-100');
      expect(within(redResultAvatar).getByText('C')).toHaveClass('bg-red-team');
      const blueResultAvatar = screen.getByTestId('blue-result-avatar-11');
      expect(blueResultAvatar).toHaveClass('group', 'border-blue-team');
      expect(within(blueResultAvatar).getByText('블루멤버')).toHaveClass('group-hover:opacity-100', 'group-focus-visible:opacity-100');
      expect(within(blueResultAvatar).getByText('C')).toHaveClass('bg-blue-team');
      expect(screen.queryByTestId('tactics-kick-arena')).not.toBeInTheDocument();
      expect(screen.queryByText('Win')).not.toBeInTheDocument();
      expect(screen.queryByText('Lose')).not.toBeInTheDocument();
      const resultMapLink = screen.getByRole('link', { name: '잠실 풋살파크 네이버지도 열기' });
      expect(resultCard).toContainElement(resultMapLink);
      expect(resultMapLink).toHaveAttribute('href', `https://map.naver.com/p/search/${encodeURIComponent('잠실 풋살파크')}`);
      expect(resultMapLink).toHaveAttribute('target', '_blank');
      expect(resultMapLink.querySelector('.lucide-map-pin')?.closest('a')).toBe(resultMapLink);
      expect(screen.queryByText('확정 경기')).not.toBeInTheDocument();
      expect(screen.queryByText('졌다.. 겜비내자')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '정산하기' })).not.toBeInTheDocument();
      expect(await screen.findByText('경기 끝!')).toBeInTheDocument();
      expect(screen.getByText(/경기전|경기후/)).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: '알림 열기' }));
      expect(screen.getByRole('dialog', { name: '알림' })).toBeInTheDocument();
      expect(screen.getByText('졌다.. 겜비내자')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '정산하기' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not show settlement notification to the winning team member', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 22));

    try {
      useAppStore.setState({
        availableClubs: [{ membershipId: 'membership-blue', clubId: 'club-test', clubName: 'FC moim', role: 'member' }],
      });
      useScheduleStore.setState({
        selectedDate: 17,
        activePolls: [],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [
          {
            ...createCalendarMatch('finished-match', 'Round 7', '2026-05-17T20:00:00.000+09:00', 'match'),
            status: 'finished',
            ourScore: 1,
            oppScore: 3,
            tacticsCompleted: true,
            updatedAt: '2026-05-17T21:00:00.000+09:00',
          },
        ],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
      });
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/matches/attendees')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.startsWith('/api/matches/lineup')) {
          return new Response(JSON.stringify([
            createLineupEntry('membership-red', 1, true, '레드멤버', 0),
            createLineupEntry('membership-blue', 2, true, '블루멤버', 5),
          ]), { status: 200 });
        }
        if (url.startsWith('/api/comments')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }));

      render(
        <>
          <Header />
          <ScheduleTab />
          <NotificationPanel />
        </>,
      );
      vi.useRealTimers();

      await screen.findByText('경기 결과');
      await userEvent.click(screen.getByRole('button', { name: '알림 열기' }));
      expect(screen.getByRole('dialog', { name: '알림' })).toBeInTheDocument();
      expect(screen.getByText('새로운 알림이 없어요')).toBeInTheDocument();
      expect(screen.queryByText('졌다.. 겜비내자')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets managers save past match results without sending client-side settlement deltas', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 22));

    try {
      const user = userEvent.setup();
      const lineup = [
        createLineupEntry('membership-red', 1, true, '레드멤버', 6),
        createLineupEntry('membership-blue', 2, true, '블루멤버', 11),
      ];
      useAppStore.setState({ userRole: 'operator' });
      useScheduleStore.setState({
        selectedDate: 17,
        activePolls: [],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
        calendarMatches: [{
          ...createCalendarMatch('past-match', 'Round 8', '2026-05-17T20:00:00.000+09:00', 'match'),
          tacticsCompleted: true,
          redLeaderConfirmed: true,
          blueLeaderConfirmed: true,
        }],
        calendarMatchesStatus: 'ready',
        calendarMatchesError: null,
      });
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.startsWith('/api/matches/attendees')) {
          return new Response(JSON.stringify([
            {
              matchId: 'past-match',
              membershipId: 'membership-red',
              status: 'attend',
              playerName: '레드멤버',
              playerOvr: 70,
              playerPhotoUrl: null,
              matchPoints: 100,
            },
            {
              matchId: 'past-match',
              membershipId: 'membership-blue',
              status: 'attend',
              playerName: '블루멤버',
              playerOvr: 70,
              playerPhotoUrl: null,
              matchPoints: 100,
            },
          ]), { status: 200 });
        }
        if (url.startsWith('/api/matches/lineup')) {
          return new Response(JSON.stringify(lineup), { status: 200 });
        }
        if (url === '/api/match-results' && init?.method === 'POST') {
          return new Response(JSON.stringify({ matchId: 'past-match', saved: true }), { status: 200 });
        }
        if (url.startsWith('/api/matches?')) {
          return new Response(JSON.stringify([{
            ...createCalendarMatch('past-match', 'Round 8', '2026-05-17T20:00:00.000+09:00', 'match'),
            status: 'finished',
            ourScore: 2,
            oppScore: 1,
            tacticsCompleted: true,
            updatedAt: '2026-05-17T21:00:00.000+09:00',
          }]), { status: 200 });
        }
        if (url.startsWith('/api/schedule-polls')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.startsWith('/api/comments')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<ScheduleTab />);
      vi.useRealTimers();

      await screen.findByRole('button', { name: '경기 결과 입력' });
      await user.click(screen.getByRole('button', { name: '경기 결과 입력' }));

      expect(screen.getByRole('heading', { name: '경기 결과 입력' })).toBeInTheDocument();
      expect(screen.queryByText(/MOM/)).not.toBeInTheDocument();
      expect(screen.getAllByText('레드멤버').length).toBeGreaterThan(0);
      expect(screen.getAllByText('블루멤버').length).toBeGreaterThan(0);

      await user.clear(screen.getByLabelText('Red'));
      await user.type(screen.getByLabelText('Red'), '2');
      await user.clear(screen.getByLabelText('Blue'));
      await user.type(screen.getByLabelText('Blue'), '1');
      await user.click(screen.getByRole('button', { name: '레드멤버 골 증가' }));
      await user.click(screen.getByRole('button', { name: '블루멤버 도움 증가' }));
      await user.click(screen.getByRole('button', { name: '경기 종료 처리' }));

      expect(screen.getByRole('heading', { name: '경기 결과 최종 확인' })).toBeInTheDocument();
      expect(screen.getByText('경기 결과는 제출 후 수정할 수 없습니다.')).toBeInTheDocument();
      expect(screen.getByText(/위 점수로 경기 결과를 확정하시겠습니까/)).toBeInTheDocument();
      expect(fetchMock.mock.calls.some(([url, init]) => url === '/api/match-results' && init?.method === 'POST')).toBe(false);
      await user.click(screen.getByRole('button', { name: '최종 확정' }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/match-results', expect.objectContaining({
        method: 'POST',
      })));
      const resultCall = fetchMock.mock.calls.find(([url, init]) => url === '/api/match-results' && init?.method === 'POST');
      expect(resultCall).toBeTruthy();
      const body = JSON.parse(String(resultCall?.[1]?.body));
      expect(body).toEqual({
        clubId: 'club-test',
        matchId: 'past-match',
        score: { home: 2, away: 1 },
        playerStats: [
          { membershipId: 'membership-red', goals: 1, assists: 0 },
          { membershipId: 'membership-blue', goals: 0, assists: 1 },
        ],
      });
      expect(JSON.stringify(body)).not.toContain('ovrDelta');
      expect(JSON.stringify(body)).not.toContain('pointDelta');
      expect(JSON.stringify(body)).not.toContain('isMom');
      await screen.findByText('경기 결과');
      const resultField = screen.getByTestId('match-result-field');
      expect(within(resultField).getByText('2')).toHaveClass('text-red-team');
      expect(within(resultField).getByText('1')).toHaveClass('text-blue-team');
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks inconsistent match result stats before opening final confirmation', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 22));

    try {
      const user = userEvent.setup();
      const lineup = [
        createLineupEntry('membership-red', 1, true, '레드멤버', 6),
        createLineupEntry('membership-blue', 2, true, '블루멤버', 11),
      ];
      useAppStore.setState({ userRole: 'operator' });
      useScheduleStore.setState({
        selectedDate: 17,
        activePolls: [],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
        calendarMatches: [{
          ...createCalendarMatch('past-match', 'Round 8', '2026-05-17T20:00:00.000+09:00', 'match'),
          tacticsCompleted: true,
          redLeaderConfirmed: true,
          blueLeaderConfirmed: true,
        }],
        calendarMatchesStatus: 'ready',
        calendarMatchesError: null,
      });
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/matches/attendees')) {
          return new Response(JSON.stringify([
            {
              matchId: 'past-match',
              membershipId: 'membership-red',
              status: 'attend',
              playerName: '레드멤버',
              playerOvr: 70,
              playerPhotoUrl: null,
              matchPoints: 100,
            },
            {
              matchId: 'past-match',
              membershipId: 'membership-blue',
              status: 'attend',
              playerName: '블루멤버',
              playerOvr: 70,
              playerPhotoUrl: null,
              matchPoints: 100,
            },
          ]), { status: 200 });
        }
        if (url.startsWith('/api/matches/lineup')) {
          return new Response(JSON.stringify(lineup), { status: 200 });
        }
        if (url.startsWith('/api/comments')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<ScheduleTab />);
      vi.useRealTimers();

      await screen.findByRole('button', { name: '경기 결과 입력' });
      await user.click(screen.getByRole('button', { name: '경기 결과 입력' }));
      await user.clear(screen.getByLabelText('Red'));
      await user.type(screen.getByLabelText('Red'), '1');
      await user.clear(screen.getByLabelText('Blue'));
      await user.type(screen.getByLabelText('Blue'), '0');
      await user.click(screen.getByRole('button', { name: '레드멤버 골 증가' }));
      await user.click(screen.getByRole('button', { name: '레드멤버 골 증가' }));
      await user.click(screen.getByRole('button', { name: '경기 종료 처리' }));

      expect(useToastStore.getState().message).toBe('Red 팀의 최종 점수(1)보다 선수의 골 수 합계(2)가 더 많을 수 없습니다.');
      expect(screen.queryByRole('heading', { name: '경기 결과 최종 확인' })).not.toBeInTheDocument();
      expect(fetchMock.mock.calls.some(([url]) => url === '/api/match-results')).toBe(false);
    } finally {
      vi.useRealTimers();
      useToastStore.setState({ message: null });
    }
  });

  it('hides result input when a past match has no confirmed two-team lineup', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 22));

    try {
      useAppStore.setState({ userRole: 'operator' });
      useScheduleStore.setState({
        selectedDate: 20,
        activePolls: [],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
        calendarMatches: [{
          ...createCalendarMatch('past-match-without-lineup', '5월 야간 풋살', '2026-05-20T21:00:00.000+09:00', 'match'),
          tacticsCompleted: false,
        }],
        calendarMatchesStatus: 'ready',
        calendarMatchesError: null,
      });
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/matches/attendees')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.startsWith('/api/matches/lineup')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.startsWith('/api/comments')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }));

      render(<ScheduleTab />);
      vi.useRealTimers();

      await screen.findByText('5월 야간 풋살');
      expect(await screen.findByText('종료')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '경기 결과 입력' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: '경기 결과 입력' })).not.toBeInTheDocument();
      expect(screen.queryByText('전술 라인업을 먼저 확정해야 합니다')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps confirmed match tactics visible when a poll exists on the same date', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 5, 1));

    try {
      useAppStore.setState({ userRole: 'member' });
      useScheduleStore.setState({
        selectedDate: 6,
        activePolls: [{
          ...activePoll,
          id: 'poll-same-date',
          options: [{ id: 'same-date-option', pollId: 'poll-same-date', optionDate: '2026-06-06', sortOrder: 0 }],
          votes: [],
        }],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [
          {
            id: 'match-same-date',
            clubId: 'club-test',
            seasonId: 'season-1',
            round: null,
            title: 'Round 7',
            date: '2026-06-06T20:00:00.000+09:00',
            location: '잠실 풋살파크',
            type: 'match',
            status: 'scheduled',
            ourScore: null,
            oppScore: null,
            tacticsCompleted: false,
            memo: null,
            createdByMembershipId: 'membership-admin',
            cancellationReason: null,
            cancelledAt: null,
          },
        ],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
      });
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/matches/attendees') || url.startsWith('/api/matches/lineup')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.startsWith('/api/comments')) {
          return new Response(JSON.stringify([
            {
              id: 'pre-comment',
              targetType: 'match',
              targetId: 'match-same-date',
              membershipId: 'membership-admin',
              authorName: OWNER_PROFILE_NAME,
              content: '전술 확인 부탁!',
              createdAt: '2026-05-17T18:00:00.000+09:00',
            },
          ]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }));

      render(<ScheduleTab />);
      vi.useRealTimers();

      expect(screen.getByText('투표 현황')).toBeInTheDocument();
      expect(screen.queryByText('같은 날짜 확정 일정')).not.toBeInTheDocument();
      expect(screen.getAllByText('Round 7').length).toBeGreaterThan(0);
      await screen.findByTestId('match-anticipation-panel');
      expect(screen.getByLabelText('내 프리매치 상태: 프리뷰')).toBeInTheDocument();
      expect(screen.queryByText('경기에 참여할 선수들을 모으고 있어요.')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders comments inside each poll option without mixing options', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 1));

    try {
      useScheduleStore.setState({
        selectedDate: 21,
        activePolls: [{
          ...activePoll,
          options: [
            { id: 'option-1', pollId: activePoll.id, optionDate: '2026-03-21', sortOrder: 0 },
            { id: 'option-2', pollId: activePoll.id, optionDate: '2026-03-21', sortOrder: 1, displayTime: '20:00' },
          ],
        }],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
      });
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/comments')) {
          const params = new URLSearchParams(url.split('?')[1] ?? '');
          expect(params.get('targetType')).toBe('schedule_poll_option');
          if (params.get('targetId') === 'option-1') {
            return new Response(JSON.stringify([
              {
                id: 'option-1-comment',
                targetType: 'schedule_poll_option',
                targetId: 'option-1',
                membershipId: 'membership-admin',
                authorName: OWNER_PROFILE_NAME,
                content: '옵션 A 코멘트',
                createdAt: '2026-03-20T18:00:00.000+09:00',
              },
            ]), { status: 200 });
          }
          if (params.get('targetId') === 'option-2') {
            return new Response(JSON.stringify([
              {
                id: 'option-2-comment',
                targetType: 'schedule_poll_option',
                targetId: 'option-2',
                membershipId: 'membership-admin',
                authorName: OWNER_PROFILE_NAME,
                content: '옵션 B 코멘트',
                createdAt: '2026-03-20T19:00:00.000+09:00',
              },
            ]), { status: 200 });
          }
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify([]), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<ScheduleTab />);
      vi.useRealTimers();

      expect(screen.getByText('투표 현황')).toBeInTheDocument();
      await screen.findByText('옵션 A 코멘트');
      await screen.findByText('옵션 B 코멘트');
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('targetId=option-1'), expect.anything());
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('targetId=option-2'), expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets operators promote a selected poll option from the calendar detail with icon-only confirmation', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 1));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const originalShowToast = useToastStore.getState().showToast;
    const showToast = vi.fn((message: string) => {
      useToastStore.setState({ message });
    });

    try {
      useToastStore.setState({ message: null, showToast });
      useScheduleStore.setState({
        selectedDate: 21,
        activePolls: [activePoll],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
        calendarMatches: [],
        calendarMatchesStatus: 'ready',
        calendarMatchesError: null,
      });

      const promotedMatch = createCalendarMatch(
        'match-promoted',
        '3월 친선 경기 일정 투표',
        '2026-03-21T19:00:00.000+09:00',
        'match',
      );
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === '/api/schedule-polls/promote') {
          expect(init?.method).toBe('POST');
          expect(JSON.parse(String(init?.body))).toMatchObject({
            clubId: 'club-test',
            pollId: activePoll.id,
            optionId: 'option-1',
          });
          return new Response(JSON.stringify({ pollId: activePoll.id, matchId: promotedMatch.id }), { status: 200 });
        }
        if (url.startsWith('/api/matches?')) {
          return new Response(JSON.stringify([promotedMatch]), { status: 200 });
        }
        if (url.startsWith('/api/schedule-polls?')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.startsWith('/api/comments') || url.startsWith('/api/matches/attendees') || url.startsWith('/api/matches/lineup')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        return new Response(JSON.stringify([]), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<ScheduleTab />);

      expect(screen.queryByText('대표 날짜 확정')).not.toBeInTheDocument();
      expect(screen.queryByText('투표 결과를 경기로 확정할 차례')).not.toBeInTheDocument();
      const promoteButton = screen.getByRole('button', { name: /3월 21일 토 19:00.*경기 일정으로 확정$/ });

      await user.click(promoteButton);

      expect(screen.getByRole('button', { name: /3월 21일 토 19:00.*경기 일정으로 확정 실행$/ })).toBeInTheDocument();
      const cancelButton = screen.getByRole('button', { name: /3월 21일 토 19:00.*경기 일정으로 확정 취소$/ });
      await user.click(cancelButton);
      expect(screen.queryByRole('button', { name: /경기 일정으로 확정 실행$/ })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /3월 21일 토 19:00.*경기 일정으로 확정$/ }));
      await user.click(screen.getByRole('button', { name: /3월 21일 토 19:00.*경기 일정으로 확정 실행$/ }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/schedule-polls/promote', expect.objectContaining({
        method: 'POST',
      })));
      expect(useScheduleStore.getState().selectedDate).toBe(21);
      await waitFor(() => expect(showToast).toHaveBeenCalledWith('일정 확정'));
    } finally {
      useToastStore.setState({ message: null, showToast: originalShowToast });
      vi.useRealTimers();
    }
  });

  it('does not show poll option promote controls to regular members', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 1));

    try {
      useAppStore.setState({ userRole: 'member', userStatus: 'approved' });
      useScheduleStore.setState({
        selectedDate: 21,
        activePolls: [activePoll],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
        calendarMatches: [],
        calendarMatchesStatus: 'ready',
        calendarMatchesError: null,
      });
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })));

      render(<ScheduleTab />);

      expect(screen.getByText('투표 현황')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /경기 일정으로 확정/ })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders non-match event panels without loading tactics', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 22));

    try {
      const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      useScheduleStore.setState({
        selectedDate: 21,
        activePolls: [],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [
          createCalendarMatch('may-training', '피지컬 전지훈련', '2026-05-21T20:00:00.000+09:00', 'training'),
        ],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
      });

      render(<ScheduleTab />);

      expect(screen.getAllByText('전지훈련').length).toBeGreaterThan(0);
      expect(screen.getByLabelText('전지훈련 일정 상세')).toBeInTheDocument();
      expect(screen.getByText('피지컬 전지훈련')).toBeInTheDocument();
      expect(within(screen.getByLabelText('전지훈련 일정 상세')).getByText('종료')).toBeInTheDocument();
      expect(within(screen.getByLabelText('전지훈련 일정 상세')).queryByText('훈련')).not.toBeInTheDocument();
      const mapLink = screen.getByRole('link', { name: '잠실 풋살파크 네이버지도 열기' });
      expect(mapLink).toHaveAttribute('href', `https://map.naver.com/p/search/${encodeURIComponent('잠실 풋살파크')}`);
      expect(mapLink).toHaveAttribute('target', '_blank');
      expect(mapLink.querySelector('.lucide-map-pin')?.closest('a')).toBe(mapLink);
      expect(screen.queryByText('일시')).not.toBeInTheDocument();
      expect(screen.queryByText('장소')).not.toBeInTheDocument();
      expect(screen.queryByText('카카오지도')).not.toBeInTheDocument();
      expect(screen.queryByText('네이버지도')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('할 말 있나?')).toBeInTheDocument();
      expect(screen.queryByText('전술 설정')).not.toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/matches\/lineup/),
        expect.anything(),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders match comments with the match-only tactics panel', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 1));

    try {
      useScheduleStore.setState({
        selectedDate: 17,
        activePolls: [],
        activePollsStatus: 'ready',
        activePollsError: null,
        upcomingMatches: [
          createCalendarMatch('match-with-comments', '5월 코멘트 경기', '2026-05-17T20:00:00.000+09:00', 'match'),
        ],
        upcomingMatchesStatus: 'ready',
        upcomingMatchesError: null,
      });
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/matches/attendees') || url.startsWith('/api/matches/lineup')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.startsWith('/api/comments')) {
          return new Response(JSON.stringify([
            {
              id: 'pre-comment',
              targetType: 'match',
              targetId: 'match-with-comments',
              membershipId: 'membership-admin',
              authorName: OWNER_PROFILE_NAME,
              content: '전술 확인 부탁!',
              createdAt: '2026-05-17T18:00:00.000+09:00',
            },
          ]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }));

      const { container } = render(<ScheduleTab />);
      vi.useRealTimers();

      await waitFor(() => expect(container.querySelector('[data-testid="tactics-field"]')).toBeInTheDocument());
      expect(screen.getByLabelText('덕담')).toBeInTheDocument();
      await screen.findByText('전술 확인 부탁!');
      expect(screen.getByText('덕담')).toBeInTheDocument();
      expect(screen.getByLabelText('덕담 1개')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: '코멘트' })).not.toBeInTheDocument();
      expect(screen.getByText('경기전')).toBeInTheDocument();
      expect(screen.getByText('전술 확인 부탁!')).toBeInTheDocument();
      expect(screen.queryByText(':')).not.toBeInTheDocument();
      expect(container.querySelector('div.border-t.border-border\\/40')).toBeInTheDocument();
      expect(container.querySelector('img[src="/icons/svgrepo-soccer-player.svg"]')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('할 말 있나?')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('removes cancelled confirmed matches from the schedule store immediately', async () => {
    const match = {
      id: 'match-to-cancel',
      clubId: 'club-test',
      seasonId: 'season-1',
      round: null,
      title: '취소 예정 경기',
      date: '2026-05-17T09:00:00.000Z',
      location: '서울 용산 풋살장',
      type: 'match' as const,
      status: 'scheduled' as const,
      ourScore: null,
      oppScore: null,
      tacticsCompleted: false,
      memo: null,
      createdByMembershipId: 'membership-admin',
      cancellationReason: null,
      cancelledAt: null,
    };
    useScheduleStore.setState({
      upcomingMatches: [match],
      upcomingMatchesStatus: 'ready',
      upcomingMatchesError: null,
    });
    vi.stubGlobal('fetch', vi.fn(async () => (
      new Response(JSON.stringify({
        ...match,
        status: 'cancelled',
        cancellationReason: '강설로 인한 취소',
        cancelledAt: '2026-05-16T10:00:00.000Z',
      }), { status: 200 })
    )));

    await useScheduleStore.getState().cancelUpcomingMatch({
      clubId: 'club-test',
      matchId: 'match-to-cancel',
      cancellationReason: '강설로 인한 취소',
    });

    expect(useScheduleStore.getState().upcomingMatches).toEqual([]);
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

  it('surfaces pinned announcements on Home and opens Community announcement content', async () => {
    const user = userEvent.setup();
    useScheduleStore.setState({
      activePolls: [],
      activePollsStatus: 'ready',
      activePollsError: null,
    });
    useAnnouncementStore.setState({
      announcements: [
        {
          id: 'announcement-1',
          clubId: 'club-test',
          seasonId: null,
          title: '25/26 새 시즌 OVR 초기화 안내',
          content: '새 시즌을 맞아 OVR이 초기화됩니다.',
          authorMembershipId: 'membership-admin',
          isPinned: true,
          createdAt: '2026-05-17T00:00:00.000Z',
          updatedAt: '2026-05-17T00:00:00.000Z',
        },
      ],
      announcementsStatus: 'ready',
      announcementsError: null,
    });

    render(<HomeTab />);

    expect(screen.getByText('25/26 새 시즌 OVR 초기화 안내')).toBeInTheDocument();

    cleanup();
    render(<CommunityPage />);
    await user.click(screen.getByRole('button', { name: /25\/26 새 시즌 OVR 초기화 안내/ }));

    expect(screen.getByText('새 시즌을 맞아 OVR이 초기화됩니다.')).toBeInTheDocument();
  });

  it('shows announcement edit and delete actions only to club operators', async () => {
    const announcement = {
      id: 'announcement-1',
      clubId: 'club-test',
      seasonId: null,
      title: 'Round 7 공지',
      content: 'Round 7 안내입니다.',
      authorMembershipId: 'membership-admin',
      isPinned: true,
      createdAt: '2026-05-17T00:00:00.000Z',
      updatedAt: '2026-05-17T00:00:00.000Z',
    };
    useAnnouncementStore.setState({
      announcements: [announcement],
      announcementsStatus: 'ready',
      announcementsError: null,
    });
    useAppStore.setState({ userRole: 'member' });

    const memberView = render(<CommunityPage />);
    await userEvent.click(screen.getByRole('button', { name: /Round 7 공지/ }));

    expect(screen.queryByRole('button', { name: 'Round 7 공지 수정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Round 7 공지 삭제' })).not.toBeInTheDocument();

    memberView.unmount();
    useAnnouncementStore.setState({
      announcements: [announcement],
      announcementsStatus: 'ready',
      announcementsError: null,
    });
    useAppStore.setState({ userRole: 'operator' });

    render(<CommunityPage />);
    await userEvent.click(screen.getByRole('button', { name: /Round 7 공지/ }));

    expect(screen.getByRole('button', { name: 'Round 7 공지 수정' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Round 7 공지 삭제' })).toBeInTheDocument();
  });

  it('updates and deletes announcements from the expanded operator card', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/announcements' && init?.method === 'PATCH') {
        expect(JSON.parse(String(init.body))).toMatchObject({
          announcementId: 'announcement-1',
          title: 'Round 8 공지',
          content: 'Round 8 안내입니다.',
          isPinned: false,
        });
        return new Response(JSON.stringify({
          id: 'announcement-1',
          clubId: 'club-test',
          seasonId: null,
          title: 'Round 8 공지',
          content: 'Round 8 안내입니다.',
          authorMembershipId: 'membership-admin',
          isPinned: false,
          createdAt: '2026-05-17T00:00:00.000Z',
          updatedAt: '2026-05-18T00:00:00.000Z',
        }), { status: 200 });
      }
      if (url === '/api/announcements' && init?.method === 'DELETE') {
        expect(JSON.parse(String(init.body))).toMatchObject({ announcementId: 'announcement-1' });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    });
    useAppStore.setState({ userRole: 'operator' });
    useAnnouncementStore.setState({
      announcements: [{
        id: 'announcement-1',
        clubId: 'club-test',
        seasonId: null,
        title: 'Round 7 공지',
        content: 'Round 7 안내입니다.',
        authorMembershipId: 'membership-admin',
        isPinned: true,
        createdAt: '2026-05-17T00:00:00.000Z',
        updatedAt: '2026-05-17T00:00:00.000Z',
      }],
      announcementsStatus: 'ready',
      announcementsError: null,
    });

    render(<CommunityPage />);
    await user.click(screen.getByRole('button', { name: /Round 7 공지/ }));
    await user.click(screen.getByRole('button', { name: 'Round 7 공지 수정' }));
    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), 'Round 8 공지');
    await user.clear(screen.getByLabelText('본문'));
    await user.type(screen.getByLabelText('본문'), 'Round 8 안내입니다.');
    await user.click(screen.getByLabelText('상단 고정'));
    await user.click(screen.getByRole('button', { name: '공지 수정하기' }));

    expect(await screen.findByText('Round 8 공지')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Round 8 공지 삭제' }));
    await user.click(screen.getByRole('button', { name: 'Round 8 공지 삭제 확인' }));

    await waitFor(() => expect(screen.queryByText('Round 8 공지')).not.toBeInTheDocument());
  });

  it('controls tactics visibility based on confirmation state and shows confirm buttons when bench is empty', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 17));

    try {
      useAppStore.setState({
        userRole: 'member',
      });
      useAuthStore.setState({
        memberProfile: createApprovedMember('membership-member', '김멤버', 'member'),
      });
      useScheduleStore.setState({
        selectedDate: 17,
        activePolls: [],
        activePollsStatus: 'ready',
        upcomingMatches: [
          {
            ...createCalendarMatch('match-confirmed', '정규리그 경기', '2026-05-17T20:00:00.000+09:00', 'match'),
            status: 'scheduled',
            tacticsCompleted: false,
            redLeaderConfirmed: false,
            blueLeaderConfirmed: false,
          },
        ],
        upcomingMatchesStatus: 'ready',
      });

      const fetchMock = vi.fn(async (url, init) => {
        if (url.startsWith('/api/matches/attendees')) {
          return new Response(JSON.stringify([
            {
              matchId: 'match-confirmed',
              membershipId: 'membership-admin',
              status: 'attend',
              playerName: OWNER_PROFILE_NAME,
              playerOvr: 70,
              playerPhotoUrl: null,
              matchPoints: 2000,
            },
            {
              matchId: 'match-confirmed',
              membershipId: 'membership-member',
              status: 'attend',
              playerName: '김멤버',
              playerOvr: 66,
              playerPhotoUrl: null,
              matchPoints: 900,
            },
          ]), { status: 200 });
        }
        if (url.includes('/api/matches/lineup/publish')) {
          return new Response(JSON.stringify({
            id: 'match-confirmed',
            clubId: 'club-test',
            seasonId: 'season-1',
            round: null,
            title: '정규리그 경기',
            date: '2026-05-17T20:00:00.000+09:00',
            location: '잠실 풋살파크',
            type: 'match',
            status: 'scheduled',
            ourScore: null,
            oppScore: null,
            tacticsCompleted: true,
            redLeaderConfirmed: true,
            blueLeaderConfirmed: true,
            createdByMembershipId: 'membership-admin',
            cancellationReason: null,
            cancelledAt: null,
          }), { status: 200 });
        }
        if (url.includes('/api/matches/lineup/confirm')) {
          const body = JSON.parse(init?.body as string);
          const confirmed = body.confirmed ?? true;
          return new Response(JSON.stringify({
            id: 'match-confirmed',
            clubId: 'club-test',
            seasonId: 'season-1',
            round: null,
            title: '정규리그 경기',
            date: '2026-05-17T20:00:00.000+09:00',
            location: '잠실 풋살파크',
            type: 'match',
            status: 'scheduled',
            ourScore: null,
            oppScore: null,
            tacticsCompleted: confirmed && body.teamNumber === 2,
            redLeaderConfirmed: body.teamNumber === 1 ? confirmed : body.teamNumber === 2,
            blueLeaderConfirmed: body.teamNumber === 2 ? confirmed : false,
            createdByMembershipId: 'membership-admin',
            cancellationReason: null,
            cancelledAt: null,
          }), { status: 200 });
        }
        if (url.startsWith('/api/matches/lineup')) {
          return new Response(JSON.stringify([
            {
              id: 'lineup-red-leader',
              matchId: 'match-confirmed',
              membershipId: 'membership-admin',
              teamNumber: 1,
              isLeader: true,
              position: 'MF',
              playerName: OWNER_PROFILE_NAME,
              playerPosition: null,
              playerOvr: 70,
              playerPhotoUrl: null,
              playerMatchPoints: 2000,
            },
            {
              id: 'lineup-blue-leader',
              matchId: 'match-confirmed',
              membershipId: 'membership-member',
              teamNumber: 2,
              isLeader: false,
              position: 'MF',
              playerName: '김멤버',
              playerPosition: null,
              playerOvr: 66,
              playerPhotoUrl: null,
              playerMatchPoints: 900,
            },
          ]), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<ScheduleTab />);
      await screen.findByTestId('match-anticipation-panel');
      expect(screen.getByText('내 팀 Blue')).toBeInTheDocument();
      expect(screen.getByLabelText('내 프리매치 상태: 내 팀 Blue')).toBeInTheDocument();
      expect(screen.queryByLabelText(/Bench \d+명/)).not.toBeInTheDocument();
      expect(screen.queryByText('양 팀 감독님이 스쿼드를 조율하는 중입니다.')).not.toBeInTheDocument();
      expect(screen.queryByText('전술 설정이 진행중입니다. 완료될 때까지 기다려주세요.')).not.toBeInTheDocument();
      expect(screen.queryByText('LINEUP UNLOCKING SOON')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tactics-field')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Red 전술 확정' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Blue 전술 확정' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: OWNER_PROFILE_NAME })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '김멤버' })).not.toBeInTheDocument();

      // 2. Admin logged in -> Shows pitch and icon-only confirm buttons (since bench is empty)
      cleanup();
      useAppStore.setState({
        userRole: 'admin',
      });
      useAuthStore.setState({
        memberProfile: createApprovedMember('membership-admin', OWNER_PROFILE_NAME, 'admin'),
      });
      const adminView = render(<ScheduleTab />);
      await screen.findByTestId('tactics-field');
      expect(screen.queryByTestId('tactics-kick-arena')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('대기 선수 없음')).not.toBeInTheDocument();
      expect(adminView.container.querySelector('img[src="https://www.svgrepo.com/show/146798/tactics.svg"]')).toBeInTheDocument();
      const redConfirmButton = screen.getByRole('button', { name: 'Red 전술 확정' });
      const blueConfirmButton = screen.getByRole('button', { name: 'Blue 전술 확정' });
      expect(redConfirmButton).toBeInTheDocument();
      expect(blueConfirmButton).toBeInTheDocument();
      expect(redConfirmButton).toHaveClass('h-7', 'w-7', 'text-red-team/45');
      expect(blueConfirmButton).toHaveClass('h-7', 'w-7', 'text-blue-team/45');
      expect(screen.getByTestId('tactics-field')).toContainElement(redConfirmButton);
      expect(screen.getByTestId('tactics-field')).toContainElement(blueConfirmButton);
      expect(screen.queryByRole('button', { name: '전술 완료 및 공개' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Red' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Blue' })).not.toBeInTheDocument();

      // 3. Click Red badge -> server response drives confirmation state
      await user.click(screen.getByRole('button', { name: 'Red 전술 확정' }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/matches/lineup/confirm', expect.objectContaining({
        method: 'POST',
      })));
      expect(JSON.parse((fetchMock.mock.calls.find(([url]) => String(url).includes('/api/matches/lineup/confirm'))?.[1] as RequestInit).body as string)).toEqual({
        clubId: 'club-test',
        matchId: 'match-confirmed',
        teamNumber: 1,
      });
      expect(screen.getByRole('button', { name: 'Red 전술 확정 취소' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Red 전술 확정 취소' }));
      await waitFor(() => {
        const confirmCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/matches/lineup/confirm'));
        expect(confirmCalls.length).toBe(2);
      }, { timeout: 2000 });
      expect(JSON.parse((fetchMock.mock.calls.findLast(([url]) => String(url).includes('/api/matches/lineup/confirm'))?.[1] as RequestInit).body as string)).toEqual({
        clubId: 'club-test',
        matchId: 'match-confirmed',
        teamNumber: 1,
        confirmed: false,
      });
      await waitFor(() => expect(screen.getByRole('button', { name: 'Red 전술 확정' })).toBeInTheDocument());

      // 4. Operator confirms the second team, which automatically completes tactics
      await user.click(screen.getByRole('button', { name: 'Blue 전술 확정' }));
      await waitFor(() => {
        const confirmCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/matches/lineup/confirm'));
        expect(confirmCalls.length).toBe(3);
      }, { timeout: 2000 });
      expect(JSON.parse((fetchMock.mock.calls.findLast(([url]) => String(url).includes('/api/matches/lineup/confirm'))?.[1] as RequestInit).body as string)).toEqual({
        clubId: 'club-test',
        matchId: 'match-confirmed',
        teamNumber: 2,
      });

      cleanup();
      useAppStore.setState({
        userRole: 'member',
      });
      useAuthStore.setState({
        memberProfile: createApprovedMember('membership-member', '김멤버', 'member'),
      });
      render(<ScheduleTab />);
      await screen.findByTestId('tactics-field');
      expect(screen.queryByTestId('tactics-kick-arena')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Red 전술 확정됨')).toBeInTheDocument();
      expect(screen.getByLabelText('Blue 전술 확정됨')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Red 전술 확정됨' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Blue 전술 확정됨' })).not.toBeInTheDocument();
      expect(screen.queryByText('전술 설정이 진행중입니다. 완료될 때까지 기다려주세요.')).not.toBeInTheDocument();
      expect(screen.queryByTestId('match-anticipation-panel')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets a leader place bench players on their own team without waiting for a turn', async () => {
    const user = userEvent.setup();
    const onMatchUpdated = vi.fn();
    useAppStore.setState({ userRole: 'member' });
    useAuthStore.setState({
      memberProfile: createApprovedMember('red-leader', 'Red Leader', 'member'),
    });
    const fetchMock = vi.fn(async (url) => {
      if (String(url).startsWith('/api/matches/lineup')) {
        return new Response(JSON.stringify([
          createLineupEntry('red-leader', 1, true, 'Red Leader', 6),
          createLineupEntry('blue-leader', 2, true, 'Blue Leader', 11),
          createLineupEntry('red-wing', 1, false, 'Red Wing', 0),
        ]), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <TacticsDragBuilder
        clubId="club-test"
        matchId="match-1"
        players={[
          { id: 'red-leader', name: 'Red Leader', ovr: 70, matchPoints: 100, photo: 'Red Leader' },
          { id: 'blue-leader', name: 'Blue Leader', ovr: 70, matchPoints: 100, photo: 'Blue Leader' },
          { id: 'red-wing', name: 'Red Wing', ovr: 66, matchPoints: 80, photo: 'Red Wing' },
        ]}
        lineup={[
          createLineupEntry('red-leader', 1, true, 'Red Leader', 6),
          createLineupEntry('blue-leader', 2, true, 'Blue Leader', 11),
        ]}
        match={{
          ...createCalendarMatch('match-1', '친선 경기', '2026-05-17T20:00:00.000+09:00', 'match'),
          redLeaderConfirmed: true,
          blueLeaderConfirmed: true,
          tacticsCompleted: false,
        }}
        onMatchUpdated={onMatchUpdated}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Red Wing' }));
    await user.click(screen.getByTestId('red-tactics-slot-0'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/matches/lineup', expect.objectContaining({
      method: 'POST',
    })));
    const request = (fetchMock.mock.calls.find(([url]) => String(url) === '/api/matches/lineup') as unknown as [string, RequestInit])[1];
    const body = JSON.parse(request.body as string);
    expect(body.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ membershipId: 'red-wing', teamNumber: 1, formationSlot: 0 }),
    ]));
    expect(onMatchUpdated).toHaveBeenCalledWith(expect.objectContaining({
      redLeaderConfirmed: false,
      blueLeaderConfirmed: true,
      tacticsCompleted: false,
    }));
  });
});

describe('locker room team management UI', () => {
  const approvedMembers = [
    createApprovedMember('membership-admin', OWNER_PROFILE_NAME, 'admin'),
    createApprovedMember('membership-member', '김멤버', 'member'),
    createApprovedMember('membership-operator', '박운영', 'operator'),
  ];

  beforeEach(() => {
    useAppStore.setState({
      activeClubId: 'club-test',
      teamName: 'FC Guppy',
      teamLogoUrl: null,
      availableClubs: [
        { membershipId: 'membership-admin', clubId: 'club-test', clubName: 'FC Guppy', logoUrl: null, role: 'admin', status: 'approved' },
      ],
      userRole: 'admin',
      userStatus: 'approved',
      showMyPage: false,
      showCommunity: false,
      showJoinForm: false,
    });
    useAuthStore.setState({
      authUser: null,
      memberProfile: {
        id: 'membership-admin',
        authUid: 'auth-admin',
        name: OWNER_PROFILE_NAME,
        mainPosition: 'MF',
        subPosition: null,
        ovr: 70,
        stats: DEFAULT_STATS,
        matchPoints: 2000,
        photoUrl: OWNER_PROFILE_PHOTO_URL,
        role: 'admin',
        status: 'approved',
        height: null,
        weight: null,
        birth: null,
        residence: null,
        preferredFoot: '오른발',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isLoading: false,
    });
  });

  it('moves team management into the squad accordion with confirmation modals', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/membership/approved')) {
        return new Response(JSON.stringify(approvedMembers), { status: 200 });
      }
      if (url.startsWith('/api/membership/pending')) {
        return new Response(JSON.stringify([
          {
            id: 'pending-1',
            accountId: 'account-pending',
            clubId: 'club-test',
            nickname: '새회원',
            position: 'FW',
            heightCm: 178,
            weightKg: 70,
            preferredFoot: 'right',
            createdAt: '2026-05-01T00:00:00.000Z',
          },
        ]), { status: 200 });
      }
      if (url.startsWith('/api/clubs/settings')) {
        return new Response(JSON.stringify({
          id: 'club-test',
          name: 'FC Guppy',
          slug: 'fc-guppy',
          description: '팀 소개',
          logoUrl: null,
          isPublic: true,
          memberCount: 3,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
        }), { status: 200 });
      }
      if (url === '/api/clubs/logo') {
        return new Response(JSON.stringify({
          id: 'club-test',
          name: 'FC Guppy',
          slug: 'fc-guppy',
          description: '팀 소개',
          logoUrl: 'https://cdn.example.com/club-logo.png',
          isPublic: true,
          memberCount: 3,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
        }), { status: 200 });
      }
      if (url === '/api/membership/role') {
        return new Response(JSON.stringify({
          ...approvedMembers[1],
          role: 'operator',
        }), { status: 200 });
      }
      if (url === '/api/membership/status') {
        return new Response(JSON.stringify({
          ...approvedMembers[1],
          status: 'withdrawn',
        }), { status: 200 });
      }

      return new Response(JSON.stringify({}), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<LockerRoomTab />);

    expect(await screen.findByText('팀 관리')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.getByText('입단 대기')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '권한 관리' })).not.toBeInTheDocument();
    expect(screen.queryByText('탈퇴처리할 수 있는 회원이 없어요')).not.toBeInTheDocument();
    expect(screen.getByText('팀 로고')).toBeInTheDocument();

    const logoInput = container.querySelector('input[type="file"][accept="image/png,image/jpeg,image/webp"]');
    expect(logoInput).toBeInTheDocument();
    await user.upload(logoInput as HTMLInputElement, new File(['logo'], 'logo.png', { type: 'image/png' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/clubs/logo', expect.objectContaining({
      method: 'POST',
      body: expect.any(FormData),
    })));
    expect(useAppStore.getState().teamLogoUrl).toBe('https://cdn.example.com/club-logo.png');

    await user.click(await screen.findByRole('button', { name: '김멤버 상세 정보' }));

    expect(container.querySelector('.min-h-\\[40px\\]')).toBeInTheDocument();
    expect(container.querySelector('.h-\\[50px\\].min-h-\\[50px\\]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /운영진 권한 부여/ })).toHaveClass('bg-brand-primary');
    expect(screen.getByRole('button', { name: /탈퇴 처리/ })).toHaveClass('bg-feedback-error');
    expect(screen.getAllByTestId('player-badge-slot')).toHaveLength(4);
    expect(screen.getByText('경기 Point')).toBeInTheDocument();
    expect(screen.getByText('2,000').closest('span')).toHaveClass('rounded-full');

    const callsBeforeConfirm = fetchMock.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /운영진 권한 부여/ }));

    expect(screen.getByRole('heading', { name: '운영진 권한 부여' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(callsBeforeConfirm);

    await user.click(screen.getByRole('button', { name: '부여' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/membership/role', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        clubId: 'club-test',
        membershipId: 'membership-member',
        role: 'operator',
      }),
    })));

    await user.click(screen.getByRole('button', { name: /탈퇴 처리/ }));
    expect(screen.getByRole('heading', { name: '회원 탈퇴처리' })).toBeInTheDocument();
    const withdrawConfirmButton = screen.getByRole('button', { name: '탈퇴처리' });
    expect(withdrawConfirmButton).toBeDisabled();

    await user.type(screen.getByLabelText('탈퇴 처리 회원 이름 확인'), '다른이름');
    expect(withdrawConfirmButton).toBeDisabled();

    await user.clear(screen.getByLabelText('탈퇴 처리 회원 이름 확인'));
    await user.type(screen.getByLabelText('탈퇴 처리 회원 이름 확인'), '김멤버');
    expect(withdrawConfirmButton).toBeEnabled();
    await user.click(withdrawConfirmButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/membership/status', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        clubId: 'club-test',
        membershipId: 'membership-member',
        status: 'withdrawn',
      }),
    })));
  });

  it('shows the locker room market below the profile on my page', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/membership/points')) {
        return new Response(JSON.stringify([
          {
            id: 'ledger-1',
            amount: 30,
            reason: 'match_result',
            sourceType: 'match_result',
            sourceId: 'match-1',
            createdAt: '2026-05-20T12:00:00.000+09:00',
          },
        ]), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }));

    const { container } = render(<MyPage />);

    expect(screen.getAllByTestId('player-ability-panel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText('미입력')).not.toBeInTheDocument();
    expect(screen.getByText('라커룸 상점')).toBeInTheDocument();
    expect(screen.getByText('영업 준비중입니다')).toBeInTheDocument();
    expect(screen.getByText('경기 Point')).toBeInTheDocument();
    expect(screen.getByText('2,000')).toBeInTheDocument();
    expect(screen.getAllByText('70')).toHaveLength(1);
    expect(screen.getByTestId('player-ovr-style-card')).toHaveClass('w-[104px]');
    expect(screen.getByTestId('player-trait-card')).toBeInTheDocument();
    expect(screen.getByTestId('player-preferred-foot-area')).toHaveClass('col-span-2');
    expect(screen.getByTestId('hexagon-radar')).toHaveClass('max-w-[190px]');
    expect(screen.getAllByTestId('player-badge-slot')).toHaveLength(4);
    expect(screen.queryByText('사용 가능한 아이템이 없어요')).not.toBeInTheDocument();
    ['공격', '수비', '체력', '멘탈', '스피드', '인성'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(container.querySelector('[aria-label="공격 60"]')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '경기 Point 내역 보기' }));
    expect(screen.getByRole('heading', { name: '경기 Point 내역' })).toBeInTheDocument();
    expect(screen.getByText('현재 보유')).toBeInTheDocument();
    await screen.findByText('경기 결과 반영');
    ['슈팅', '패스', '피지컬', '드리블', '혈압', 'manner'].forEach((label) => {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /로그아웃/ })).toBeInTheDocument();
  });

  it('keeps pending clubs out of the my page club switcher', () => {
    useAppStore.setState({
      activeClubId: 'club-approved',
      teamName: '승인 FC',
      availableClubs: [
        { membershipId: 'membership-approved', clubId: 'club-approved', clubName: '승인 FC', role: 'member', status: 'approved' },
        { membershipId: 'membership-pending', clubId: 'club-pending', clubName: '대기 FC', role: 'member', status: 'pending' },
      ],
    });

    render(<MyPage />);

    const switcher = screen.getByRole('combobox', { name: '소속팀 선택' });
    expect(within(switcher).getByRole('option', { name: '승인 FC' })).toBeInTheDocument();
    expect(within(switcher).queryByRole('option', { name: '대기 FC' })).not.toBeInTheDocument();
  });

  it('moves from my page to the team browse screen without opening a modal', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      activeClubId: 'club-approved',
      teamName: '승인 FC',
      availableClubs: [
        { membershipId: 'membership-approved', clubId: 'club-approved', clubName: '승인 FC', role: 'member', status: 'approved' },
      ],
      showTeamBrowse: false,
    });

    render(<MyPage />);

    await user.click(screen.getByRole('button', { name: '다른 팀 둘러보기' }));

    expect(useAppStore.getState()).toMatchObject({
      showMyPage: false,
      showTeamBrowse: true,
      showJoinForm: false,
    });
    expect(screen.queryByRole('dialog', { name: '다른 팀 둘러보기' })).not.toBeInTheDocument();
  });

  it('submits an additional join request from the full team browse screen without locking the approved member shell', async () => {
    const user = userEvent.setup();
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/membership/points')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url === '/api/public/clubs') {
        return new Response(JSON.stringify([{
          id: 'club-new',
          name: 'FC New',
          slug: 'fc-new',
          description: '추가 신청팀',
          logoUrl: null,
          isPublic: true,
          memberCount: 7,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
        }]), { status: 200 });
      }
      if (url === '/api/public/clubs/club-new') {
        return new Response(JSON.stringify({
          id: 'club-new',
          name: 'FC New',
          slug: 'fc-new',
          description: '추가 신청팀',
          logoUrl: null,
          isPublic: true,
          memberCount: 7,
          activeSeason: null,
          recentMatchCount: 0,
          upcomingMatchCount: 0,
          recentMatches: [],
          upcomingMatches: [],
        }), { status: 200 });
      }
      if (url === '/api/membership?clubId=club-new') {
        return new Response(JSON.stringify({
          account: { id: 'auth-member', email: 'member@fcmoim.test' },
          membershipState: 'new',
          membership: null,
        }), { status: 200 });
      }
      if (url === '/api/membership' && init?.method === 'POST') {
        return new Response(JSON.stringify({
          id: 'membership-pending',
          accountId: 'auth-member',
          clubId: 'club-new',
          role: 'member',
          status: 'pending',
          nickname: '추가멤버',
          position: 'MF',
          heightCm: null,
          weightKg: null,
          birthDate: null,
          residence: null,
          photoUrl: null,
          ovr: 60,
          stats: DEFAULT_STATS,
          matchPoints: 100,
          preferredFoot: 'right',
        }), { status: 201 });
      }
      if (url === '/api/membership/clubs') {
        return new Response(JSON.stringify([
          { membershipId: 'membership-approved', clubId: 'club-approved', clubName: '승인 FC', role: 'member', status: 'approved' },
          { membershipId: 'membership-pending', clubId: 'club-new', clubName: 'FC New', role: 'member', status: 'pending' },
        ]), { status: 200 });
      }
      return new Response(JSON.stringify({ enabled: false }), { status: 200 });
    }));
    useAppStore.setState({
      isAuthenticated: true,
      userStatus: 'approved',
      showTeamBrowse: true,
      showMyPage: false,
      activeClubId: 'club-approved',
      selectedJoinClubId: 'club-new',
      teamName: '승인 FC',
      availableClubs: [
        { membershipId: 'membership-approved', clubId: 'club-approved', clubName: '승인 FC', role: 'member', status: 'approved' },
      ],
    });
    useAuthStore.setState({ initialize: vi.fn(async () => undefined), isLoading: false });

    render(<HomePage />);

    await user.click(await screen.findByRole('button', { name: '입단신청 시작' }));
    await user.type(await screen.findByPlaceholderText('이름 입력 *'), '추가멤버');
    await user.click(screen.getByRole('button', { name: /^입단신청$/ }));
    await user.click(screen.getByRole('button', { name: '신청하기' }));

    await waitFor(() => expect(useToastStore.getState().message).toBe('입단신청이 접수되었어요. 운영진 승인을 기다려주세요.'));
    expect(useAppStore.getState()).toMatchObject({
      userStatus: 'approved',
      activeClubId: 'club-approved',
      showTeamBrowse: true,
    });
    expect(useAppStore.getState().availableClubs).toEqual(expect.arrayContaining([
      expect.objectContaining({ clubId: 'club-new', status: 'pending' }),
    ]));
  });

  it('defaults the birth date editor to 1990-09-09 when no birth date is saved', async () => {
    const user = userEvent.setup();

    render(<LockerProfile />);

    await user.click(screen.getByRole('button', { name: '생년월일 수정' }));
    expect(screen.getByLabelText('생년월일')).toHaveValue('1990-09-09');
  });

  it('shows Korean validation before saving an out-of-range profile weight', async () => {
    const user = userEvent.setup();
    const saveMemberProfile = vi.fn();
    useAuthStore.setState({ saveMemberProfile });

    render(<LockerProfile />);

    await user.click(screen.getByRole('button', { name: '몸무게 수정' }));
    await user.clear(screen.getByLabelText('몸무게'));
    await user.type(screen.getByLabelText('몸무게'), '222');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(saveMemberProfile).not.toHaveBeenCalled();
    expect(useToastStore.getState().message).toBe('몸무게는 30kg 이상 180kg 이하로 입력해주세요.');
  });
});

describe('records and header polish UI', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeClubId: 'club-test',
      activeTab: 'records',
      userRole: 'admin',
      userStatus: 'approved',
      showMyPage: false,
      showCommunity: false,
      showJoinForm: false,
      teamName: 'FC Guppy',
    });
    useRecordsStore.setState({
      recordsStatus: 'ready',
      recordsError: null,
      records: {
        seasonId: 'season-1',
        rankingRows: [
          {
            membershipId: 'member-1',
            nickname: '구피원',
            photoUrl: '/avatars/member-1.png',
            ovr: 70,
            wins: 3,
            draws: 1,
            losses: 0,
            winRate: 75,
            leaguePoints: 10,
            goals: 2,
            assists: 1,
            momCount: 1,
            appearances: 4,
          },
          {
            membershipId: 'member-2',
            nickname: '구피투',
            photoUrl: null,
            ovr: 68,
            wins: 2,
            draws: 1,
            losses: 1,
            winRate: 50,
            leaguePoints: 7,
            goals: 1,
            assists: 2,
            momCount: 0,
            appearances: 4,
          },
          {
            membershipId: 'member-3',
            nickname: '구피삼',
            photoUrl: null,
            ovr: 66,
            wins: 1,
            draws: 1,
            losses: 2,
            winRate: 25,
            leaguePoints: 4,
            goals: 0,
            assists: 1,
            momCount: 0,
            appearances: 3,
          },
        ],
        seasonSummary: {
          totalMatches: 4,
          topVenue: { location: '상암 풋살장', count: 2 },
          topAppearance: { membershipId: 'member-1', nickname: '구피원', value: 4 },
          topGoals: { membershipId: 'member-1', nickname: '구피원', value: 2 },
          topAssists: { membershipId: 'member-2', nickname: '구피투', value: 2 },
          topMom: { membershipId: 'member-1', nickname: '구피원', value: 1 },
        },
      },
    });
  });

  it('uses locker-room medal colors and bounded thumbnails on the records ranking', () => {
    const { container } = render(<RecordsTab />);

    expect(container.querySelector('.min-h-\\[40px\\]')).toBeInTheDocument();
    expect(container.querySelector('.h-\\[50px\\].min-h-\\[50px\\]')).toBeInTheDocument();
    expect(screen.getByText('승점')).not.toHaveClass('text-green-600');
    expect(screen.getByText('승률')).toHaveClass('text-fcgreen-600');
    expect(screen.getByText('10')).toHaveClass('text-primary');
    const winRateCell = screen.getByText((_, element) => element?.textContent === '75%');
    expect(winRateCell).toHaveClass('text-fcgreen-600');
    expect(screen.getAllByText('구피원').length).toBeGreaterThan(1);
    const summaryCard = screen.getByText('시즌 요약').closest('.card');
    expect(summaryCard).not.toBeNull();
    expect(within(summaryCard as HTMLElement).queryByText('시즌 전체')).not.toBeInTheDocument();
    expect(within(summaryCard as HTMLElement).queryByText((_, element) => element?.textContent === '4경기')).not.toBeInTheDocument();
    expect(
      within(summaryCard as HTMLElement).getAllByText('4')
        .some((element) => element.classList.contains('text-primary')),
    ).toBe(true);
    expect(
      within(summaryCard as HTMLElement).getAllByText('2')
        .some((element) => element.classList.contains('text-award-assist')),
    ).toBe(true);
    expect(
      within(summaryCard as HTMLElement).getAllByText('4')
        .some((element) => element.classList.contains('text-fcgreen-600')),
    ).toBe(true);
    expect(screen.queryByText('구피원 4')).not.toBeInTheDocument();
    expect(container.querySelector('.text-tier-gold')).toBeInTheDocument();
    expect(container.querySelector('.text-tier-silver')).toBeInTheDocument();
    expect(container.querySelector('.text-tier-bronze')).toBeInTheDocument();
    expect(screen.getByAltText('구피원 썸네일')).toHaveClass('h-6', 'w-6');
    expect(screen.getByAltText('구피투 썸네일')).toHaveAttribute('src', '/icons/svgrepo-soccer-player.svg');
  });

  it('navigates home from the FC Guppy logo and shows subpage back icons', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      activeTab: 'records',
      showMyPage: false,
      showCommunity: false,
      showJoinForm: false,
      teamName: 'FC Guppy',
    });
    useAuthStore.setState({
      memberProfile: {
        id: 'member-header',
        authUid: 'auth-header',
        name: '헤더 멤버',
        mainPosition: 'MF',
        subPosition: null,
        ovr: 70,
        stats: DEFAULT_STATS,
        matchPoints: 100,
        photoUrl: null,
        role: 'member',
        status: 'approved',
        height: null,
        weight: null,
        birth: null,
        residence: null,
        preferredFoot: '오른발',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    render(<Header />);

    expect(screen.getByAltText('프로필')).toHaveAttribute('src', '/icons/svgrepo-soccer-player.svg');

    await user.click(screen.getByRole('button', { name: 'FC Guppy 홈으로 이동' }));
    expect(useAppStore.getState()).toMatchObject({
      activeTab: 'home',
      showMyPage: false,
    });

    cleanup();
    useAppStore.setState({ showMyPage: true, activeTab: 'records' });
    render(<Header />);
    await user.click(screen.getByRole('button', { name: '마이페이지 뒤로가기' }));
    expect(useAppStore.getState().showMyPage).toBe(false);

    cleanup();
    useAppStore.setState({ showCommunity: true, activeTab: 'home' });
    render(<Header />);
    expect(screen.getByText('FC Guppy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '커뮤니티 뒤로가기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^홈$/ })).not.toBeInTheDocument();
  });

  it('returns unauthenticated guest browsing users to the login screen from the logo', async () => {
    const user = userEvent.setup();
    useAppStore.setState({
      isAuthenticated: false,
      userStatus: 'guest',
      authView: 'guest',
      showJoinForm: true,
      teamName: 'FC Moim',
    });

    render(<Header />);

    await user.click(screen.getByRole('button', { name: 'FC moim 로그인 화면으로 이동' }));
    expect(useAppStore.getState()).toMatchObject({
      authView: 'login',
      showJoinForm: false,
    });
  });

  it('shows an authenticated guest account menu with logout from the header avatar', async () => {
    const user = userEvent.setup();
    const signOut = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({
      signOut,
      authUser: {
        id: 'auth-guest',
        email: 'guest@fcmoim.test',
        user_metadata: {
          avatar_url: '/avatar/guest.png',
        },
      } as never,
      memberProfile: null,
    });
    useAppStore.setState({
      isAuthenticated: true,
      userStatus: 'guest',
      authView: 'login',
      showJoinForm: false,
    });

    render(<Header />);

    const accountButton = screen.getByRole('button', { name: '계정 메뉴 열기' });
    expect(screen.getByAltText('프로필')).toHaveAttribute('src', '/avatar/guest.png');
    expect(screen.queryByRole('button', { name: '마이페이지 열기' })).not.toBeInTheDocument();

    await user.click(accountButton);

    expect(screen.getAllByText('guest@fcmoim.test')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /로그아웃/ }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('switches Community board and gallery tabs to clear preparing states', async () => {
    const user = userEvent.setup();
    useAnnouncementStore.setState({
      announcementsStatus: 'ready',
      announcementsError: null,
      announcements: [],
    });

    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: '게시판' }));
    expect(screen.getByText('게시판은 준비 중입니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '게시판' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '갤러리' }));
    expect(screen.getByText('갤러리는 준비 중입니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '갤러리' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('creates a manual schedule through the real match API flow', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 4, 1));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    useAppStore.setState({ activeClubId: 'club-test' });
    useModalStore.setState({ activeModal: 'matchCreate' });
    useScheduleStore.setState({
      activePolls: [{
        ...activePoll,
        options: [{ id: 'option-may-22', pollId: activePoll.id, optionDate: '2026-05-22', sortOrder: 0 }],
        votes: [],
      }],
      activePollsStatus: 'ready',
      activePollsError: null,
      upcomingMatches: [],
      upcomingMatchesStatus: 'ready',
      upcomingMatchesError: null,
      calendarMatches: [
        createCalendarMatch('match-existing', 'Round 5', '2026-05-20T20:00:00.000+09:00', 'match'),
        createCalendarMatch('training-existing', '5월 전지훈련', '2026-05-21T21:00:00.000+09:00', 'training'),
      ],
      calendarMatchesStatus: 'ready',
      calendarMatchesError: null,
    });
    try {
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === '/api/matches') {
          return new Response(JSON.stringify({
            id: 'match-created',
            clubId: 'club-test',
            seasonId: 'season-active',
            round: null,
            title: '확정 경기 일정',
            date: '2026-06-06T18:00:00+09:00',
            location: '서울 영등포 SKY풋살파크',
            type: 'match',
            status: 'scheduled',
            ourScore: null,
            oppScore: null,
            tacticsCompleted: false,
            memo: null,
            createdByMembershipId: 'operator-membership',
            cancellationReason: null,
            cancelledAt: null,
          }), { status: 201 });
        }

        return new Response(JSON.stringify({}), { status: 200 });
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<MatchCreateModal />);

      expect(screen.queryByText('선수 풀')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5월 20일, 1개 일정' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5월 21일, 1개 일정' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5월 22일, 1개 일정' })).toBeInTheDocument();
      const titleInput = screen.getByLabelText('타이틀');
      expect(titleInput).toHaveValue('');
      expect(screen.getByText('날짜 선택').compareDocumentPosition(titleInput)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(titleInput.compareDocumentPosition(screen.getByLabelText('시간'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(screen.getByRole('button', { name: '일정 생성하기' })).toBeEnabled();
      await user.type(titleInput, '토요 친선전');
      await user.click(screen.getByRole('button', { name: '일정 생성하기' }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/matches', expect.objectContaining({
        method: 'POST',
      })));
      const matchCreateCall = fetchMock.mock.calls.find(([url]) => url === '/api/matches');
      const requestInit = (matchCreateCall as unknown as [string, RequestInit])[1];
      const body = JSON.parse(requestInit.body as string);
      expect(body).toMatchObject({
        clubId: 'club-test',
        type: 'match',
        title: '토요 친선전',
        time: '18:00',
        location: '서울 영등포 SKY풋살파크',
        memo: null,
      });
      expect(body).not.toHaveProperty('attendeeMembershipIds');
      expect(body).not.toHaveProperty('lineupEntries');
      expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(useScheduleStore.getState().upcomingMatches).toHaveLength(1);
      expect(screen.queryByText('확정 일정 생성 API 연결 후 저장할 수 있어요.')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

function createApprovedMember(id: string, nickname: string, role: 'admin' | 'operator' | 'member') {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    id,
    authUid: `auth-${id}`,
    accountId: `account-${id}`,
    clubId: 'club-test',
    name: nickname,
    role,
    status: 'approved',
    nickname,
    mainPosition: 'MF',
    subPosition: null,
    position: 'MF',
    height: 178,
    weight: 70,
    heightCm: 178,
    weightKg: 70,
    birth: new Date('2000-01-01T00:00:00.000Z'),
    birthDate: '2000-01-01',
    residence: '서울',
    photoUrl: role === 'admin' ? OWNER_PROFILE_PHOTO_URL : null,
    ovr: role === 'admin' ? 70 : 66,
    stats: DEFAULT_STATS,
    matchPoints: role === 'admin' ? 2000 : 900,
    preferredFoot: '오른발',
    createdAt: now,
    updatedAt: now,
  } as const;
}

function createCalendarMatch(id: string, title: string, date: string, type: 'match' | 'training' | 'seminar' | 'etc') {
  return {
    id,
    clubId: 'club-test',
    seasonId: 'season-1',
    round: null,
    title,
    date,
    location: '잠실 풋살파크',
    type,
    status: 'scheduled',
    ourScore: null,
    oppScore: null,
    tacticsCompleted: false,
    memo: null,
    createdByMembershipId: 'membership-admin',
    cancellationReason: null,
    cancelledAt: null,
  } as const;
}

function createLineupEntry(
  membershipId: string,
  teamNumber: 1 | 2,
  isLeader: boolean,
  playerName: string,
  formationSlot: number | null,
) {
  return {
    id: `lineup-${membershipId}`,
    matchId: 'match-1',
    membershipId,
    teamNumber,
    isLeader,
    position: 'MF' as const,
    formationSlot,
    playerName,
    playerPosition: null,
    playerOvr: 70,
    playerPhotoUrl: null,
    playerMatchPoints: 100,
  };
}
