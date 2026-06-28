import { AppError } from '../types/api';
import type { TeamContext } from '../config/server-team';
import type {
  AuthContext,
  MatchAttendeeRow,
  MatchLineupEntryRow,
  MatchEventType,
  MatchLineupTeamNumber,
  MatchRow,
  PositionCode,
  TeamMembershipRow,
} from '../types/domain';

type MatchMembership = Pick<TeamMembershipRow, 'id' | 'role' | 'status'>;

export type MatchRepositories = {
  memberships: {
    findCurrentMembership(accountId: string, clubId: string): Promise<MatchMembership | null>;
  };
  seasons: {
    findActiveForTeam(clubId: string): Promise<{ id: string } | null>;
  };
  matches: {
    listUpcoming(input: { clubId: string; now: string }): Promise<MatchRow[]>;
    listCalendar(input: { clubId: string; from: string; to: string }): Promise<MatchRow[]>;
    findNonCancelledMatchOnDate(input: { clubId: string; date: string }): Promise<MatchRow | null>;
    findMaxRoundBySeason(seasonId: string): Promise<number | null>;
    create(input: {
      clubId: string;
      seasonId: string;
      round: number | null;
      title: string;
      date: string;
      location: string;
      type: MatchEventType;
      memo: string | null;
      createdByMembershipId: string;
    }): Promise<MatchRow>;
    findById(matchId: string, teamId: string): Promise<MatchRow | null>;
    cancel(input: {
      matchId: string;
      cancelledByMembershipId: string;
      cancellationReason: string;
    }): Promise<MatchRow>;
    updateLineupConfirmation(input: {
      matchId: string;
      teamNumber: MatchLineupTeamNumber;
      confirmed: boolean;
      updatedByMembershipId: string;
      redLeaderConfirmed: boolean;
      blueLeaderConfirmed: boolean;
    }): Promise<MatchRow>;
    publishLineup(input: {
      matchId: string;
      updatedByMembershipId: string;
    }): Promise<MatchRow>;
  };
  attendees: {
    listForMatch(matchId: string): Promise<MatchAttendeeRow[]>;
    add(input: {
      matchId: string;
      membershipId?: string;
      membershipIds?: string[];
    }): Promise<MatchAttendeeRow[]>;
  };
  lineups: {
    listForMatch(matchId: string): Promise<MatchLineupEntryRow[]>;
    replaceForMatch(input: {
      matchId: string;
      updatedByMembershipId: string;
      entries: SaveMatchLineupEntry[];
      redLeaderConfirmed: boolean;
      blueLeaderConfirmed: boolean;
    }): Promise<MatchLineupEntryRow[]>;
    addPick(input: {
      matchId: string;
      membershipId: string;
      teamNumber: MatchLineupTeamNumber;
      isComplete: boolean;
      formationSlot: number | null;
    }): Promise<MatchLineupEntryRow[]>;
  };
};

export type SaveMatchLineupEntry = {
  membershipId: string;
  teamNumber: MatchLineupTeamNumber;
  isLeader: boolean;
  position: PositionCode;
  formationSlot?: number | null;
};

export function createMatchService(
  repositories: MatchRepositories,
  teamContext: TeamContext,
) {
  const teamId = teamContext.teamId;

  return {
    async createMatch(input: {
      auth: AuthContext;
      type: MatchEventType;
      title?: string | null;
      date: string;
      time: string;
      location: string;
      memo?: string | null;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertCanManageMatches(membership);

      const season = await repositories.seasons.findActiveForTeam(teamId);
      if (!season) {
        throw new AppError('bad_request', '활성 시즌이 없어 일정을 만들 수 없어요.');
      }

      const type = normalizeMatchEventType(input.type);
      const matchDate = toKoreaIsoDateTime(normalizeIsoDate(input.date), normalizeTime(input.time));

      if (type === 'match') {
        const existingMatch = await repositories.matches.findNonCancelledMatchOnDate({
          clubId: teamId,
          date: matchDate,
        });
        if (existingMatch) {
          throw new AppError('conflict', '이미 같은 날짜에 등록된 경기가 있어요.');
        }
      }

      const round = type === 'match'
        ? (await repositories.matches.findMaxRoundBySeason(season.id) ?? 0) + 1
        : null;

      return repositories.matches.create({
        clubId: teamId,
        seasonId: season.id,
        round,
        title: normalizeMatchTitle(input.title, type, round),
        date: matchDate,
        location: normalizeRequiredText(input.location, 'Location is required.'),
        type,
        memo: normalizeOptionalText(input.memo),
        createdByMembershipId: membership.id,
      });
    },

    async listUpcomingMatches(input: {
      auth: AuthContext;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertApprovedMember(membership);

      return repositories.matches.listUpcoming({
        clubId: teamId,
        now: new Date().toISOString(),
      });
    },

    async listCalendarMatches(input: {
      auth: AuthContext;
      from: string;
      to: string;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertApprovedMember(membership);

      return repositories.matches.listCalendar({
        clubId: teamId,
        from: normalizeIsoDate(input.from),
        to: normalizeIsoDate(input.to),
      });
    },

    async cancelMatch(input: {
      auth: AuthContext;
      matchId: string;
      cancellationReason: string;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertCanManageMatches(membership);

      const match = await repositories.matches.findById(input.matchId, teamId);
      if (!match) {
        throw new AppError('not_found', 'Match was not found.');
      }
      if (match.status !== 'scheduled' && match.status !== 'locker_room') {
        throw new AppError('conflict', 'Only upcoming matches can be cancelled.');
      }

      return repositories.matches.cancel({
        matchId: input.matchId,
        cancelledByMembershipId: membership.id,
        cancellationReason: normalizeRequiredText(input.cancellationReason, 'Cancellation reason is required.'),
      });
    },

    async getMatchLineup(input: {
      auth: AuthContext;
      matchId: string;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertApprovedMember(membership);
      await assertMatchInClub(input.matchId, teamId);

      return repositories.lineups.listForMatch(input.matchId);
    },

    async getMatchAttendees(input: {
      auth: AuthContext;
      matchId: string;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertApprovedMember(membership);
      await assertMatchInClub(input.matchId, teamId);

      return repositories.attendees.listForMatch(input.matchId);
    },

    async addMatchAttendee(input: {
      auth: AuthContext;
      matchId: string;
      membershipId?: string;
      membershipIds?: string[];
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertCanManageMatches(membership);
      await assertUpcomingMatchInClub(input.matchId, teamId);

      if (input.membershipIds && input.membershipIds.length > 0) {
        return repositories.attendees.add({
          matchId: input.matchId,
          membershipIds: input.membershipIds,
        });
      }

      return repositories.attendees.add({
        matchId: input.matchId,
        membershipId: normalizeRequiredText(input.membershipId, 'Attendee membershipId is required.'),
      });
    },

    async saveMatchLineup(input: {
      auth: AuthContext;
      matchId: string;
      entries: SaveMatchLineupEntry[];
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertApprovedMember(membership);

      const match = await assertMatchInClub(input.matchId, teamId);
      if (match.status !== 'scheduled' && match.status !== 'locker_room') {
        throw new AppError('conflict', 'Only upcoming matches can receive lineup assignments.');
      }

      const entries = normalizeLineupEntries(input.entries);
      const isOperator = membership.role === 'admin' || membership.role === 'operator';
      const currentLineup = await repositories.lineups.listForMatch(input.matchId);
      if (!isOperator) {
        assertLeaderLineupEditAllowed({
          membershipId: membership.id,
          currentLineup,
          nextEntries: entries,
        });
      }

      return repositories.lineups.replaceForMatch({
        matchId: input.matchId,
        updatedByMembershipId: membership.id,
        entries,
        ...getLineupConfirmationAfterSave({
          match,
          currentLineup,
          nextEntries: entries,
        }),
      });
    },

    async pickLineupPlayer(input: {
      auth: AuthContext;
      matchId: string;
      membershipId: string;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertApprovedMember(membership);
      await assertUpcomingMatchInClub(input.matchId, teamId);

      const [attendees, lineup] = await Promise.all([
        repositories.attendees.listForMatch(input.matchId),
        repositories.lineups.listForMatch(input.matchId),
      ]);
      const membershipId = normalizeRequiredText(input.membershipId, 'Lineup membershipId is required.');
      assertAttendeeCanBePicked(membershipId, attendees, lineup);

      const turn = getNextLineupTurn(lineup);
      if (!turn) {
        throw new AppError('conflict', 'Both team leaders are required before draft picks.');
      }
      const isOperator = membership.role === 'admin' || membership.role === 'operator';
      if (!isOperator && membership.id !== turn.leaderMembershipId) {
        throw new AppError('forbidden', '현재 턴의 팀 리더만 선수를 배치할 수 있어요.');
      }

      return repositories.lineups.addPick({
        matchId: input.matchId,
        membershipId,
        teamNumber: turn.teamNumber,
        isComplete: attendees.length === lineup.length + 1,
        formationSlot: getNextFormationSlot(turn.teamNumber, lineup),
      });
    },

    async confirmMatchLineup(input: {
      auth: AuthContext;
      matchId: string;
      teamNumber: MatchLineupTeamNumber;
      confirmed?: boolean;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertApprovedMember(membership);

      const match = await assertUpcomingMatchInClub(input.matchId, teamId);
      const teamNumber = normalizeTeamNumber(input.teamNumber);
      const lineup = await repositories.lineups.listForMatch(input.matchId);
      const teamLeader = lineup.find((entry) => entry.teamNumber === teamNumber && entry.isLeader);
      if (!teamLeader) {
        throw new AppError('conflict', '확정할 팀 리더가 없어요.');
      }

      const isOperator = membership.role === 'admin' || membership.role === 'operator';
      if (!isOperator && membership.id !== teamLeader.membershipId) {
        throw new AppError('forbidden', '해당 팀 리더만 전술을 확정할 수 있어요.');
      }

      return repositories.matches.updateLineupConfirmation({
        matchId: match.id,
        teamNumber,
        confirmed: input.confirmed ?? true,
        updatedByMembershipId: membership.id,
        redLeaderConfirmed: match.redLeaderConfirmed,
        blueLeaderConfirmed: match.blueLeaderConfirmed,
      });
    },

    async publishMatchLineup(input: {
      auth: AuthContext;
      matchId: string;
    }) {
      const membership = await repositories.memberships.findCurrentMembership(input.auth.user.id, teamId);
      assertCanManageMatches(membership);

      const match = await assertUpcomingMatchInClub(input.matchId, teamId);

      return repositories.matches.publishLineup({
        matchId: match.id,
        updatedByMembershipId: membership.id,
      });
    },
  };

  async function assertMatchInClub(matchId: string, teamId: string) {
    const match = await repositories.matches.findById(matchId, teamId);
    if (!match) {
      throw new AppError('not_found', 'Match was not found for this club.');
    }

    return match;
  }

  async function assertUpcomingMatchInClub(matchId: string, teamId: string) {
    const match = await assertMatchInClub(matchId, teamId);
    if (match.status !== 'scheduled' && match.status !== 'locker_room') {
      throw new AppError('conflict', 'Only upcoming matches can be managed.');
    }

    return match;
  }
}

function getLineupConfirmationAfterSave(input: {
  match: Pick<MatchRow, 'redLeaderConfirmed' | 'blueLeaderConfirmed'>;
  currentLineup: MatchLineupEntryRow[];
  nextEntries: ReturnType<typeof normalizeLineupEntries>;
}) {
  const redChanged = hasLineupTeamChanged(input.currentLineup, input.nextEntries, 1);
  const blueChanged = hasLineupTeamChanged(input.currentLineup, input.nextEntries, 2);

  return {
    redLeaderConfirmed: redChanged ? false : input.match.redLeaderConfirmed,
    blueLeaderConfirmed: blueChanged ? false : input.match.blueLeaderConfirmed,
  };
}

function hasLineupTeamChanged(
  currentLineup: MatchLineupEntryRow[],
  nextEntries: ReturnType<typeof normalizeLineupEntries>,
  teamNumber: MatchLineupTeamNumber,
) {
  const currentTeam = currentLineup
    .filter((entry) => entry.teamNumber === teamNumber)
    .map((entry) => ({
      membershipId: entry.membershipId,
      teamNumber: entry.teamNumber,
      isLeader: entry.isLeader,
      position: entry.position,
      formationSlot: entry.formationSlot ?? null,
    }));
  const nextTeam = nextEntries.filter((entry) => entry.teamNumber === teamNumber);

  return serializeLineupTeam(currentTeam) !== serializeLineupTeam(nextTeam);
}

function assertApprovedMember(membership: MatchMembership | null): asserts membership is MatchMembership {
  if (!membership || membership.status !== 'approved') {
    throw new AppError('membership_not_approved', 'This action requires an approved team membership.', { status: 403 });
  }
}

function assertCanManageMatches(membership: MatchMembership | null): asserts membership is MatchMembership {
  if (
    !membership ||
    membership.status !== 'approved' ||
    (membership.role !== 'admin' && membership.role !== 'operator')
  ) {
    throw new AppError('forbidden', 'Only approved club operators can manage matches.');
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
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizeMatchEventType(value: MatchEventType): MatchEventType {
  if (value === 'match' || value === 'training' || value === 'seminar' || value === 'etc') {
    return value;
  }

  throw new AppError('bad_request', 'Schedule type is invalid.');
}

function normalizeTeamNumber(value: MatchLineupTeamNumber): MatchLineupTeamNumber {
  if (value === 1 || value === 2) {
    return value;
  }

  throw new AppError('bad_request', 'teamNumber must be 1 or 2.');
}

function normalizeMatchTitle(value: string | null | undefined, type: MatchEventType, round: number | null = null) {
  if (type === 'match') {
    return normalizeOptionalText(value) ?? `Round ${round ?? 1}`;
  }

  return normalizeRequiredText(value, 'Schedule title is required.');
}

function normalizeIsoDate(value: string) {
  const normalized = normalizeRequiredText(value, 'Schedule date is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new AppError('bad_request', 'Schedule date must be YYYY-MM-DD.');
  }

  const date = new Date(`${normalized}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('bad_request', 'Schedule date is invalid.');
  }

  return normalized;
}

function assertAttendeeCanBePicked(
  membershipId: string,
  attendees: MatchAttendeeRow[],
  lineup: MatchLineupEntryRow[],
) {
  if (!attendees.some((attendee) => attendee.membershipId === membershipId)) {
    throw new AppError('bad_request', 'Only match attendees can be drafted.');
  }
  if (lineup.some((entry) => entry.membershipId === membershipId)) {
    throw new AppError('conflict', 'This attendee is already assigned.');
  }
}

function getNextLineupTurn(lineup: MatchLineupEntryRow[]) {
  const redLeader = lineup.find((entry) => entry.teamNumber === 1 && entry.isLeader);
  const blueLeader = lineup.find((entry) => entry.teamNumber === 2 && entry.isLeader);
  if (!redLeader || !blueLeader) return null;

  const redPicks = lineup.filter((entry) => entry.teamNumber === 1 && !entry.isLeader).length;
  const bluePicks = lineup.filter((entry) => entry.teamNumber === 2 && !entry.isLeader).length;
  return redPicks <= bluePicks
    ? { teamNumber: 1 as const, leaderMembershipId: redLeader.membershipId }
    : { teamNumber: 2 as const, leaderMembershipId: blueLeader.membershipId };
}

function normalizeTime(value: string) {
  const normalized = normalizeRequiredText(value, 'Schedule time is required.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw new AppError('bad_request', 'Schedule time must be HH:mm.');
  }

  return normalized;
}

function toKoreaIsoDateTime(date: string, time: string) {
  return `${date}T${time}:00+09:00`;
}

function normalizeLineupEntries(entries: SaveMatchLineupEntry[]) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new AppError('bad_request', 'Lineup entries are required.');
  }

  const membershipIds = new Set<string>();
  const normalized = entries.map((entry) => {
    if (!entry || typeof entry.membershipId !== 'string' || !entry.membershipId.trim()) {
      throw new AppError('bad_request', 'Lineup membershipId is required.');
    }
    if (entry.teamNumber !== 1 && entry.teamNumber !== 2) {
      throw new AppError('bad_request', 'Lineup teamNumber must be 1 or 2.');
    }
    if (entry.position !== 'FW' && entry.position !== 'MF' && entry.position !== 'DF') {
      throw new AppError('bad_request', 'Lineup position must be FW, MF, or DF.');
    }

    const membershipId = entry.membershipId.trim();
    if (membershipIds.has(membershipId)) {
      throw new AppError('bad_request', 'Lineup entries must not duplicate members.');
    }
    membershipIds.add(membershipId);

    return {
      membershipId,
      teamNumber: entry.teamNumber,
      isLeader: Boolean(entry.isLeader),
      position: entry.position,
      formationSlot: normalizeFormationSlot(entry.formationSlot),
    };
  });

  const hasRed = normalized.some((entry) => entry.teamNumber === 1);
  const hasBlue = normalized.some((entry) => entry.teamNumber === 2);
  if (!hasRed || !hasBlue) {
    throw new AppError('bad_request', 'Lineup needs at least one Red and one Blue player.');
  }

  return normalized;
}

function assertLeaderLineupEditAllowed(input: {
  membershipId: string;
  currentLineup: MatchLineupEntryRow[];
  nextEntries: ReturnType<typeof normalizeLineupEntries>;
}) {
  const managedTeams = new Set(
    input.currentLineup
      .filter((entry) => entry.membershipId === input.membershipId && entry.isLeader)
      .map((entry) => entry.teamNumber),
  );

  if (managedTeams.size === 0) {
    throw new AppError('forbidden', 'Only team leaders can edit their team tactics.');
  }

  for (const teamNumber of [1, 2] as const) {
    if (managedTeams.has(teamNumber)) continue;
    const currentTeam = input.currentLineup
      .filter((entry) => entry.teamNumber === teamNumber)
      .map((entry) => ({
        membershipId: entry.membershipId,
        teamNumber: entry.teamNumber,
        isLeader: entry.isLeader,
        position: entry.position,
        formationSlot: entry.formationSlot ?? null,
      }));
    const nextTeam = input.nextEntries.filter((entry) => entry.teamNumber === teamNumber);
    if (serializeLineupTeam(currentTeam) !== serializeLineupTeam(nextTeam)) {
      throw new AppError('forbidden', 'Team leaders can edit only their own team tactics.');
    }
  }
}

function serializeLineupTeam(entries: Array<{
  membershipId: string;
  teamNumber: MatchLineupTeamNumber;
  isLeader: boolean;
  position: PositionCode;
  formationSlot: number | null;
}>) {
  return JSON.stringify([...entries].sort((left, right) => left.membershipId.localeCompare(right.membershipId)));
}

function normalizeFormationSlot(value: unknown) {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 35) {
    throw new AppError('bad_request', 'Formation slot must be between 0 and 35.');
  }
  return Number(value);
}

function getNextFormationSlot(teamNumber: MatchLineupTeamNumber, lineup: MatchLineupEntryRow[]) {
  const usedSlots = new Set(
    lineup
      .filter((entry) => entry.teamNumber === teamNumber && entry.formationSlot !== null)
      .map((entry) => entry.formationSlot as number),
  );
  const fallbackSlots = teamNumber === 1
    ? [6, 0, 12, 7, 13, 1, 8, 14, 2, 9, 15, 3, 10, 16, 4, 11, 17, 5]
    : [11, 5, 17, 10, 16, 4, 9, 15, 3, 8, 14, 2, 7, 13, 1, 6, 12, 0];

  return fallbackSlots.find((slot) => !usedSlots.has(slot)) ?? null;
}
