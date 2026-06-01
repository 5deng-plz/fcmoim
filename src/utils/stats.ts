import { DEFAULT_STATS, STAT_KEYS, type UserStats } from '@/types';

export function calculateStatsOvr(stats: UserStats): number {
  const total = STAT_KEYS.reduce((sum, key) => sum + clampStat(stats[key], DEFAULT_STATS[key]), 0);
  return Math.round(total / STAT_KEYS.length);
}

export function normalizeUserStats(value: unknown): UserStats {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_STATS;
  }

  const stats = value as Partial<Record<keyof UserStats, unknown>>;
  return {
    attack: toStatNumber(stats.attack, DEFAULT_STATS.attack),
    defense: toStatNumber(stats.defense, DEFAULT_STATS.defense),
    stamina: toStatNumber(stats.stamina, DEFAULT_STATS.stamina),
    mentality: toStatNumber(stats.mentality, DEFAULT_STATS.mentality),
    speed: toStatNumber(stats.speed, DEFAULT_STATS.speed),
    manner: toStatNumber(stats.manner, DEFAULT_STATS.manner),
  };
}

function toStatNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? clampStat(value, fallback) : fallback;
}

function clampStat(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(99, Math.round(value)));
}
