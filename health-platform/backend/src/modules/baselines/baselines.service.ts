import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WindowKey, windowStart } from '../../common/time/ranges';
import { computeBaseline } from './statistics';

const WINDOWS: WindowKey[] = ['7d', '30d', '90d'];

/** Metriken, für die persönliche Baselines berechnet werden (docs/33). */
export const BASELINE_METRICS = [
  'heart_rate',
  'hrv',
  'spo2',
  'stress',
  'temperature',
  'steps',
];

@Injectable()
export class BaselinesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Werte einer Metrik im Fenster laden. */
  private async values(
    userId: string,
    metric: string,
    window: WindowKey,
  ): Promise<number[]> {
    const rows = await this.prisma.healthMeasurement.findMany({
      where: { userId, metric, time: { gte: windowStart(window) } },
      select: { value: true },
    });
    return rows.map((r) => r.value);
  }

  /** Eine Baseline (Metrik × Fenster) neu berechnen und speichern. */
  async recompute(userId: string, metric: string, window: WindowKey) {
    const stat = computeBaseline(await this.values(userId, metric, window));
    return this.prisma.personalBaseline.upsert({
      where: { userId_metric_window: { userId, metric, window } },
      update: { avg: stat.avg, stddev: stat.stddev, n: stat.n, computedAt: new Date() },
      create: { userId, metric, window, avg: stat.avg, stddev: stat.stddev, n: stat.n },
    });
  }

  /** Alle relevanten Baselines eines Nutzers neu berechnen (Job-Einstieg). */
  async recomputeAll(userId: string): Promise<void> {
    for (const metric of BASELINE_METRICS) {
      for (const window of WINDOWS) {
        await this.recompute(userId, metric, window);
      }
    }
  }

  list(userId: string, metric?: string, window?: WindowKey) {
    return this.prisma.personalBaseline.findMany({
      where: { userId, metric, window },
    });
  }

  get(userId: string, metric: string, window: WindowKey) {
    return this.prisma.personalBaseline.findUnique({
      where: { userId_metric_window: { userId, metric, window } },
    });
  }
}
