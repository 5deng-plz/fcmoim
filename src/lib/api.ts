// ========================================
// FC Moim — 데이터 액세스 레이어
// Profile에 따라 mock 또는 Supabase 자동 분기
// ========================================
//
// 기존 dataconnect.ts를 대체합니다.
// 모든 컴포넌트는 이 파일을 통해 데이터에 접근합니다.
// prod 환경에서는 Supabase 클라이언트를 사용합니다.
//

import { appConfig } from '@/config/app.config';
import type { Match, User, PlayerStat, Announcement, Season } from '@/types';
import * as mock from '@/mocks/data';
// TODO: prod 전환 시 아래 주석 해제
// import { supabase } from './supabase';

// ─── Queries ───

export async function getUpcomingEvents(): Promise<Match[]> {
  if (appConfig.useMockData) {
    return mock.MOCK_MATCHES.filter((m) => m.status !== '종료');
  }
  // TODO: Supabase 쿼리로 교체
  // const { data, error } = await supabase
  //   .from('matches')
  //   .select('*')
  //   .neq('status', '종료')
  //   .order('date', { ascending: true });
  // if (error) throw error;
  // return data;
  return [];
}

export async function getMatchDetail(matchId: string): Promise<Match | null> {
  if (appConfig.useMockData) {
    return mock.MOCK_MATCHES.find((m) => m.id === matchId) || null;
  }
  // TODO: Supabase 쿼리로 교체
  // const { data, error } = await supabase
  //   .from('matches')
  //   .select('*')
  //   .eq('id', matchId)
  //   .single();
  // if (error) throw error;
  // return data;
  return null;
}

export async function getAvailablePlayers(matchId: string): Promise<User[]> {
  if (appConfig.useMockData) {
    return mock.MOCK_USERS;
  }
  void matchId;
  // TODO: Supabase 쿼리로 교체
  // const { data, error } = await supabase
  //   .from('users')
  //   .select('*')
  //   .eq('status', 'approved');
  // if (error) throw error;
  // return data;
  return [];
}

export async function getSeasonRanking(): Promise<User[]> {
  if (appConfig.useMockData) {
    return [...mock.MOCK_USERS].sort((a, b) => b.ovr - a.ovr);
  }
  // TODO: Supabase 쿼리로 교체
  // const { data, error } = await supabase
  //   .from('users')
  //   .select('*')
  //   .eq('status', 'approved')
  //   .order('ovr', { ascending: false });
  // if (error) throw error;
  // return data;
  return [];
}

export async function getPlayerMatchHistory(userId: string): Promise<PlayerStat[]> {
  if (appConfig.useMockData) {
    return mock.MOCK_PLAYER_STATS;
  }
  void userId;
  // TODO: Supabase 쿼리로 교체
  // const { data, error } = await supabase
  //   .from('player_stats')
  //   .select('*')
  //   .eq('user_id', _userId)
  //   .order('match_id', { ascending: false });
  // if (error) throw error;
  // return data;
  return [];
}

export async function getAnnouncements(): Promise<Announcement[]> {
  if (appConfig.useMockData) {
    return mock.MOCK_ANNOUNCEMENTS;
  }
  // TODO: Supabase 쿼리로 교체
  // const { data, error } = await supabase
  //   .from('announcements')
  //   .select('*')
  //   .order('is_pinned', { ascending: false })
  //   .order('created_at', { ascending: false });
  // if (error) throw error;
  // return data;
  return [];
}

export async function getPendingUsers(): Promise<User[]> {
  if (appConfig.useMockData) {
    return [];
  }
  // TODO: Supabase 쿼리로 교체
  // const { data, error } = await supabase
  //   .from('users')
  //   .select('*')
  //   .eq('status', 'pending');
  // if (error) throw error;
  // return data;
  return [];
}

export async function getCurrentSeason(): Promise<Season> {
  if (appConfig.useMockData) {
    return mock.MOCK_SEASON;
  }
  // TODO: Supabase 쿼리로 교체
  // const { data, error } = await supabase
  //   .from('seasons')
  //   .select('*')
  //   .eq('is_active', true)
  //   .single();
  // if (error) throw error;
  // return data;
  return mock.MOCK_SEASON;
}

// ─── Mutations ───

export async function updateAttendance(matchId: string, userId: string, status: 'attend' | 'absent'): Promise<void> {
  if (appConfig.useMockData) {
    console.log(`[${appConfig.profile}] Attendance: match=${matchId}, user=${userId}, status=${status}`);
    return;
  }
  // TODO: Supabase upsert로 교체
  // const { error } = await supabase
  //   .from('attendances')
  //   .upsert({ match_id: matchId, user_id: userId, status, responded_at: new Date() });
  // if (error) throw error;
}

export async function saveTactics(matchId: string, redTeam: string[], blueTeam: string[]): Promise<void> {
  if (appConfig.useMockData) {
    console.log(`[${appConfig.profile}] Tactics saved: match=${matchId}, red=${redTeam.length}, blue=${blueTeam.length}`);
    return;
  }
  // TODO: Supabase batch insert/update
}

export async function finalizeTactics(matchId: string): Promise<void> {
  if (appConfig.useMockData) {
    console.log(`[${appConfig.profile}] Tactics finalized: match=${matchId}`);
    return;
  }
  // TODO: Supabase update
  // const { error } = await supabase
  //   .from('matches')
  //   .update({ tactics_completed: true })
  //   .eq('id', matchId);
  // if (error) throw error;
}

export async function updateProfile(userId: string, data: Partial<User>): Promise<void> {
  if (appConfig.useMockData) {
    console.log(`[${appConfig.profile}] Profile updated: user=${userId}`, data);
    return;
  }
  // TODO: Supabase update
  // const { error } = await supabase
  //   .from('users')
  //   .update(data)
  //   .eq('id', userId);
  // if (error) throw error;
}

export async function createMatch(data: Partial<Match>): Promise<string> {
  if (appConfig.useMockData) {
    console.log(`[${appConfig.profile}] Match created:`, data);
    return `match-${Date.now()}`;
  }
  // TODO: Supabase insert
  // const { data: row, error } = await supabase
  //   .from('matches')
  //   .insert(data)
  //   .select('id')
  //   .single();
  // if (error) throw error;
  // return row.id;
  return '';
}

export async function updateUserStatus(userId: string, status: string): Promise<void> {
  if (appConfig.useMockData) {
    console.log(`[${appConfig.profile}] User status: user=${userId}, status=${status}`);
    return;
  }
  // TODO: Supabase update
  // const { error } = await supabase
  //   .from('users')
  //   .update({ status })
  //   .eq('id', userId);
  // if (error) throw error;
}

export async function savePlayerStat(stat: Partial<PlayerStat>): Promise<void> {
  if (appConfig.useMockData) {
    console.log(`[${appConfig.profile}] PlayerStat saved:`, stat);
    return;
  }
  // TODO: Supabase upsert
  // const { error } = await supabase
  //   .from('player_stats')
  //   .upsert(stat);
  // if (error) throw error;
}
