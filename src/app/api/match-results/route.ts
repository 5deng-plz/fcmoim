import { appErrorResponse } from '../../../types/api';
import { AppError } from '../../../types/api';
import { getServerTeamId } from '@/config/server-team';
import { createSupabaseServerClient, getRequiredServerAuthContext } from '../../../lib/supabase-server';
import { createMatchResultService } from '../../../services/match-results';
import { createSupabaseMatchResultRepositories } from '../../../services/supabase-repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseSaveMatchResultBody(body);
    const supabase = await createSupabaseServerClient();
    const auth = await getRequiredServerAuthContext(supabase);
    const service = createMatchResultService(createSupabaseMatchResultRepositories(supabase));

    const result = await service.saveMatchResult({
      auth,
      ...input,
    });

    return Response.json(result);
  } catch (error) {
    return appErrorResponse(error);
  }
}

function parseSaveMatchResultBody(body: unknown) {
  if (!isRecord(body)) {
    throw new AppError('bad_request', 'Request body is required.');
  }

  const matchId = typeof body.matchId === 'string' ? body.matchId.trim() : '';
  if (!matchId) {
    throw new AppError('bad_request', 'matchId is required.');
  }
  if (!isRecord(body.score)) {
    throw new AppError('bad_request', 'score is required.');
  }
  if (!Array.isArray(body.playerStats)) {
    throw new AppError('bad_request', 'playerStats must be an array.');
  }

  return {
    clubId: getServerTeamId(),
    matchId,
    score: {
      home: parseCount(body.score.home, 'score.home'),
      away: parseCount(body.score.away, 'score.away'),
    },
    playerStats: body.playerStats.map((stat) => {
      if (!isRecord(stat)) {
        throw new AppError('bad_request', 'playerStats entries must be objects.');
      }
      const membershipId = typeof stat.membershipId === 'string' ? stat.membershipId.trim() : '';
      if (!membershipId) {
        throw new AppError('bad_request', 'playerStats membershipId is required.');
      }

      return {
        membershipId,
        goals: parseCount(stat.goals, 'goals'),
        assists: parseCount(stat.assists, 'assists'),
      };
    }),
  };
}

function parseCount(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 99) {
    throw new AppError('bad_request', `${label} must be an integer between 0 and 99.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
