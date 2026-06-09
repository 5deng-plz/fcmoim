import { describe, expect, it } from 'vitest';
import { applyPerformanceBoost, calculateOVR, getOvrGradeNameOnly } from '../src/utils/ovr';

describe('OVR utilities', () => {
  it('calculates OVR as a simple average', () => {
    const stats = {
      attack: 80,
      defense: 50,
      stamina: 75,
      mentality: 60,
      speed: 70,
      manner: 85,
    };

    expect(calculateOVR(stats)).toBe(70);
  });

  it('maps OVR to grade names', () => {
    expect(getOvrGradeNameOnly(80)).toBe('Diamond');
    expect(getOvrGradeNameOnly(70)).toBe('Gold');
    expect(getOvrGradeNameOnly(65)).toBe('Silver');
    expect(getOvrGradeNameOnly(64)).toBe('Bronze');
  });

  it('applies result, goal, assist, and MOM boosts with stat clamps', () => {
    const baseStats = {
      attack: 60,
      defense: 60,
      stamina: 60,
      mentality: 60,
      speed: 60,
      manner: 60,
    };

    expect(applyPerformanceBoost(baseStats, {
      goals: 2,
      assists: 1,
      isMom: false,
      result: 'win',
    })).toEqual({
      attack: 63,
      defense: 61,
      stamina: 61,
      mentality: 62,
      speed: 61,
      manner: 61,
    });

    expect(applyPerformanceBoost(baseStats, {
      goals: 0,
      assists: 0,
      isMom: false,
      result: 'loss',
    })).toEqual({
      attack: 60,
      defense: 60,
      stamina: 59,
      mentality: 59,
      speed: 59,
      manner: 60,
    });

    expect(applyPerformanceBoost(baseStats, {
      goals: 0,
      assists: 0,
      isMom: false,
      result: 'draw',
    })).toEqual(baseStats);

    expect(applyPerformanceBoost({
      attack: 98,
      defense: 98,
      stamina: 1,
      mentality: 1,
      speed: 1,
      manner: 98,
    }, {
      goals: 5,
      assists: 5,
      isMom: true,
      result: 'loss',
    })).toEqual({
      attack: 99,
      defense: 99,
      stamina: 3,
      mentality: 8,
      speed: 3,
      manner: 99,
    });
  });
});
