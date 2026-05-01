export type MembershipRole = 'admin' | 'operator' | 'member';

export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type MembershipState = 'new' | MembershipStatus;

export type PositionCode = 'FW' | 'MF' | 'DF';

export type PreferredFootCode = 'left' | 'right' | 'both';

export type AccountRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
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

