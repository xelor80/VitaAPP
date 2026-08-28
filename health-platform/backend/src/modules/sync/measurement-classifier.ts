import { MeasurementInputDto } from './dto/ingest-measurements.dto';

/**
 * Erlaubte Skalar-Metriken im generischen Messwert-Modell.
 * Komplexe Strukturen (Blutdruck, EKG, Schlaf, Aktivität) haben eigene Endpunkte/Tabellen.
 */
export const ALLOWED_METRICS = new Set<string>([
  'heart_rate',
  'hrv',
  'spo2',
  'temperature',
  'stress',
  'steps',
  'met',
  'distance',
  'calories',
]);

export type IngestStatus = 'accepted' | 'duplicate' | 'rejected';

export interface IngestResult {
  ingestKey: string;
  status: IngestStatus;
  reason?: string;
}

/**
 * Reine Klassifikationslogik (ohne DB) – erleichtert Tests und hält die
 * Dedup-Regeln an einer Stelle. `existingKeys` = bereits gespeicherte
 * ingestKeys dieses Nutzers.
 *
 * Regeln:
 *  - unbekannte Metrik  → rejected(unknown_metric)
 *  - nicht-endliche Zahl → rejected(invalid_value)
 *  - ingestKey bereits gespeichert ODER doppelt im selben Batch → duplicate
 *  - sonst accepted
 */
export function classifyMeasurements(
  items: MeasurementInputDto[],
  existingKeys: ReadonlySet<string>,
): { results: IngestResult[]; accepted: MeasurementInputDto[] } {
  const results: IngestResult[] = [];
  const accepted: MeasurementInputDto[] = [];
  const seenInBatch = new Set<string>();

  for (const item of items) {
    if (!ALLOWED_METRICS.has(item.metric)) {
      results.push({
        ingestKey: item.ingestKey,
        status: 'rejected',
        reason: 'unknown_metric',
      });
      continue;
    }
    if (!Number.isFinite(item.value)) {
      results.push({
        ingestKey: item.ingestKey,
        status: 'rejected',
        reason: 'invalid_value',
      });
      continue;
    }
    if (existingKeys.has(item.ingestKey) || seenInBatch.has(item.ingestKey)) {
      results.push({ ingestKey: item.ingestKey, status: 'duplicate' });
      continue;
    }
    seenInBatch.add(item.ingestKey);
    accepted.push(item);
    results.push({ ingestKey: item.ingestKey, status: 'accepted' });
  }

  return { results, accepted };
}
