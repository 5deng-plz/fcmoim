import { AppError } from '../types/api';

const FC_GUPPY_TEAM_ID = '00000000-0000-0000-0000-000000000001';

export type TeamContext = Readonly<{
  teamId: string;
}>;

export type TeamContextRequest = Readonly<{
  requestedTeamId?: string | null;
  accountId?: string | null;
  access: 'public' | 'membership';
}>;

export type TeamContextAuthorizer = Readonly<{
  isPublicTeam(teamId: string): Promise<boolean>;
  hasApprovedMembership(accountId: string, teamId: string): Promise<boolean>;
}>;

export type TeamContextProvider = Readonly<{
  resolve(request: TeamContextRequest): Promise<TeamContext>;
}>;

type ServerTeamEnv = Partial<
  Pick<NodeJS.ProcessEnv, 'FC_GUPPY_CLUB_ID' | 'MULTI_CLUB_ENABLED' | 'NODE_ENV'>
>;

export function isMultiClubEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  return env.MULTI_CLUB_ENABLED === 'true';
}

export function assertMultiClubEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  if (!isMultiClubEnabled(env)) {
    throw new AppError('not_found', 'Multi-club API is disabled.');
  }
}

export function createFixedTeamContextProvider(
  env: ServerTeamEnv = process.env,
): TeamContextProvider {
  const context = getServerTeamContext(env);
  return {
    async resolve() {
      return context;
    },
  };
}

export function createMembershipTeamContextProvider(
  authorizer: TeamContextAuthorizer,
): TeamContextProvider {
  return {
    async resolve(request) {
      const teamId = request.requestedTeamId?.trim();
      if (!teamId) {
        throw teamContextError('bad_request', 400, 'A team id is required in multi-club mode.');
      }

      const allowed = request.access === 'public'
        ? await authorizer.isPublicTeam(teamId)
        : Boolean(
          request.accountId
          && await authorizer.hasApprovedMembership(request.accountId, teamId),
        );

      if (!allowed) {
        throw teamContextError('not_found', 404, 'The requested team is not available.');
      }

      return Object.freeze({ teamId });
    },
  };
}

export function createTeamContextResolver(
  authorizer: TeamContextAuthorizer,
  env: ServerTeamEnv = process.env,
): TeamContextProvider {
  return isMultiClubEnabled(env)
    ? createMembershipTeamContextProvider(authorizer)
    : createFixedTeamContextProvider(env);
}

export function getServerTeamContext(
  env: ServerTeamEnv = process.env,
): TeamContext {
  const configuredTeamId = env.FC_GUPPY_CLUB_ID?.trim();

  if (configuredTeamId && configuredTeamId !== FC_GUPPY_TEAM_ID) {
    throw new Error(
      `[FC Moim] FC_GUPPY_CLUB_ID must be ${FC_GUPPY_TEAM_ID}.`,
    );
  }

  if (env.NODE_ENV === 'production' && !configuredTeamId) {
    throw new Error('[FC Moim] FC_GUPPY_CLUB_ID is required in production.');
  }

  return Object.freeze({ teamId: FC_GUPPY_TEAM_ID });
}

export function getServerTeamId() {
  return getServerTeamContext().teamId;
}

function teamContextError(code: 'bad_request' | 'not_found', status: number, message: string) {
  return new AppError(code, message, { status });
}
