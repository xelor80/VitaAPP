import {
  computeBaseline,
  deviationPct,
  isReliable,
  mean,
  stddev,
} from './statistics';

describe('statistics', () => {
  it('computes mean', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(mean([])).toBe(0);
  });

  it('computes sample stddev (n-1)', () => {
    expect(stddev([2, 4, 6])).toBeCloseTo(2, 5);
    expect(stddev([5])).toBe(0);
  });

  it('computes a baseline', () => {
    expect(computeBaseline([50, 54, 46])).toEqual({
      avg: 50,
      stddev: expect.any(Number),
      n: 3,
    });
  });

  it('computes percentage deviation from baseline', () => {
    expect(deviationPct(46, 54)).toBeCloseTo(-14.81, 1);
    expect(deviationPct(60, 50)).toBeCloseTo(20, 5);
    expect(deviationPct(10, 0)).toBeNull();
  });

  it('flags reliability at n >= 3', () => {
    expect(isReliable({ avg: 1, stddev: 0, n: 2 })).toBe(false);
    expect(isReliable({ avg: 1, stddev: 0, n: 3 })).toBe(true);
  });
});
