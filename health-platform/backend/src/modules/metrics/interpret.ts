import { BaselineStat, deviationPct, isReliable } from '../baselines/statistics';

export type Interpretation =
  | 'no_baseline'
  | 'in_personal_range'
  | 'slightly_low'
  | 'slightly_high'
  | 'notably_low'
  | 'notably_high';

/**
 * Übersetzt einen Messwert relativ zur persönlichen Baseline in eine
 * verständliche Einordnung (docs/40). KEINE medizinische Bewertung.
 * Schwellen in % Abweichung vom 30-Tage-Durchschnitt.
 */
export function interpret(
  value: number,
  baseline: BaselineStat | null,
  slightPct = 10,
  notablePct = 20,
): Interpretation {
  if (!baseline || !isReliable(baseline)) return 'no_baseline';
  const dev = deviationPct(value, baseline.avg);
  if (dev === null) return 'no_baseline';
  if (dev <= -notablePct) return 'notably_low';
  if (dev >= notablePct) return 'notably_high';
  if (dev <= -slightPct) return 'slightly_low';
  if (dev >= slightPct) return 'slightly_high';
  return 'in_personal_range';
}

/** i18n-Key für die Einordnung – die App rendert lokalisierten Text. */
export function interpretationKey(i: Interpretation): string {
  return `interpretation.${i}`;
}
