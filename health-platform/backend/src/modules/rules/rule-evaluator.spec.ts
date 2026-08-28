import { evaluateRule, parseWithin, RuleDefinition, Sample } from './rule-evaluator';

const now = new Date('2026-08-28T12:00:00Z');

function sample(value: number, minutesAgo: number): Sample {
  return { value, time: new Date(now.getTime() - minutesAgo * 60_000) };
}

describe('parseWithin', () => {
  it('parses durations', () => {
    expect(parseWithin('1d')).toBe(86_400_000);
    expect(parseWithin('12h')).toBe(43_200_000);
    expect(parseWithin('30m')).toBe(1_800_000);
    expect(parseWithin(undefined)).toBe(86_400_000);
  });
});

describe('evaluateRule – threshold', () => {
  const def: RuleDefinition = {
    condition: { type: 'threshold', operator: 'lt', value: 90 },
    occurrences: { count: 3, within: '1d' },
  };

  it('triggers when enough samples cross the threshold', () => {
    const res = evaluateRule(def, {
      samples: [sample(88, 10), sample(87, 20), sample(85, 30), sample(96, 5)],
      baselineAvg: null,
      now,
    });
    expect(res.triggered).toBe(true);
    expect(res.matchedCount).toBe(3);
  });

  it('does not trigger with too few matches', () => {
    const res = evaluateRule(def, {
      samples: [sample(88, 10), sample(96, 20)],
      baselineAvg: null,
      now,
    });
    expect(res.triggered).toBe(false);
    expect(res.matchedCount).toBe(1);
  });

  it('ignores samples outside the occurrence window', () => {
    const res = evaluateRule(def, {
      samples: [sample(80, 10), sample(80, 20), sample(80, 2000)], // last is >1d ago
      baselineAvg: null,
      now,
    });
    expect(res.matchedCount).toBe(2);
    expect(res.triggered).toBe(false);
  });
});

describe('evaluateRule – baseline deviation', () => {
  const def: RuleDefinition = {
    condition: {
      type: 'baseline_deviation',
      baseline: { window: '30d', deviation_pct: -15 },
    },
    occurrences: { count: 1, within: '1d' },
  };

  it('triggers when value is far enough below baseline', () => {
    const res = evaluateRule(def, {
      samples: [sample(46, 10)], // baseline 54 → -14.8% (not enough)
      baselineAvg: 54,
      now,
    });
    expect(res.triggered).toBe(false);

    const res2 = evaluateRule(def, {
      samples: [sample(45, 10)], // -16.7% → triggers
      baselineAvg: 54,
      now,
    });
    expect(res2.triggered).toBe(true);
  });

  it('never triggers without a baseline', () => {
    const res = evaluateRule(def, {
      samples: [sample(10, 10)],
      baselineAvg: null,
      now,
    });
    expect(res.triggered).toBe(false);
  });
});
