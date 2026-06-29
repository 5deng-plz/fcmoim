import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTeamContextResolver,
  type TeamContext,
  type TeamContextRequest,
} from '../config/server-team';
import { createSupabaseTeamContextAuthorizer } from './repositories';

export async function resolveTeamContext(
  supabase: SupabaseClient,
  request: TeamContextRequest,
  env: NodeJS.ProcessEnv = process.env,
): Promise<TeamContext> {
  return createTeamContextResolver(
    createSupabaseTeamContextAuthorizer(supabase),
    env,
  ).resolve(request);
}
