import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { ScoreService } from '../score/score.service';
import { greetingKey } from './greeting';

/** Metriken, die auf „Heute wichtig" erscheinen (docs/04 & docs/13). */
const TODAY_METRICS = ['heart_rate', 'spo2', 'stress', 'hrv', 'steps'];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly score: ScoreService,
  ) {}

  /** Aggregierter Today-Screen in einem Roundtrip. */
  async today(userId: string) {
    const now = new Date();

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { firstName: true },
    });

    const score = await this.score.getForDate(userId, now);

    // „Heute wichtig": pro Metrik die Zusammenfassung inkl. Einordnung.
    const important = await Promise.all(
      TODAY_METRICS.map((metric) => this.metrics.summary(userId, metric)),
    );

    const alerts = await this.prisma.healthAlert.findMany({
      where: { userId, acknowledgedAt: null },
      orderBy: { triggeredAt: 'desc' },
      take: 5,
    });

    return {
      greetingKey: greetingKey(now.getHours()),
      firstName: profile?.firstName ?? null,
      date: now.toISOString(),
      score: {
        total: 'total' in score ? score.total : null,
        components: 'components' in score ? score.components : {},
        available: 'available' in score ? score.available : true,
      },
      important: important.filter((m) => m.current !== null),
      alerts,
    };
  }
}
