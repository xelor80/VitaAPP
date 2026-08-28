import { interpret } from './interpret';

const reliable = { avg: 54, stddev: 5, n: 30 };

describe('interpret', () => {
  it('returns no_baseline without a reliable baseline', () => {
    expect(interpret(50, null)).toBe('no_baseline');
    expect(interpret(50, { avg: 54, stddev: 5, n: 2 })).toBe('no_baseline');
  });

  it('detects the personal normal range', () => {
    expect(interpret(54, reliable)).toBe('in_personal_range');
    expect(interpret(52, reliable)).toBe('in_personal_range'); // ~ -3.7%
  });

  it('detects slight deviations (>= 10%)', () => {
    expect(interpret(48, reliable)).toBe('slightly_low'); // -11.1%
    expect(interpret(60, reliable)).toBe('slightly_high'); // +11.1%
  });

  it('detects notable deviations (>= 20%)', () => {
    expect(interpret(43, reliable)).toBe('notably_low'); // -20.4%
    expect(interpret(65, reliable)).toBe('notably_high'); // +20.4%
  });
});
