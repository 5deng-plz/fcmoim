import { describe, expect, it } from 'vitest';
import {
  assertMultiClubEnabled,
  createFixedTeamContextProvider,
  createMembershipTeamContextProvider,
  createTeamContextResolver,
  getServerTeamContext,
  isMultiClubEnabled,
} from '../src/config/server-team';

const FC_GUPPY_TEAM_ID = '00000000-0000-0000-0000-000000000001';

describe('server team context', () => {
  it('returns the canonical FC Guppy team in local and test runtimes', () => {
    expect(getServerTeamContext({ NODE_ENV: 'test' })).toEqual({
      teamId: FC_GUPPY_TEAM_ID,
    });
    expect(getServerTeamContext({
      NODE_ENV: 'test',
      FC_GUPPY_CLUB_ID: FC_GUPPY_TEAM_ID,
    })).toEqual({
      teamId: FC_GUPPY_TEAM_ID,
    });
  });

  it('rejects a different configured team id', () => {
    expect(() => getServerTeamContext({
      NODE_ENV: 'test',
      FC_GUPPY_CLUB_ID: '00000000-0000-0000-0000-000000000999',
    })).toThrow(`FC_GUPPY_CLUB_ID must be ${FC_GUPPY_TEAM_ID}`);
  });

  it('requires the server-only team id in production', () => {
    expect(() => getServerTeamContext({ NODE_ENV: 'production' }))
      .toThrow('FC_GUPPY_CLUB_ID is required in production');
  });

  it('defaults multi-club mode to disabled and hides gated APIs', () => {
    expect(isMultiClubEnabled({})).toBe(false);
    expect(isMultiClubEnabled({ MULTI_CLUB_ENABLED: 'false' })).toBe(false);
    expect(isMultiClubEnabled({ MULTI_CLUB_ENABLED: 'true' })).toBe(true);
    expect(() => assertMultiClubEnabled({})).toThrow('Multi-club API is disabled');
  });

  it('uses the fixed provider in single-team mode and ignores requested ids', async () => {
    const authorizer = {
      isPublicTeam: async () => false,
      hasApprovedMembership: async () => false,
    };
    const provider = createTeamContextResolver(authorizer, { NODE_ENV: 'test' });

    await expect(provider.resolve({
      requestedTeamId: '00000000-0000-0000-0000-000000000999',
      access: 'public',
    })).resolves.toEqual({ teamId: FC_GUPPY_TEAM_ID });
    await expect(createFixedTeamContextProvider({ NODE_ENV: 'test' }).resolve({
      access: 'membership',
    })).resolves.toEqual({ teamId: FC_GUPPY_TEAM_ID });
  });

  it('requires an authorized requested team in multi-club mode', async () => {
    const allowedTeamId = '00000000-0000-0000-0000-000000000222';
    const provider = createMembershipTeamContextProvider({
      isPublicTeam: async (teamId) => teamId === allowedTeamId,
      hasApprovedMembership: async (accountId, teamId) => (
        accountId === 'account-1' && teamId === allowedTeamId
      ),
    });

    await expect(provider.resolve({
      requestedTeamId: allowedTeamId,
      access: 'public',
    })).resolves.toEqual({ teamId: allowedTeamId });
    await expect(provider.resolve({
      requestedTeamId: allowedTeamId,
      accountId: 'account-1',
      access: 'membership',
    })).resolves.toEqual({ teamId: allowedTeamId });
    await expect(provider.resolve({
      requestedTeamId: allowedTeamId,
      accountId: 'account-2',
      access: 'membership',
    })).rejects.toMatchObject({ code: 'not_found', status: 404 });
    await expect(provider.resolve({
      access: 'public',
    })).rejects.toMatchObject({ code: 'bad_request', status: 400 });
  });
});
