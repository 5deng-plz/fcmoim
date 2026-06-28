import { AppError } from '../types/api';
import type { TeamContext } from '../config/server-team';
import type { AuthContext, MatchRow, TeamMembershipRow } from '../types/domain';

export const MATCH_FEEDBACK_BADGES = [
  'steel_stamina',
  'pass_master',
  'wall_defender',
  'speed_runner',
  'clean_tackle',
  'tactician',
  'fighting_spirit',
  'team_player',
] as const;

export type MatchFeedbackBadge = typeof MATCH_FEEDBACK_BADGES[number];

export type MatchFeedbackMembership = Pick<TeamMembershipRow, 'id' | 'role' | 'status'>;

export type MatchFeedbackParticipant = {
  membershipId: string;
  playerName: string;
  playerPhotoUrl: string | null;
  playerOvr: number;
};

export type MatchFeedbackVoteRow = {
  voterMembershipId: string;
  candidateMembershipId: string;
};

export type MatchFeedbackRatingRow = {
  raterMembershipId: string;
  rateeMembershipId: string;
  rating: number;
  badges: string[];
};

export type SettledMatchFeedback = {
  mvpMembershipId: string | null;
  ratingAverages: Array<{
    membershipId: string;
    averageRating: number;
    ratingCount: number;
    topBadges: string[];
  }>;
};

export type MatchFeedbackResponse = {
  matchId: string;
  status: 'not_open' | 'open' | 'closed';
  feedbackDeadline: string | null;
  participants: MatchFeedbackParticipant[];
  myVote: string | null;
  myRatedMembershipIds: string[];
  voteCount: number;
  ratingCount: number;
  results: SettledMatchFeedback | null;
};

export type MatchFeedbackRepositories = {
  memberships: {
    findCurrentMembership(accountId: string, clubId: string): Promise<MatchFeedbackMembership | null>;
  };
  matches: {
    findById(matchId: string, teamId: string): Promise<(MatchRow & { feedbackDeadline: string | null }) | null>;
  };
  participants: {
    listForMatch(matchId: string): Promise<MatchFeedbackParticipant[]>;
  };
  feedback: {
    listMvpVotes(matchId: string): Promise<MatchFeedbackVoteRow[]>;
    listPeerRatings(matchId: string): Promise<MatchFeedbackRatingRow[]>;
    upsertMvpVote(input: {
      matchId: string;
      voterMembershipId: string;
      candidateMembershipId: string;
    }): Promise<void>;
    upsertPeerRatings(input: {
      matchId: string;
      raterMembershipId: string;
      ratings: Array<{
        rateeMembershipId: string;
        rating: number;
        badges: string[];
      }>;
    }): Promise<void>;
    settle(input: {
      matchId: string;
      winnerMembershipId: string | null;
      ratingAverages: Array<{
        membershipId: string;
        averageRating: number;
      }>;
      participationMembershipIds: string[];
    }): Promise<void>;
  };
};

export function createMatchFeedbackService(
  repositories: MatchFeedbackRepositories,
  teamContext: TeamContext,
) {
  const teamId = teamContext.teamId;

  return {
    async voteMvp(input: {
      auth: AuthContext;
      matchId: string;
      candidateMembershipId: string;
    }) {
      const membership = await requireApprovedMembership(input.auth, teamId);
      const match = await requireFeedbackMatch(input.matchId, teamId);
      assertFeedbackOpen(match);

      const participants = await repositories.participants.listForMatch(input.matchId);
      assertParticipant(input.candidateMembershipId, participants, 'MVP 후보가 경기 참여자 명단에 없어요.');

      await repositories.feedback.upsertMvpVote({
        matchId: input.matchId,
        voterMembershipId: membership.id,
        candidateMembershipId: input.candidateMembershipId,
      });

      return { matchId: input.matchId, candidateMembershipId: input.candidateMembershipId, saved: true as const };
    },

    async submitPeerRatings(input: {
      auth: AuthContext;
      matchId: string;
      ratings: Array<{
        rateeMembershipId: string;
        rating: number;
        badges?: string[] | null;
      }>;
    }) {
      const membership = await requireApprovedMembership(input.auth, teamId);
      const match = await requireFeedbackMatch(input.matchId, teamId);
      assertFeedbackOpen(match);

      const participants = await repositories.participants.listForMatch(input.matchId);
      const ratings = normalizePeerRatings(input.ratings, membership.id);
      for (const rating of ratings) {
        assertParticipant(rating.rateeMembershipId, participants, '평가 대상이 경기 참여자 명단에 없어요.');
      }

      await repositories.feedback.upsertPeerRatings({
        matchId: input.matchId,
        raterMembershipId: membership.id,
        ratings,
      });

      return { matchId: input.matchId, ratingCount: ratings.length, saved: true as const };
    },

    async getFeedback(input: {
      auth: AuthContext;
      matchId: string;
    }): Promise<MatchFeedbackResponse> {
      const membership = await requireApprovedMembership(input.auth, teamId);
      const match = await requireFeedbackMatch(input.matchId, teamId);
      const [participants, votes, ratings] = await Promise.all([
        repositories.participants.listForMatch(input.matchId),
        repositories.feedback.listMvpVotes(input.matchId),
        repositories.feedback.listPeerRatings(input.matchId),
      ]);
      const status = getFeedbackStatus(match);
      const results = status === 'closed'
        ? calculateFeedbackResults({ votes, ratings })
        : null;

      if (results) {
        await repositories.feedback.settle({
          matchId: input.matchId,
          winnerMembershipId: results.mvpMembershipId,
          ratingAverages: results.ratingAverages.map((rating) => ({
            membershipId: rating.membershipId,
            averageRating: rating.averageRating,
          })),
          participationMembershipIds: getParticipationMembershipIds(votes, ratings),
        });
      }

      return {
        matchId: input.matchId,
        status,
        feedbackDeadline: match.feedbackDeadline,
        participants,
        myVote: votes.find((vote) => vote.voterMembershipId === membership.id)?.candidateMembershipId ?? null,
        myRatedMembershipIds: ratings
          .filter((rating) => rating.raterMembershipId === membership.id)
          .map((rating) => rating.rateeMembershipId),
        voteCount: votes.length,
        ratingCount: ratings.length,
        results,
      };
    },
  };

  async function requireApprovedMembership(auth: AuthContext, teamId: string) {
    const membership = await repositories.memberships.findCurrentMembership(auth.user.id, teamId);
    if (!membership || membership.status !== 'approved') {
      throw new AppError('membership_not_approved', '승인된 회원만 매치 피드백을 사용할 수 있어요.');
    }
    return membership;
  }

  async function requireFeedbackMatch(matchId: string, teamId: string) {
    const match = await repositories.matches.findById(
      normalizeRequiredText(matchId, 'matchId is required.'),
      teamId,
    );
    if (!match || match.type !== 'match') {
      throw new AppError('not_found', '피드백 대상 경기를 찾을 수 없어요.');
    }
    if (match.status !== 'finished') {
      throw new AppError('conflict', '종료된 경기만 피드백을 받을 수 있어요.');
    }
    return match;
  }
}

function assertFeedbackOpen(match: MatchRow & { feedbackDeadline: string | null }) {
  if (getFeedbackStatus(match) !== 'open') {
    throw new AppError('conflict', '매치 피드백 기간이 아니에요.');
  }
}

function getFeedbackStatus(match: MatchRow & { feedbackDeadline: string | null }): MatchFeedbackResponse['status'] {
  if (!match.feedbackDeadline) return 'not_open';
  return new Date(match.feedbackDeadline).getTime() > Date.now() ? 'open' : 'closed';
}

function assertParticipant(membershipId: string, participants: MatchFeedbackParticipant[], message: string) {
  const normalizedMembershipId = normalizeRequiredText(membershipId, 'membershipId is required.');
  if (!participants.some((participant) => participant.membershipId === normalizedMembershipId)) {
    throw new AppError('bad_request', message);
  }
}

function normalizePeerRatings(
  ratings: Array<{ rateeMembershipId: string; rating: number; badges?: string[] | null }>,
  raterMembershipId: string,
) {
  if (!Array.isArray(ratings) || ratings.length === 0) {
    throw new AppError('bad_request', 'ratings must include at least one entry.');
  }

  const seen = new Set<string>();
  return ratings.map((entry) => {
    const rateeMembershipId = normalizeRequiredText(entry?.rateeMembershipId, 'rateeMembershipId is required.');
    if (rateeMembershipId === raterMembershipId) {
      throw new AppError('bad_request', '자기 자신은 평가할 수 없어요.');
    }
    if (seen.has(rateeMembershipId)) {
      throw new AppError('bad_request', '같은 멤버 평점은 한 번만 제출할 수 있어요.');
    }
    seen.add(rateeMembershipId);

    return {
      rateeMembershipId,
      rating: normalizeRating(entry?.rating),
      badges: normalizeBadges(entry?.badges),
    };
  });
}

function normalizeRating(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 10) {
    throw new AppError('bad_request', 'rating must be between 1.0 and 10.0.');
  }
  return Math.round(value * 10) / 10;
}

function normalizeBadges(value: unknown) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new AppError('bad_request', 'badges must be an array.');
  }

  const normalized = [...new Set(value.map((badge) => normalizeRequiredText(badge, 'badge is required.')))];
  if (normalized.length > 2) {
    throw new AppError('bad_request', 'badges can include up to two entries.');
  }
  for (const badge of normalized) {
    if (!MATCH_FEEDBACK_BADGES.includes(badge as MatchFeedbackBadge)) {
      throw new AppError('bad_request', 'badge is invalid.');
    }
  }
  return normalized;
}

function calculateFeedbackResults(input: {
  votes: MatchFeedbackVoteRow[];
  ratings: MatchFeedbackRatingRow[];
}): SettledMatchFeedback {
  const voteCounts = new Map<string, number>();
  for (const vote of input.votes) {
    voteCounts.set(vote.candidateMembershipId, (voteCounts.get(vote.candidateMembershipId) ?? 0) + 1);
  }
  const mvpMembershipId = [...voteCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? null;

  const ratingsByRatee = new Map<string, { total: number; count: number; badges: string[] }>();
  for (const rating of input.ratings) {
    const aggregate = ratingsByRatee.get(rating.rateeMembershipId) ?? { total: 0, count: 0, badges: [] };
    aggregate.total += rating.rating;
    aggregate.count += 1;
    aggregate.badges.push(...rating.badges);
    ratingsByRatee.set(rating.rateeMembershipId, aggregate);
  }

  return {
    mvpMembershipId,
    ratingAverages: [...ratingsByRatee.entries()].map(([membershipId, aggregate]) => ({
      membershipId,
      averageRating: Math.round((aggregate.total / aggregate.count) * 10) / 10,
      ratingCount: aggregate.count,
      topBadges: getTopBadges(aggregate.badges),
    })),
  };
}

function getTopBadges(badges: string[]) {
  const counts = new Map<string, number>();
  for (const badge of badges) {
    counts.set(badge, (counts.get(badge) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([badge]) => badge);
}

function getParticipationMembershipIds(votes: MatchFeedbackVoteRow[], ratings: MatchFeedbackRatingRow[]) {
  return [...new Set([
    ...votes.map((vote) => vote.voterMembershipId),
    ...ratings.map((rating) => rating.raterMembershipId),
  ])];
}

function normalizeRequiredText(value: unknown, message: string) {
  if (typeof value !== 'string') {
    throw new AppError('bad_request', message);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new AppError('bad_request', message);
  }
  return normalized;
}
