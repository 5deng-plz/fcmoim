import { describe, expect, it } from 'vitest';
import { DEFAULT_STATS } from '../src/types';
import { calculateStatsOvr, normalizeUserStats } from '../src/utils/stats';

describe('member stats utilities', () => {
  it('normalizes the simplified stats model', () => {
    expect(normalizeUserStats({
      attack: 72,
      defense: 61,
      stamina: 83,
      mentality: 64,
      speed: 77,
      manner: 91,
    })).toEqual({
      attack: 72,
      defense: 61,
      stamina: 83,
      mentality: 64,
      speed: 77,
      manner: 91,
    });
  });

  it('falls back for missing or invalid stat values', () => {
    expect(normalizeUserStats({
      attack: 'fast',
      defense: 110,
      stamina: -3,
      mentality: 64.4,
      speed: Number.NaN,
    })).toEqual({
      ...DEFAULT_STATS,
      defense: 99,
      stamina: 1,
      mentality: 64,
    });
  });

  it('calculates OVR with a simple average', () => {
    expect(calculateStatsOvr({
      attack: 80,
      defense: 50,
      stamina: 75,
      mentality: 60,
      speed: 70,
      manner: 85,
    })).toBe(70);
  });
});
