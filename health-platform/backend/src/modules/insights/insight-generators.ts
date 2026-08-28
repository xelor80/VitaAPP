export interface GeneratedInsight {
  type: string;
  period: string;
  textKey: string;
  params: Record<string, number>;
}

/** Rundet auf ganze Prozent (Betrag). */
function pct(n: number): number {
  return Math.round(Math.abs(n));
}

/**
 * Regelbasierte Insights (docs/7). Reine Funktionen ohne DB – die Architektur
 * ist so vorbereitet, dass später KI-Analysen andocken können.
 */

/** Schritte-Trend über zwei gleich lange Perioden. */
export function stepsTrendInsight(
  currentAvg: number | null,
  previousAvg: number | null,
  period: string,
  thresholdPct = 10,
): GeneratedInsight | null {
  if (currentAvg === null || previousAvg === null || previousAvg === 0) {
    return null;
  }
  const delta = ((currentAvg - previousAvg) / previousAvg) * 100;
  if (delta >= thresholdPct) {
    return {
      type: 'steps_trend_up',
      period,
      textKey: 'insight.steps_up',
      params: { pct: pct(delta) },
    };
  }
  if (delta <= -thresholdPct) {
    return {
      type: 'steps_trend_down',
      period,
      textKey: 'insight.steps_down',
      params: { pct: pct(delta) },
    };
  }
  return null;
}

/** Ruhepuls-Verbesserung (niedriger = besser) über zwei Perioden. */
export function restingHeartRateInsight(
  currentAvg: number | null,
  previousAvg: number | null,
  period: string,
  thresholdBpm = 2,
): GeneratedInsight | null {
  if (currentAvg === null || previousAvg === null) return null;
  const diff = currentAvg - previousAvg;
  if (diff <= -thresholdBpm) {
    return {
      type: 'resting_hr_improved',
      period,
      textKey: 'insight.resting_hr_down',
      params: { bpm: Math.round(Math.abs(diff)) },
    };
  }
  if (diff >= thresholdBpm) {
    return {
      type: 'resting_hr_up',
      period,
      textKey: 'insight.resting_hr_up',
      params: { bpm: Math.round(diff) },
    };
  }
  return null;
}
