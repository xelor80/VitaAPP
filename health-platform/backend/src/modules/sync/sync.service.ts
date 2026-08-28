import { Injectable } from '@nestjs/common';
import { MeasurementSource, Quality } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestMeasurementsDto } from './dto/ingest-measurements.dto';
import {
  classifyMeasurements,
  IngestResult,
} from './measurement-classifier';

export interface IngestSummary {
  accepted: number;
  duplicate: number;
  rejected: number;
  results: IngestResult[];
}

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(
    userId: string,
    dto: IngestMeasurementsDto,
  ): Promise<IngestSummary> {
    const keys = dto.measurements.map((m) => m.ingestKey);

    // Bereits gespeicherte ingestKeys dieses Nutzers ermitteln (Dedup).
    const existing = await this.prisma.healthMeasurement.findMany({
      where: { userId, ingestKey: { in: keys } },
      select: { ingestKey: true },
    });
    const existingKeys = new Set(existing.map((e) => e.ingestKey));

    const { results, accepted } = classifyMeasurements(
      dto.measurements,
      existingKeys,
    );

    if (accepted.length > 0) {
      await this.prisma.healthMeasurement.createMany({
        data: accepted.map((m) => ({
          userId,
          deviceId: dto.deviceId,
          metric: m.metric,
          value: m.value,
          unit: m.unit,
          time: new Date(m.time),
          source: (m.source ?? 'wearable') as MeasurementSource,
          quality: (m.quality ?? 'unknown') as Quality,
          ingestKey: m.ingestKey,
        })),
        skipDuplicates: true,
      });
    }

    const summary = { accepted: 0, duplicate: 0, rejected: 0 };
    for (const r of results) summary[r.status] += 1;

    return { ...summary, results };
  }

  async status(userId: string) {
    const last = await this.prisma.healthMeasurement.findFirst({
      where: { userId },
      orderBy: { time: 'desc' },
      select: { time: true },
    });
    return {
      lastMeasurementAt: last?.time ?? null,
      serverTime: new Date().toISOString(),
    };
  }
}
