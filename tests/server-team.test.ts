import { describe, expect, it } from 'vitest';
import { getServerTeamContext } from '../src/config/server-team';

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
});
