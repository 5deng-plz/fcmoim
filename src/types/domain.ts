export type MembershipRole = 'admin' | 'operator' | 'member';

export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'withdrawn';

export type MembershipState = 'new' | MembershipStatus;

export type PositionCode = 'FW' | 'MF' | 'DF' | 'GK';

export type PreferredFootCode = 'left' | 'right' | 'both';

export type MembershipStats = {
  attack: number;
  defense: number;
  stamina: number;
  mentality: number;
  speed: number;
  manner: number;
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
  logoUrl: string | null;
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
  attendeeCount: number;
  attendeeTotal: number;
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
  isPublic: boolean;
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
  residence: string | null;
  photoUrl: string | null;
  ovr: number;
  stats: MembershipStats;
  matchPoints: number;
  selectedTraitId: string | null;
  unlockedTraitIds?: string[];
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
  eligibleVoterCount: number;
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
  redLeaderConfirmed: boolean;
  blueLeaderConfirmed: boolean;
  memo: string | null;
  createdByMembershipId: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  updatedAt: string;
};

export type MatchLineupEntryRow = {
  id: string;
  matchId: string;
  membershipId: string;
  teamNumber: MatchLineupTeamNumber;
  isLeader: boolean;
  position: PositionCode;
  formationSlot: number | null;
  playerName: string;
  playerPosition: PositionCode | string | null;
  playerOvr: number;
  playerPhotoUrl: string | null;
  playerMatchPoints: number;
};

export type MatchAttendeeRow = {
  matchId: string;
  membershipId: string;
  status: 'attend';
  playerName: string;
  playerOvr: number;
  playerPhotoUrl: string | null;
  matchPoints: number;
};

export type EventCommentTargetType = 'match' | 'schedule_poll_option' | 'feed_post';

export type EventCommentRow = {
  id: string;
  targetType: EventCommentTargetType;
  targetId: string;
  membershipId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type AnnouncementRow = {
  id: string;
  clubId: string;
  seasonId: string | null;
  title: string;
  content: string;
  authorMembershipId: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecordsRankingRow = {
  membershipId: string;
  nickname: string;
  photoUrl: string | null;
  position: PositionCode | string | null;
  preferredFoot: PreferredFootCode;
  selectedTraitId: string | null;
  stats: MembershipStats;
  ovr: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  leaguePoints: number;
  goals: number;
  assists: number;
  momCount: number;
  appearances: number;
};

export type RecordsLeader = {
  membershipId: string;
  nickname: string;
  value: number;
} | null;

export type RecordsSeasonSummaryRow = {
  totalMatches: number;
  topVenue: {
    location: string;
    count: number;
  } | null;
  topAppearance: RecordsLeader;
  topGoals: RecordsLeader;
  topAssists: RecordsLeader;
  topMom: RecordsLeader;
};

export type RecordsSeasonSummaryResponse = {
  seasonId: string | null;
  rankingRows: RecordsRankingRow[];
  seasonSummary: RecordsSeasonSummaryRow;
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
  residence?: string | null;
  stats?: MembershipStats | null;
  ovr?: number | null;
};

export type NormalizedJoinProfile = {
  nickname: string;
  position: PositionCode | string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  residence: string | null;
  photoUrl: string | null;
  preferredFoot: PreferredFootCode | null;
  stats?: MembershipStats | null;
  ovr?: number | null;
};

export type MembershipProfilePatch = {
  nickname?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  birthDate?: string | null;
  residence?: string | null;
  photoUrl?: string | null;
  preferredFoot?: PreferredFootCode | null;
  stats?: MembershipStats | null;
  ovr?: number | null;
};

export type ApprovedMemberAction =
  | 'create-match'
  | 'save-match-result'
  | 'write-announcement';
