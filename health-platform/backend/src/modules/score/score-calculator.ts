export type ScoreComponent =
  | 'sleep'
  | 'recovery'
  | 'stress'
  | 'activity'
  | 'cardio';

export type ComponentScores = Partial<Record<ScoreComponent, number>>;
export type Weights = Record<ScoreComponent, number>;

export const DEFAULT_WEIGHTS: Weights = {
  sleep: 0.25,
  recovery: 0.25,
  stress: 0.2,
  activity: 0.15,
  cardio: 0.15,
};

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Teilscore (0–100) aus der Abweichung eines Werts von seiner Baseline.
 * `higherIsBetter=false` (Default) → höhere Werte als der Schnitt senken den Score
 * (z. B. Ruhepuls, Stress). `higherIsBetter=true` → höhere Werte heben ihn (z. B. HRV).
 * 50 = genau im persönlichen Schnitt; ±`spanPct` % ⇒ ±50 Punkte.
 */
export function componentFromBaseline(
  value: number,
  baselineAvg: number,
  higherIsBetter = false,
  spanPct = 20,
): number {
  if (baselineAvg === 0) return 50;
  const devPct = ((value - baselineAvg) / baselineAvg) * 100;
  const signed = higherIsBetter ? devPct : -devPct;
  return clamp(50 + (signed / spanPct) * 50);
}

/**
 * Gesamt-Score aus vorhandenen Komponenten. Fehlende Komponenten werden NICHT
 * geschätzt, sondern ausgeklammert (Gewichte renormalisiert) – docs/11 & docs/50.
 * Gibt null zurück, wenn keine Komponente vorliegt.
 */
export function totalScore(
  components: ComponentScores,
  weights: Weights = DEFAULT_WEIGHTS,
): number | null {
  let weighted = 0;
  let weightSum = 0;
  for (const key of Object.keys(components) as ScoreComponent[]) {
    const value = components[key];
    if (value === undefined) continue;
    const w = weights[key] ?? 0;
    weighted += clamp(value) * w;
    weightSum += w;
  }
  if (weightSum === 0) return null;
  return Math.round(weighted / weightSum);
}
