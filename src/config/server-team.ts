const FC_GUPPY_TEAM_ID = '00000000-0000-0000-0000-000000000001';

export type TeamContext = Readonly<{
  teamId: string;
}>;

export function getServerTeamContext(
  env: Partial<Pick<NodeJS.ProcessEnv, 'FC_GUPPY_CLUB_ID' | 'NODE_ENV'>> = process.env,
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
