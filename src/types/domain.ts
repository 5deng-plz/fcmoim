export type MembershipRole = 'admin' | 'operator' | 'member';

export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type MembershipState = 'new' | MembershipStatus;

export type PositionCode = 'FW' | 'MF' | 'DF';

export type PreferredFootCode = 'left' | 'right' | 'both';

export type MembershipStats = {
  speed: number;
  shooting: number;
  passing: number;
  defense: number;
  physical: number;
  dribble: number;
};

export type SchedulePollStatus = 'open' | 'closed' | 'promoted' | 'cancelled';

export type MatchStatus = 'scheduled' | 'locker_room' | 'finished' | 'cancelled';

export type MatchEventType = 'match' | 'vote_match' | 'training' | 'seminar' | 'etc';

export type MatchLineupTeamNumber = 1 | 2;

export type AccountRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ClubMembershipSummaryRow = {
  membershipId: string;
  clubId: string;
  clubName: string;
  role: MembershipRole;
  status: MembershipStatus;
};

export type PublicMatchSummaryRow = {
  id: string;
  title: string;
  date: string;
  location: string;
  type: MatchEventType;
  status: MatchStatus;
  ourScore: number | null;
  oppScore: number | null;
};

export type PublicSeasonSummaryRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export type PublicClubSummaryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  memberCount: number;
  activeSeason: PublicSeasonSummaryRow | null;
  recentMatchCount: number;
  upcomingMatchCount: number;
};

export type PublicClubDetailRow = PublicClubSummaryRow & {
  recentMatches: PublicMatchSummaryRow[];
  upcomingMatches: PublicMatchSummaryRow[];
};

export type TeamMembershipRow = {
  id: string;
  accountId: string;
  clubId: string;
  role: MembershipRole;
  status: MembershipStatus;
  nickname: string;
  position: PositionCode | string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  photoUrl: string | null;
  ovr: number;
  stats: MembershipStats;
  matchPoints: number;
  preferredFoot: PreferredFootCode;
};

export type PendingMembershipReviewRow = {
  id: string;
  accountId: string;
  clubId: string;
  nickname: string;
  position: PositionCode | string | null;
  heightCm: number | null;
  weightKg: number | null;
  preferredFoot: PreferredFootCode;
  createdAt: string;
};

export type SchedulePollOptionRow = {
  id: string;
  pollId: string;
  optionDate: string;
  sortOrder: number;
};

export type SchedulePollVoteRow = {
  id: string;
  pollId: string;
  optionId: string;
  membershipId: string;
  isAvailable: boolean;
};

export type SchedulePollRow = {
  id: string;
  clubId: string;
  seasonId: string | null;
  title: string;
  status: SchedulePollStatus;
  commonTime: string;
  location: string;
  memo: string | null;
  closesAt: string | null;
  createdByMembershipId: string;
  cancellationReason: string | null;
  cancelledAt: string | null;
  promotedMatchId: string | null;
  options: SchedulePollOptionRow[];
  votes: SchedulePollVoteRow[];
};

export type MatchRow = {
  id: string;
  clubId: string;
  seasonId: string;
  round: number | null;
  title: string;
  date: string;
  location: string;
  type: MatchEventType;
  status: MatchStatus;
  ourScore: number | null;
  oppScore: number | null;
  tacticsCompleted: boolean;
  memo: string | null;
  createdByMembershipId: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
};

export type MatchLineupEntryRow = {
  id: string;
  matchId: string;
  membershipId: string;
  teamNumber: MatchLineupTeamNumber;
  isLeader: boolean;
  position: PositionCode;
  playerName: string;
  playerPosition: PositionCode | string | null;
  playerOvr: number;
  playerPhotoUrl: string | null;
};

export type AuthContext = {
  user: {
    id: string;
    email: string | null;
  };
};

export type JoinProfileInput = {
  nickname: string;
  position?: PositionCode | string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  birthDate?: string | null;
  photoUrl?: string | null;
  preferredFoot?: PreferredFootCode | null;
};

export type NormalizedJoinProfile = {
  nickname: string;
  position: PositionCode | string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  photoUrl: string | null;
  preferredFoot: PreferredFootCode | null;
};

export type ApprovedMemberAction =
  | 'create-match'
  | 'save-match-result'
  | 'write-announcement';
