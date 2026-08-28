import {
  componentFromBaseline,
  DEFAULT_WEIGHTS,
  totalScore,
} from './score-calculator';

describe('componentFromBaseline', () => {
  it('scores 50 when value equals baseline', () => {
    expect(componentFromBaseline(54, 54)).toBe(50);
  });

  it('penalises higher-than-baseline for lower-is-better metrics (resting HR)', () => {
    // +20% over baseline, higherIsBetter=false → 0
    expect(componentFromBaseline(60, 50)).toBe(0);
  });

  it('rewards higher-than-baseline for higher-is-better metrics (HRV)', () => {
    // +20% over baseline, higherIsBetter=true → 100
    expect(componentFromBaseline(60, 50, true)).toBe(100);
  });

  it('clamps to 0..100', () => {
    expect(componentFromBaseline(200, 50, true)).toBe(100);
    expect(componentFromBaseline(200, 50, false)).toBe(0);
  });
});

describe('totalScore', () => {
  it('returns null when no component is present', () => {
    expect(totalScore({})).toBeNull();
  });

  it('averages by weight', () => {
    // 88*.25 + 81*.25 + 72*.2 + 79*.15 + 86*.15 = 81.4 → 81
    const score = totalScore(
      { sleep: 88, recovery: 81, stress: 72, activity: 79, cardio: 86 },
      DEFAULT_WEIGHTS,
    );
    expect(score).toBe(81);
  });

  it('renormalises weights when a component is missing', () => {
    // Only sleep present → equals the sleep score regardless of its weight.
    expect(totalScore({ sleep: 70 })).toBe(70);
  });
});
