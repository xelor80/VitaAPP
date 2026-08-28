import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RangeKey, rangeStart } from '../../common/time/ranges';
import { BaselineStat } from '../baselines/statistics';
import { interpret, interpretationKey } from './interpret';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Zeitreihe für Charts (24h/7d/30d/3m/1y). */
  async series(userId: string, metric: string, range: RangeKey) {
    const points = await this.prisma.healthMeasurement.findMany({
      where: { userId, metric, time: { gte: rangeStart(range) } },
      orderBy: { time: 'asc' },
      select: { time: true, value: true, unit: true, quality: true },
    });
    return { metric, range, points };
  }

  /**
   * Zusammenfassung: aktueller Wert + Tagesbereich + 30-Tage-Baseline +
   * verständliche Einordnung. Enthält KEINE erfundenen Werte – fehlt etwas,
   * sind die Felder null.
   */
  async summary(userId: string, metric: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [latest, todayAgg, baselineRow] = await Promise.all([
      this.prisma.healthMeasurement.findFirst({
        where: { userId, metric },
        orderBy: { time: 'desc' },
        select: { value: true, unit: true, time: true },
      }),
      this.prisma.healthMeasurement.aggregate({
        where: { userId, metric, time: { gte: startOfDay } },
        _min: { value: true },
        _max: { value: true },
      }),
      this.prisma.personalBaseline.findUnique({
        where: { userId_metric_window: { userId, metric, window: '30d' } },
      }),
    ]);

    const baseline: BaselineStat | null = baselineRow
      ? { avg: baselineRow.avg, stddev: baselineRow.stddev, n: baselineRow.n }
      : null;

    const interpretation = latest
      ? interpret(latest.value, baseline)
      : 'no_baseline';

    return {
      metric,
      current: latest?.value ?? null,
      unit: latest?.unit ?? null,
      measuredAt: latest?.time ?? null,
      todayMin: todayAgg._min.value ?? null,
      todayMax: todayAgg._max.value ?? null,
      baseline30d: baseline,
      interpretation,
      interpretationKey: interpretationKey(interpretation),
    };
  }
}
