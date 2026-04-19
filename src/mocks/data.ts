// ========================================
// FC Moim — Mock 데이터 (개발용)
// local 프로필에서 사용되는 더미 데이터
// ========================================

import type { Match, User, PlayerStat, Announcement, Season } from '@/types';

export const MOCK_SEASON: Season = {
  id: 'season-25-26',
  name: '25/26',
  startDate: new Date('2025-09-01'),
  endDate: new Date('2026-06-30'),
  isActive: true,
};

export const MOCK_USERS: User[] = [
  {
    id: 'u1', authUid: 'auth-1', name: '손흥민', mainPosition: 'FW', subPosition: 'MF',
    ovr: 72, stats: { speed: 88, shooting: 85, passing: 80, defense: 50, physical: 75, dribble: 89 },
    matchPoints: 26, photoUrl: null, role: 'admin', status: 'approved',
    height: 183, weight: 78, birth: null, preferredFoot: '양발',
    createdAt: '2025-09-01', updatedAt: '2026-03-07',
  },
  {
    id: 'u2', authUid: 'auth-2', name: '이강인', mainPosition: 'MF', subPosition: 'FW',
    ovr: 68, stats: { speed: 78, shooting: 80, passing: 92, defense: 60, physical: 68, dribble: 90 },
    matchPoints: 23, photoUrl: null, role: 'operator', status: 'approved',
    height: 174, weight: 72, birth: null, preferredFoot: '왼발',
    createdAt: '2025-09-01', updatedAt: '2026-03-07',
  },
  {
    id: 'u3', authUid: 'auth-3', name: '김민재', mainPosition: 'DF', subPosition: null,
    ovr: 70, stats: { speed: 75, shooting: 55, passing: 70, defense: 90, physical: 88, dribble: 60 },
    matchPoints: 22, photoUrl: null, role: 'member', status: 'approved',
    height: 190, weight: 85, birth: null, preferredFoot: '오른발',
    createdAt: '2025-09-01', updatedAt: '2026-03-07',
  },
  {
    id: 'u4', authUid: 'auth-4', name: '황희찬', mainPosition: 'FW', subPosition: 'MF',
    ovr: 65, stats: { speed: 85, shooting: 75, passing: 65, defense: 45, physical: 70, dribble: 78 },
    matchPoints: 20, photoUrl: null, role: 'member', status: 'approved',
    height: 177, weight: 73, birth: null, preferredFoot: '오른발',
    createdAt: '2025-09-01', updatedAt: '2026-03-07',
  },
];

export const MOCK_MATCHES: Match[] = [
  {
    id: 'm1', seasonId: 'season-25-26', round: 7, title: 'R7 정규 리그',
    date: new Date('2026-03-14T19:00:00'), location: '서울 용산 풋살장',
    type: 'match', status: '예정', ourScore: null, oppScore: null,
    tacticsCompleted: false, memo: null,
  },
  {
    id: 'm2', seasonId: 'season-25-26', round: 6, title: 'R6 정규 리그',
    date: new Date('2026-03-07T19:00:00'), location: '서울 용산 풋살장',
    type: 'match', status: '종료', ourScore: 4, oppScore: 2,
    tacticsCompleted: true, memo: null,
  },
  {
    id: 'm3', seasonId: 'season-25-26', round: null, title: '주말 전지훈련',
    date: new Date('2026-03-22T10:00:00'), location: '광명 롯데몰 옥상경기장',
    type: 'training', status: '예정', ourScore: null, oppScore: null,
    tacticsCompleted: false, memo: '체력 훈련 위주',
  },
  {
    id: 'm4', seasonId: 'season-25-26', round: null, title: '정신교육',
    date: new Date('2026-03-28T19:00:00'), location: '서울 강남역 카페',
    type: 'seminar', status: '예정', ourScore: null, oppScore: null,
    tacticsCompleted: false, memo: '팀빌딩 및 전술 토론',
  },
];

export const MOCK_PLAYER_STATS: PlayerStat[] = [
  { id: 'ps1', matchId: 'm2', userId: 'u1', goals: 2, assists: 0, isMom: true, aiRating: 8.5 },
  { id: 'ps2', matchId: 'm1', userId: 'u1', goals: 1, assists: 1, isMom: false, aiRating: 7.2 },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1', seasonId: 'season-25-26', title: '3월 정산 안내',
    content: '이번 달 구장 사용료 1/N 정산 부탁드립니다!', authorId: 'u1',
    isPinned: true, createdAt: '2026-03-01', updatedAt: '2026-03-01',
  },
  {
    id: 'a2', seasonId: 'season-25-26', title: '신규 회원 가입 안내',
    content: '새로운 식구가 합류했습니다!', authorId: 'u2',
    isPinned: false, createdAt: '2026-02-28', updatedAt: '2026-02-28',
  },
];

export const MOCK_USER_DEFAULT: User = {
  id: 'mock-user-1',
  authUid: 'mock-auth-uid',
  name: '테스트 유저',
  mainPosition: 'MF',
  subPosition: 'FW',
  ovr: 60,
  stats: { speed: 60, shooting: 60, passing: 60, defense: 60, physical: 60, dribble: 60 },
  matchPoints: 0,
  photoUrl: null,
  role: 'member',
  status: 'approved',
  height: 175,
  weight: 70,
  birth: null,
  preferredFoot: '오른발',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
