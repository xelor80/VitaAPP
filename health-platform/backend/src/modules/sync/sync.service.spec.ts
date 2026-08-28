import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncService } from './sync.service';
import { IngestMeasurementsDto } from './dto/ingest-measurements.dto';

describe('SyncService.ingest', () => {
  let service: SyncService;
  let createMany: jest.Mock;
  let findMany: jest.Mock;

  beforeEach(async () => {
    createMany = jest.fn().mockResolvedValue({ count: 0 });
    // One key already stored → should be reported as duplicate.
    findMany = jest.fn().mockResolvedValue([{ ingestKey: 'stored-1' }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: PrismaService,
          useValue: { healthMeasurement: { findMany, createMany } },
        },
      ],
    }).compile();

    service = moduleRef.get(SyncService);
  });

  it('stores only accepted rows and reports per-item status', async () => {
    const dto: IngestMeasurementsDto = {
      deviceId: 'device-1',
      measurements: [
        {
          metric: 'heart_rate',
          value: 72,
          unit: 'bpm',
          time: '2026-08-28T07:15:00Z',
          ingestKey: 'new-1',
        },
        {
          metric: 'heart_rate',
          value: 70,
          unit: 'bpm',
          time: '2026-08-28T07:20:00Z',
          ingestKey: 'stored-1', // already in DB → duplicate
        },
      ],
    };

    const summary = await service.ingest('user-1', dto);

    expect(summary.accepted).toBe(1);
    expect(summary.duplicate).toBe(1);
    expect(summary.rejected).toBe(0);
    expect(createMany).toHaveBeenCalledTimes(1);
    const arg = createMany.mock.calls[0][0];
    expect(arg.data).toHaveLength(1);
    expect(arg.data[0]).toMatchObject({
      userId: 'user-1',
      deviceId: 'device-1',
      ingestKey: 'new-1',
    });
  });
});
