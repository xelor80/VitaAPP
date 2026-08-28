export interface RuleCondition {
  type: 'threshold' | 'baseline_deviation';
  operator?: 'lt' | 'gt' | 'lte' | 'gte';
  value?: number;
  baseline?: { window?: string; deviation_pct?: number };
}

export interface RuleDefinition {
  condition: RuleCondition;
  window?: { duration_min?: number };
  occurrences?: { count?: number; within?: string };
  context?: Record<string, unknown>;
  cooldown?: { hours?: number };
}

export interface Sample {
  value: number;
  time: Date;
}

export interface EvalContext {
  samples: Sample[];
  baselineAvg: number | null;
  now: Date;
}

export interface EvalResult {
  triggered: boolean;
  matchedCount: number;
  required: number;
  matchedValues: number[];
}

/** Zeitspanne wie "1d" | "12h" | "30m" in Millisekunden. */
export function parseWithin(within: string | undefined): number {
  if (!within) return 24 * 60 * 60 * 1000;
  const m = /^(\d+)([dhm])$/.exec(within);
  if (!m) return 24 * 60 * 60 * 1000;
  const factor: Record<string, number> = {
    d: 86_400_000,
    h: 3_600_000,
    m: 60_000,
  };
  return parseInt(m[1], 10) * factor[m[2]];
}

function matchesThreshold(value: number, c: RuleCondition): boolean {
  if (c.value === undefined || !c.operator) return false;
  switch (c.operator) {
    case 'lt':
      return value < c.value;
    case 'lte':
      return value <= c.value;
    case 'gt':
      return value > c.value;
    case 'gte':
      return value >= c.value;
    default:
      return false;
  }
}

function matchesBaselineDeviation(
  value: number,
  baselineAvg: number | null,
  c: RuleCondition,
): boolean {
  if (baselineAvg === null || baselineAvg === 0) return false;
  const target = c.baseline?.deviation_pct;
  if (target === undefined) return false;
  const devPct = ((value - baselineAvg) / baselineAvg) * 100;
  // Negatives Ziel (z. B. -15%) → auslösen wenn Abweichung <= Ziel.
  // Positives Ziel (z. B. +20%) → auslösen wenn Abweichung >= Ziel.
  return target < 0 ? devPct <= target : devPct >= target;
}

/**
 * Reine Auswertung einer Regel gegen die Messwerte im Beobachtungsfenster.
 * Kein DB-Zugriff, kein Cooldown (das übernimmt der Service). Siehe docs/10.
 */
export function evaluateRule(
  def: RuleDefinition,
  ctx: EvalContext,
): EvalResult {
  const withinMs = parseWithin(def.occurrences?.within);
  const cutoff = new Date(ctx.now.getTime() - withinMs);
  const inWindow = ctx.samples.filter((s) => s.time >= cutoff);

  const matched = inWindow.filter((s) => {
    if (def.condition.type === 'threshold') {
      return matchesThreshold(s.value, def.condition);
    }
    return matchesBaselineDeviation(s.value, ctx.baselineAvg, def.condition);
  });

  const required = def.occurrences?.count ?? 1;
  return {
    triggered: matched.length >= required,
    matchedCount: matched.length,
    required,
    matchedValues: matched.map((s) => s.value),
  };
}
