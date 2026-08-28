import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { windowStart } from '../../common/time/ranges';
import {
  ComponentScores,
  componentFromBaseline,
  DEFAULT_WEIGHTS,
  totalScore,
  Weights,
} from './score-calculator';

export interface Explanation {
  key: string;
  params: Record<string, number>;
}

@Injectable()
export class ScoreService {
  constructor(private readonly prisma: PrismaService) {}

  private dayBounds(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private async latest(userId: string, metric: string, start: Date, end: Date) {
    const row = await this.prisma.healthMeasurement.findFirst({
      where: { userId, metric, time: { gte: start, lt: end } },
      orderBy: { time: 'desc' },
      select: { value: true },
    });
    return row?.value ?? null;
  }

  private async baselineAvg(userId: string, metric: string): Promise<number | null> {
    const row = await this.prisma.personalBaseline.findUnique({
      where: { userId_metric_window: { userId, metric, window: '30d' } },
    });
    return row && row.n >= 3 ? row.avg : null;
  }

  private async weights(): Promise<Weights> {
    const cfg = await this.prisma.appConfig.findUnique({
      where: { key: 'score_weights' },
    });
    return { ...DEFAULT_WEIGHTS, ...((cfg?.value as Partial<Weights>) ?? {}) };
  }

  /**
   * Tages-Score berechnen und speichern. Nur aus vorhandenen Daten;
   * fehlende Komponenten werden ausgeklammert (docs/11). Keine erfundenen Werte.
   */
  async computeDaily(userId: string, date: Date = new Date()) {
    const { start, end } = this.dayBounds(date);
    const components: ComponentScores = {};
    const explanations: Explanation[] = [];

    // Recovery ← HRV (höher besser)
    const hrv = await this.latest(userId, 'hrv', start, end);
    const hrvBase = await this.baselineAvg(userId, 'hrv');
    if (hrv !== null && hrvBase !== null) {
      components.recovery = componentFromBaseline(hrv, hrvBase, true);
      const dev = Math.round(((hrv - hrvBase) / hrvBase) * 100);
      if (dev <= -10) explanations.push({ key: 'score.hrv_below', params: { pct: -dev } });
    }

    // Cardio ← Ruhepuls (niedriger besser)
    const rhr = await this.latest(userId, 'heart_rate', start, end);
    const rhrBase = await this.baselineAvg(userId, 'heart_rate');
    if (rhr !== null && rhrBase !== null) {
      components.cardio = componentFromBaseline(rhr, rhrBase, false);
    }

    // Stress (niedriger besser)
    const stress = await this.latest(userId, 'stress', start, end);
    const stressBase = await this.baselineAvg(userId, 'stress');
    if (stress !== null && stressBase !== null) {
      components.stress = componentFromBaseline(stress, stressBase, false);
    }

    // Activity ← Schritte vs. Tagesziel
    const stepsAgg = await this.prisma.healthMeasurement.aggregate({
      where: { userId, metric: 'steps', time: { gte: start, lt: end } },
      _max: { value: true },
    });
    const steps = stepsAgg._max.value;
    if (steps !== null && steps !== undefined) {
      const goalCfg = await this.prisma.appConfig.findUnique({
        where: { key: 'daily_goals' },
      });
      const goal =
        ((goalCfg?.value as { steps?: number })?.steps as number) ?? 8000;
      components.activity = Math.max(0, Math.min(100, (steps / goal) * 100));
    }

    // Sleep ← Schlafscore der letzten Nacht
    const sleep = await this.prisma.sleepSession.findFirst({
      where: { userId, start: { gte: windowStart('7d') } },
      orderBy: { start: 'desc' },
      select: { sleepScore: true },
    });
    if (sleep?.sleepScore != null) {
      components.sleep = sleep.sleepScore;
    }

    const weights = await this.weights();
    const total = totalScore(components, weights);

    if (total === null) {
      // Keine Daten → nichts erfinden, kein Score gespeichert.
      return { date: start, total: null, components, explanations, available: false };
    }

    const saved = await this.prisma.dailyHealthScore.upsert({
      where: { userId_date: { userId, date: start } },
      update: {
        total,
        components: components as Prisma.InputJsonValue,
        explanations: explanations as unknown as Prisma.InputJsonValue,
        configVersion: 1,
      },
      create: {
        userId,
        date: start,
        total,
        components: components as Prisma.InputJsonValue,
        explanations: explanations as unknown as Prisma.InputJsonValue,
        configVersion: 1,
      },
    });
    return { ...saved, available: true };
  }

  async getForDate(userId: string, date: Date = new Date()) {
    const { start } = this.dayBounds(date);
    const existing = await this.prisma.dailyHealthScore.findUnique({
      where: { userId_date: { userId, date: start } },
    });
    return existing ?? this.computeDaily(userId, date);
  }
}
