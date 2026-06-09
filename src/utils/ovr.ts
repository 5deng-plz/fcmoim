// ========================================
// FC Moim — OVR helpers
// ========================================

import { STAT_KEYS, type UserStats } from '@/types';
import { calculateStatsOvr } from './stats';

export function calculateOVR(stats: UserStats): number {
  return calculateStatsOvr(stats);
}

/**
 * 숫자 OVR 값을 4단계 텍스트 등급으로 변환
 * 80 이상: 💎 Diamond
 * 70 이상: 🥇 Gold
 * 65 이상: 🥈 Silver
 * 그 외: 🥉 Bronze
 */
export function getOvrGrade(ovr: number): string {
  if (ovr >= 80) return '💎 Diamond';
  if (ovr >= 70) return '🥇 Gold';
  if (ovr >= 65) return '🥈 Silver';
  return '🥉 Bronze';
}

export function getOvrGradeNameOnly(ovr: number): string {
  if (ovr >= 80) return 'Diamond';
  if (ovr >= 70) return 'Gold';
  if (ovr >= 65) return 'Silver';
  return 'Bronze';
}

export function applyPerformanceBoost(
  currentStats: UserStats,
  performance: { goals: number; assists: number; isMom: boolean; result: 'win' | 'draw' | 'loss' },
): UserStats {
  const newStats = { ...currentStats };

  if (performance.result === 'win') {
    STAT_KEYS.forEach((key) => {
      newStats[key] = Math.min(99, newStats[key] + 1);
    });
  }

  if (performance.result === 'loss') {
    newStats.stamina = Math.max(1, newStats.stamina - 1);
    newStats.mentality = Math.max(1, newStats.mentality - 1);
    newStats.speed = Math.max(1, newStats.speed - 1);
  }

  if (performance.isMom) {
    STAT_KEYS.forEach((key) => {
      newStats[key] = Math.min(99, newStats[key] + 2);
    });
  }

  if (performance.goals > 0) {
    newStats.attack = Math.min(99, newStats.attack + performance.goals);
  }

  if (performance.assists > 0) {
    newStats.mentality = Math.min(99, newStats.mentality + performance.assists);
  }

  return newStats;
}
