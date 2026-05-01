// ========================================
// FC Moim — 공통 타입 정의
// v1.0 공통 도메인 타입
// ========================================

// DateTime alias for Firestore Timestamps or ISO strings
export type DateTime = Date | string;

// ─── 역할(Role) & 상태 ───
export type UserRole = 'admin' | 'operator' | 'member';
export type UserStatus = 'guest' | 'pending' | 'approved' | 'rejected' | 'suspended';

// ─── 포지션 ───
export type Position = 'FW' | 'MF' | 'DF';

// ─── 경기 / 이벤트 ───
export type EventType = 'match' | 'vote_match' | 'training' | 'seminar' | 'etc';
export type MatchStatusType = '예정' | '라커룸' | '종료';
export type AttendanceStatus = 'attend' | 'absent' | 'none';

// ─── 탭 네비게이션 ───
export type Tab = 'home' | 'schedule' | 'records' | 'locker_room';

// ─── 카드 등급 ───
export type CardGrade = '비기너' | '아마추어' | '세미프로' | '프로' | '레전드';

// ─── 6각형 능력치 (위닝 스타일) ───
export interface UserStats {
  speed: number;    // 스피드 (1-99)
  shooting: number; // 슈팅 (1-99)
  passing: number;  // 패스 (1-99)
  defense: number;  // 수비 (1-99)
  physical: number; // 피지컬 (1-99)
  dribble: number;  // 드리블 (1-99)
}

export const DEFAULT_STATS: UserStats = {
  speed: 60,
  shooting: 60,
  passing: 60,
  defense: 60,
  physical: 60,
  dribble: 60,
};

// ─── User ───
export interface User {
  id: string;
  authUid: string;
  name: string;
  mainPosition: Position;
  subPosition: Position | null;
  ovr: number;
  stats: UserStats;
  matchPoints: number;
  photoUrl: string | null;
  role: UserRole;
  status: UserStatus;
  height: number | null;
  weight: number | null;
  birth: Date | null;
  preferredFoot: '왼발' | '오른발' | '양발';
  createdAt: DateTime;
  updatedAt: DateTime;
}

// ─── Season ───
export interface Season {
  id: string;
  name: string; // "25/26"
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

// ─── Match ───
export interface Match {
  id: string;
  seasonId: string;
  round: number | null;
  title: string;
  date: Date;
  location: string;
  type: EventType;
  status: MatchStatusType;
  ourScore: number | null;
  oppScore: number | null;
  tacticsCompleted: boolean;
  memo: string | null;
}

// ─── PlayerStat ───
export interface PlayerStat {
  id: string;
  matchId: string;
  userId: string;
  goals: number;
  assists: number;
  isMom: boolean;
  aiRating: number | null;
}

// ─── Attendance ───
export interface Attendance {
  id: string;
  matchId: string;
  userId: string;
  status: AttendanceStatus;
  respondedAt: DateTime;
}

// ─── MatchTeam (전술 빌더용 — 드래그 앤 드롭) ───
export interface MatchTeam {
  id: string;
  matchId: string;
  userId: string;
  teamNumber: 1 | 2; // 1 = Red, 2 = Blue
  isLeader: boolean;
  position: Position;
}

// ─── Comment ───
export interface Comment {
  id: string;
  matchId: string;
  userId: string;
  content: string;
  createdAt: DateTime;
}

// ─── LockerItem ───
export interface LockerItem {
  id: string;
  userId: string;
  cardName: string;
  cardEffect: string;
  grade: CardGrade;
  isEquipped: boolean;
}

// ─── Announcement ───
export interface Announcement {
  id: string;
  seasonId: string;
  title: string;
  content: string;
  authorId: string;
  isPinned: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

// ─── Notification ───
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
