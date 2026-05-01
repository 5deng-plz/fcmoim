import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(join(process.cwd(), 'supabase/stage1_init.sql'), 'utf8');

describe('Stage 1 Supabase schema contract', () => {
  it('keeps Account + TeamMembership as the membership boundary', () => {
    expect(sql).toContain('create table if not exists public.accounts');
    expect(sql).toContain('create table if not exists public.team_memberships');
    expect(sql).toContain('unique (account_id, club_id)');
    expect(sql).not.toMatch(/auth_uid\s+[^,\n]*unique/i);
  });

  it('defines schedule poll tables with RLS enabled for creation and member voting', () => {
    for (const tableName of [
      'schedule_polls',
      'schedule_poll_options',
      'schedule_poll_votes',
    ]) {
      expect(sql).toContain(`create table if not exists public.${tableName}`);
      expect(sql).toContain(`alter table public.${tableName} enable row level security`);
    }

    expect(sql).toContain('private.is_member_for_schedule_poll');
    expect(sql).toContain('private.membership_can_vote_schedule_poll');
    expect(sql).toContain('Club operators can insert schedule polls');
    expect(sql).toContain('Members can upsert own schedule poll votes');
    expect(sql).toContain('create index if not exists schedule_polls_created_by_idx');
    expect(sql).toContain('create index if not exists schedule_poll_votes_poll_option_idx');
    expect(sql).toContain('create index if not exists schedule_poll_votes_membership_idx');
  });

  it('keeps advisor-sensitive policies and foreign keys indexed', () => {
    expect(sql).toContain('create policy "Approved members and operators can read reward badges"');
    expect(sql).toContain('create policy "Club operators can insert reward badges"');
    expect(sql).toContain('create policy "Club operators can update reward badges"');
    expect(sql).toContain('create policy "Club operators can delete reward badges"');
    expect(sql).not.toContain('create policy "Club operators can manage reward badges"');

    for (const indexName of [
      'clubs_created_by_idx',
      'matches_created_by_idx',
      'announcements_season_idx',
      'announcements_author_membership_idx',
      'membership_badges_badge_idx',
      'schedule_polls_season_idx',
      'schedule_polls_promoted_match_idx',
    ]) {
      expect(sql).toContain(`create index if not exists ${indexName}`);
    }
  });

  it('exposes match result persistence only through a service-role RPC', () => {
    expect(sql).toContain('create or replace function private.save_match_result_atomically');
    expect(sql).toContain('create or replace function public.save_match_result_atomically');
    expect(sql).toContain('security invoker');
    expect(sql).toContain("auth.role() <> 'service_role'");
    expect(sql).not.toMatch(/create or replace function public\.save_match_result_atomically[\s\S]*?security definer/i);
    expect(sql).toContain('grant execute on function private.save_match_result_atomically(uuid, jsonb, jsonb, jsonb) to service_role');
    expect(sql).toContain('revoke all on function public.save_match_result_atomically(uuid, jsonb, jsonb, jsonb)');
    expect(sql).toContain('grant execute on function public.save_match_result_atomically(uuid, jsonb, jsonb, jsonb) to service_role');
  });
});
