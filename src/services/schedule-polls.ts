import { AppError } from '../types/api';
import type {
  AuthContext,
  SchedulePollRow,
  TeamMembershipRow,
} from '../types/domain';

type SchedulePollMembership = Pick<TeamMembershipRow, 'id' | 'clubId' | 'role' | 'status'>;

type CreatePollRepositoryInput = {
  clubId: string;
  seasonId: string | null;
  title: string;
  commonTime: string;
  location: string;
  memo: string | null;
  closesAt: string | null;
  createdByMembershipId: string;
  optionDates: string[];
};

export type SchedulePollRepositories = {
  memberships: {
    findByAccountAndClub(accountId: string, clubId: string): Promise<SchedulePollMembership | null>;
  };
  polls: {
    create(input: CreatePollRepositoryInput): Promise<SchedulePollRow>;
    listActive(clubId: string): Promise<SchedulePollRow[]>;
    findById(pollId: string): Promise<SchedulePollRow | null>;
    replaceVote(input: {
      pollId: string;
      membershipId: string;
      selectedOptionIds: string[];
    }): Promise<SchedulePollRow>;
    promoteToMatch(input: {
      pollId: string;
      optionId: string;
      promotedByMembershipId: string;
    }): Promise<{ pollId: string; matchId: string }>;
  };
};

export function createSchedulePollService(repositories: SchedulePollRepositories) {
  return {
    async createPoll(input: {
      auth: AuthContext;
      authUid?: string;
      clubId: string;
      seasonId?: string | null;
      title: string;
      commonTime: string;
      location: string;
      optionDates: string[];
      memo?: string | null;
      closesAt?: string | null;
    }) {
      void input.authUid;
      const membership = await findMembership(repositories, input.auth, input.clubId);
      assertCanManageSchedulePolls(membership);

      return repositories.polls.create({
        clubId: input.clubId,
        seasonId: input.seasonId ?? null,
        title: normalizeRequiredText(input.title, 'Poll title is required.'),
        commonTime: normalizeTime(input.commonTime),
        location: normalizeRequiredText(input.location, 'Poll location is required.'),
        memo: normalizeOptionalText(input.memo),
        closesAt: input.closesAt ?? null,
        createdByMembershipId: membership.id,
        optionDates: normalizeOptionDates(input.optionDates),
      });
    },

    async listActivePolls(input: {
      auth: AuthContext;
      clubId: string;
    }) {
      const membership = await findMembership(repositories, input.auth, input.clubId);
      assertApprovedMember(membership);

      return repositories.polls.listActive(input.clubId);
    },

    async votePoll(input: {
      auth: AuthContext;
      clubId: string;
      pollId: string;
      selectedOptionIds: string[];
    }) {
      const membership = await findMembership(repositories, input.auth, input.clubId);
      assertApprovedMember(membership);

      const poll = await findPoll(repositories, input.pollId);
      assertPollBelongsToClub(poll, input.clubId);
      assertPollIsOpen(poll);

      return repositories.polls.replaceVote({
        pollId: input.pollId,
        membershipId: membership.id,
        selectedOptionIds: normalizeSelectedOptionIds(input.selectedOptionIds, poll),
      });
    },

    async promotePoll(input: {
      auth: AuthContext;
      clubId: string;
      pollId: string;
      optionId: string;
    }) {
      const membership = await findMembership(repositories, input.auth, input.clubId);
      assertCanManageSchedulePolls(membership);

      const poll = await findPoll(repositories, input.pollId);
      assertPollBelongsToClub(poll, input.clubId);
      assertPollOptionBelongsToPoll(input.optionId, poll);

      return repositories.polls.promoteToMatch({
        pollId: input.pollId,
        optionId: input.optionId,
        promotedByMembershipId: membership.id,
      });
    },
  };
}

async function findMembership(
  repositories: SchedulePollRepositories,
  auth: AuthContext,
  clubId: string,
) {
  return repositories.memberships.findByAccountAndClub(auth.user.id, clubId);
}

async function findPoll(repositories: SchedulePollRepositories, pollId: string) {
  const poll = await repositories.polls.findById(pollId);
  if (!poll) {
    throw new AppError('not_found', 'Schedule poll was not found.');
  }

  return poll;
}

function assertCanManageSchedulePolls(membership: SchedulePollMembership | null): asserts membership is SchedulePollMembership {
  if (
    !membership ||
    membership.status !== 'approved' ||
    (membership.role !== 'admin' && membership.role !== 'operator')
  ) {
    throw new AppError('forbidden', 'Only approved club operators can manage schedule polls.');
  }
}

function assertApprovedMember(membership: SchedulePollMembership | null): asserts membership is SchedulePollMembership {
  if (!membership || membership.status !== 'approved') {
    throw new AppError(
      'membership_not_approved',
      'This action requires an approved team membership.',
      { status: 403 },
    );
  }
}

function assertPollBelongsToClub(poll: SchedulePollRow, clubId: string) {
  if (poll.clubId !== clubId) {
    throw new AppError('not_found', 'Schedule poll was not found for this club.');
  }
}

function assertPollIsOpen(poll: SchedulePollRow) {
  if (poll.status !== 'open') {
    throw new AppError('conflict', 'Schedule poll is not open for voting.');
  }
}

function assertPollOptionBelongsToPoll(optionId: string, poll: SchedulePollRow) {
  if (!poll.options.some((option) => option.id === optionId)) {
    throw new AppError('bad_request', 'Selected option does not belong to this poll.');
  }
}

function normalizeRequiredText(value: string | null | undefined, message: string) {
  if (typeof value !== 'string') {
    throw new AppError('bad_request', message);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new AppError('bad_request', message);
  }

  return normalized;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeTime(value: string | null | undefined) {
  if (typeof value !== 'string') {
    throw new AppError('bad_request', 'Poll time must be HH:mm.');
  }

  const normalized = value.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw new AppError('bad_request', 'Poll time must be HH:mm.');
  }

  return normalized;
}

function normalizeOptionDates(optionDates: string[]) {
  if (!Array.isArray(optionDates)) {
    throw new AppError('bad_request', 'Poll option dates are required.');
  }

  const uniqueDates = Array.from(new Set(optionDates.map((date) => {
    if (typeof date !== 'string') {
      throw new AppError('bad_request', 'Poll option dates must be YYYY-MM-DD.');
    }

    return date.trim();
  }).filter(Boolean))).sort();
  if (uniqueDates.length < 2 || uniqueDates.length > 4) {
    throw new AppError('bad_request', 'Schedule polls require between 2 and 4 option dates.');
  }

  for (const date of uniqueDates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError('bad_request', 'Poll option dates must be YYYY-MM-DD.');
    }
  }

  return uniqueDates;
}

function normalizeSelectedOptionIds(optionIds: string[], poll: SchedulePollRow) {
  if (!Array.isArray(optionIds)) {
    throw new AppError('bad_request', 'Poll option selections are required.');
  }

  const selectedOptionIds = Array.from(new Set(optionIds.map((optionId) => {
    if (typeof optionId !== 'string') {
      throw new AppError('bad_request', 'Poll option selections are required.');
    }

    return optionId.trim();
  }).filter(Boolean))).sort();
  if (selectedOptionIds.length === 0) {
    throw new AppError('bad_request', 'At least one poll option must be selected.');
  }

  selectedOptionIds.forEach((optionId) => assertPollOptionBelongsToPoll(optionId, poll));

  return selectedOptionIds;
}
