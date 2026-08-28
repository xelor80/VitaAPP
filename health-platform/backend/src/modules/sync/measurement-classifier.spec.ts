import { MeasurementInputDto } from './dto/ingest-measurements.dto';
import { classifyMeasurements } from './measurement-classifier';

function m(overrides: Partial<MeasurementInputDto>): MeasurementInputDto {
  return {
    metric: 'heart_rate',
    value: 72,
    unit: 'bpm',
    time: '2026-08-28T07:15:00Z',
    ingestKey: 'dev-hr-1',
    ...overrides,
  };
}

describe('classifyMeasurements', () => {
  it('accepts a valid, unseen measurement', () => {
    const { results, accepted } = classifyMeasurements([m({})], new Set());
    expect(results[0].status).toBe('accepted');
    expect(accepted).toHaveLength(1);
  });

  it('marks already-stored ingestKeys as duplicate (idempotent sync)', () => {
    const { results, accepted } = classifyMeasurements(
      [m({ ingestKey: 'dev-hr-1' })],
      new Set(['dev-hr-1']),
    );
    expect(results[0].status).toBe('duplicate');
    expect(accepted).toHaveLength(0);
  });

  it('dedupes repeated ingestKeys within the same batch', () => {
    const { results, accepted } = classifyMeasurements(
      [m({ ingestKey: 'k' }), m({ ingestKey: 'k' })],
      new Set(),
    );
    expect(results.map((r) => r.status)).toEqual(['accepted', 'duplicate']);
    expect(accepted).toHaveLength(1);
  });

  it('rejects unknown metrics (no invented data)', () => {
    const { results, accepted } = classifyMeasurements(
      [m({ metric: 'telepathy', ingestKey: 'x' })],
      new Set(),
    );
    expect(results[0]).toMatchObject({
      status: 'rejected',
      reason: 'unknown_metric',
    });
    expect(accepted).toHaveLength(0);
  });

  it('rejects non-finite values', () => {
    const { results } = classifyMeasurements(
      [m({ value: Number.NaN, ingestKey: 'y' })],
      new Set(),
    );
    expect(results[0]).toMatchObject({
      status: 'rejected',
      reason: 'invalid_value',
    });
  });

  it('classifies a mixed batch correctly', () => {
    const batch = [
      m({ ingestKey: 'a' }),
      m({ ingestKey: 'b', metric: 'spo2', unit: '%', value: 96 }),
      m({ ingestKey: 'a' }), // duplicate within batch
      m({ ingestKey: 'c', metric: 'nope' }), // rejected
    ];
    const { results } = classifyMeasurements(batch, new Set(['seen-key']));
    expect(results.map((r) => r.status)).toEqual([
      'accepted',
      'accepted',
      'duplicate',
      'rejected',
    ]);
  });
});
