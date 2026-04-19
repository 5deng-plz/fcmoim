import { describe, expect, it } from 'vitest';
import { calculateOVR, getOvrGradeNameOnly } from '../src/utils/ovr';

describe('OVR utilities', () => {
  it('calculates weighted OVR by position', () => {
    const stats = {
      speed: 70,
      shooting: 80,
      passing: 60,
      defense: 50,
      physical: 75,
      dribble: 85,
    };

    expect(calculateOVR(stats, 'FW')).toBe(75);
    expect(calculateOVR(stats, 'DF')).toBe(67);
  });

  it('maps OVR to grade names', () => {
    expect(getOvrGradeNameOnly(80)).toBe('Diamond');
    expect(getOvrGradeNameOnly(70)).toBe('Gold');
    expect(getOvrGradeNameOnly(65)).toBe('Silver');
    expect(getOvrGradeNameOnly(64)).toBe('Bronze');
  });
});
