import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GeneratedInsight,
  restingHeartRateInsight,
  stepsTrendInsight,
} from './insight-generators';

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  private async avg(
    userId: string,
    metric: string,
    from: Date,
    to: Date,
  ): Promise<number | null> {
    const agg = await this.prisma.healthMeasurement.aggregate({
      where: { userId, metric, time: { gte: from, lt: to } },
      _avg: { value: true },
    });
    return agg._avg.value ?? null;
  }

  /** Insights über die letzten 30 vs. vorherige 30 Tage neu berechnen. */
  async regenerate(userId: string): Promise<GeneratedInsight[]> {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const from = new Date(now.getTime() - 30 * day);
    const prevFrom = new Date(now.getTime() - 60 * day);

    const [stepsCur, stepsPrev, hrCur, hrPrev] = await Promise.all([
      this.avg(userId, 'steps', from, now),
      this.avg(userId, 'steps', prevFrom, from),
      this.avg(userId, 'heart_rate', from, now),
      this.avg(userId, 'heart_rate', prevFrom, from),
    ]);

    const generated = [
      stepsTrendInsight(stepsCur, stepsPrev, '30d'),
      restingHeartRateInsight(hrCur, hrPrev, '30d'),
    ].filter((i): i is GeneratedInsight => i !== null);

    // Aktuelle Insights ersetzen (idempotent je Regenerierung).
    await this.prisma.healthInsight.deleteMany({ where: { userId } });
    if (generated.length > 0) {
      await this.prisma.healthInsight.createMany({
        data: generated.map((g) => ({
          userId,
          type: g.type,
          period: g.period,
          textKey: g.textKey,
          params: g.params as Prisma.InputJsonValue,
        })),
      });
    }
    return generated;
  }

  list(userId: string) {
    return this.prisma.healthInsight.findMany({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
    });
  }
}
