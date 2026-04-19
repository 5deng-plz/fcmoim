// ========================================
// FC Moim — OVR 포지션별 가중치 상수
// Position-aware player rating helpers
// ========================================

import type { Position } from '@/types';

export interface PositionWeights {
  speed: number;
  shooting: number;
  passing: number;
  defense: number;
  physical: number;
  dribble: number;
}

export const POSITION_WEIGHTS: Record<Position, PositionWeights> = {
  FW: { speed: 0.15, shooting: 0.25, passing: 0.15, defense: 0.05, physical: 0.15, dribble: 0.25 },
  MF: { speed: 0.10, shooting: 0.15, passing: 0.25, defense: 0.15, physical: 0.10, dribble: 0.25 },
  DF: { speed: 0.10, shooting: 0.05, passing: 0.15, defense: 0.30, physical: 0.25, dribble: 0.15 },
};

/**
 * OVR 계산: 능력치 × 포지션별 가중치의 가중합
 */
export function calculateOVR(
  stats: { speed: number; shooting: number; passing: number; defense: number; physical: number; dribble: number },
  position: Position,
): number {
  const weights = POSITION_WEIGHTS[position];
  const raw =
    stats.speed * weights.speed +
    stats.shooting * weights.shooting +
    stats.passing * weights.passing +
    stats.defense * weights.defense +
    stats.physical * weights.physical +
    stats.dribble * weights.dribble;
  return Math.round(raw);
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

/**
 * 성과 기반 능력치 업데이트 (브레인스토밍 결정: B안)
 * - MOM: 모든 능력치 +2 (포지션 가중치 비례)
 * - 골: 슈팅+1, 드리블+1
 * - 어시스트: 패스+1, 드리블+0.5
 */
export function applyPerformanceBoost(
  currentStats: { speed: number; shooting: number; passing: number; defense: number; physical: number; dribble: number },
  position: Position,
  performance: { goals: number; assists: number; isMom: boolean },
): { speed: number; shooting: number; passing: number; defense: number; physical: number; dribble: number } {
  const weights = POSITION_WEIGHTS[position];
  const newStats = { ...currentStats };

  // MOM 보너스: 포지션 가중치 비례로 전체 능력치 +2 분배
  if (performance.isMom) {
    const statKeys = ['speed', 'shooting', 'passing', 'defense', 'physical', 'dribble'] as const;
    statKeys.forEach((key) => {
      newStats[key] = Math.min(99, newStats[key] + Math.round(2 * weights[key] * 10));
    });
  }

  // 골 보너스
  if (performance.goals > 0) {
    newStats.shooting = Math.min(99, newStats.shooting + performance.goals);
    newStats.dribble = Math.min(99, newStats.dribble + Math.ceil(performance.goals * 0.5));
  }

  // 어시스트 보너스
  if (performance.assists > 0) {
    newStats.passing = Math.min(99, newStats.passing + performance.assists);
    newStats.dribble = Math.min(99, newStats.dribble + Math.ceil(performance.assists * 0.5));
  }

  return newStats;
}
