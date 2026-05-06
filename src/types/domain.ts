export type MembershipRole = 'admin' | 'operator' | 'member';

export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type MembershipState = 'new' | MembershipStatus;

export type PositionCode = 'FW' | 'MF' | 'DF';

export type PreferredFootCode = 'left' | 'right' | 'both';

export type SchedulePollStatus = 'open' | 'closed' | 'promoted' | 'cancelled';

export type MatchStatus = 'scheduled' | 'locker_room' | 'finished' | 'cancelled';

export type MatchEventType = 'match' | 'vote_match' | 'training' | 'seminar' | 'etc';

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
};

export type NormalizedJoinProfile = {
  nickname: string;
  position: PositionCode | string | null;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  photoUrl: string | null;
};

export type ApprovedMemberAction =
  | 'create-match'
  | 'save-match-result'
  | 'write-announcement';
