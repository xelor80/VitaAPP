import {
  restingHeartRateInsight,
  stepsTrendInsight,
} from './insight-generators';

describe('stepsTrendInsight', () => {
  it('detects a meaningful increase', () => {
    const i = stepsTrendInsight(5900, 5000, '30d');
    expect(i).toMatchObject({ type: 'steps_trend_up', params: { pct: 18 } });
  });

  it('detects a meaningful decrease', () => {
    const i = stepsTrendInsight(4500, 5000, '30d');
    expect(i?.type).toBe('steps_trend_down');
  });

  it('returns null for small changes or missing data', () => {
    expect(stepsTrendInsight(5100, 5000, '30d')).toBeNull();
    expect(stepsTrendInsight(null, 5000, '30d')).toBeNull();
    expect(stepsTrendInsight(5000, 0, '30d')).toBeNull();
  });
});

describe('restingHeartRateInsight', () => {
  it('reports improvement when resting HR drops', () => {
    const i = restingHeartRateInsight(60, 64, '30d');
    expect(i).toMatchObject({
      type: 'resting_hr_improved',
      params: { bpm: 4 },
    });
  });

  it('reports increase when resting HR rises', () => {
    expect(restingHeartRateInsight(66, 62, '30d')?.type).toBe('resting_hr_up');
  });

  it('stays silent within the noise band', () => {
    expect(restingHeartRateInsight(63, 62, '30d')).toBeNull();
  });
});
