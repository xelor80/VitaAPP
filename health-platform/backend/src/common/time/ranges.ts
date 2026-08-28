export type RangeKey = '24h' | '7d' | '30d' | '3m' | '1y';
export type WindowKey = '7d' | '30d' | '90d';

const RANGE_MS: Record<RangeKey, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '3m': 90 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
};

const WINDOW_DAYS: Record<WindowKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/** Startzeitpunkt eines Chart-Bereichs relativ zu `now`. */
export function rangeStart(range: RangeKey, now: Date = new Date()): Date {
  return new Date(now.getTime() - RANGE_MS[range]);
}

/** Startzeitpunkt eines Baseline-Fensters relativ zu `now`. */
export function windowStart(window: WindowKey, now: Date = new Date()): Date {
  return new Date(now.getTime() - WINDOW_DAYS[window] * 24 * 60 * 60 * 1000);
}

export function isRangeKey(v: string): v is RangeKey {
  return v === '24h' || v === '7d' || v === '30d' || v === '3m' || v === '1y';
}

export function isWindowKey(v: string): v is WindowKey {
  return v === '7d' || v === '30d' || v === '90d';
}
