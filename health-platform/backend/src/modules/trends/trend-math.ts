/**
 * Prozentuale Veränderung zwischen aktueller und Vergleichsperiode.
 * Gibt null zurück, wenn keine Vergleichsbasis existiert (previous = 0/leer).
 */
export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface TrendPoint {
  metric: string;
  current: number | null;
  previous: number | null;
  deltaPct: number | null;
  /** Bewertet die Richtung neutral – „gut/schlecht" entscheidet die UI je Metrik. */
  direction: 'up' | 'down' | 'flat' | 'unknown';
}

export function trendDirection(deltaPct: number | null): TrendPoint['direction'] {
  if (deltaPct === null) return 'unknown';
  if (deltaPct > 1) return 'up';
  if (deltaPct < -1) return 'down';
  return 'flat';
}
