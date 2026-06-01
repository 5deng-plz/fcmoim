import { describe, expect, it } from 'vitest';
import { calculateOVR, getOvrGradeNameOnly } from '../src/utils/ovr';

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
});
