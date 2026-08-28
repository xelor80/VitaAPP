export interface BaselineStat {
  avg: number;
  stddev: number;
  n: number;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Stichproben-Standardabweichung (n-1). 0 bei < 2 Werten. */
export function stddev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

export function computeBaseline(values: number[]): BaselineStat {
  return { avg: mean(values), stddev: stddev(values), n: values.length };
}

/**
 * Prozentuale Abweichung eines aktuellen Werts vom Baseline-Durchschnitt.
 * Gibt null zurück, wenn keine sinnvolle Baseline vorliegt (avg = 0).
 */
export function deviationPct(current: number, baselineAvg: number): number | null {
  if (baselineAvg === 0) return null;
  return ((current - baselineAvg) / baselineAvg) * 100;
}

/** Mindestanzahl Messungen, ab der eine Baseline als belastbar gilt. */
export const MIN_BASELINE_N = 3;

export function isReliable(stat: BaselineStat): boolean {
  return stat.n >= MIN_BASELINE_N;
}
