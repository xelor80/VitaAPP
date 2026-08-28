import { percentDelta, trendDirection } from './trend-math';

describe('percentDelta', () => {
  it('computes percentage change', () => {
    expect(percentDelta(114, 100)).toBeCloseTo(14, 5);
    expect(percentDelta(96, 100)).toBeCloseTo(-4, 5);
  });

  it('returns null without a comparison base', () => {
    expect(percentDelta(50, 0)).toBeNull();
  });
});

describe('trendDirection', () => {
  it('classifies direction neutrally', () => {
    expect(trendDirection(14)).toBe('up');
    expect(trendDirection(-4)).toBe('down');
    expect(trendDirection(0.5)).toBe('flat');
    expect(trendDirection(null)).toBe('unknown');
  });
});
