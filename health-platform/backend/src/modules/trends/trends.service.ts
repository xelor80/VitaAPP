import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { percentDelta, TrendPoint, trendDirection } from './trend-math';

const TREND_METRICS = ['heart_rate', 'hrv', 'spo2', 'stress', 'steps'];

@Injectable()
export class TrendsService {
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

  /**
   * „Meine Entwicklung": Durchschnitt der aktuellen Periode vs. der davor
   * (gleiche Länge). rangeDays z. B. 7/30/90/365.
   */
  async compute(userId: string, rangeDays: number): Promise<TrendPoint[]> {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const currentFrom = new Date(now.getTime() - rangeDays * day);
    const previousFrom = new Date(now.getTime() - 2 * rangeDays * day);

    const points: TrendPoint[] = [];
    for (const metric of TREND_METRICS) {
      const current = await this.avg(userId, metric, currentFrom, now);
      const previous = await this.avg(userId, metric, previousFrom, currentFrom);
      const deltaPct =
        current !== null && previous !== null
          ? percentDelta(current, previous)
          : null;
      points.push({
        metric,
        current,
        previous,
        deltaPct,
        direction: trendDirection(deltaPct),
      });
    }
    return points;
  }
}
