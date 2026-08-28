import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { windowStart } from '../../common/time/ranges';
import { RulesService } from '../rules/rules.service';
import {
  evaluateRule,
  RuleDefinition,
  Sample,
} from '../rules/rule-evaluator';
import { AlertsService } from './alerts.service';

/**
 * Orchestriert die Rule-Engine: lädt aktive Regeln + Messwerte + Baseline,
 * wertet sie aus und legt bei Treffer (unter Beachtung des Cooldowns) Alerts an.
 * Einstiegspunkt für den Worker/Scheduler (docs/10) sowie nach jedem Sync.
 */
@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: RulesService,
    private readonly alerts: AlertsService,
  ) {}

  private async recentSamples(
    userId: string,
    metric: string,
  ): Promise<Sample[]> {
    const rows = await this.prisma.healthMeasurement.findMany({
      where: { userId, metric, time: { gte: windowStart('7d') } },
      orderBy: { time: 'desc' },
      take: 500,
      select: { value: true, time: true },
    });
    return rows.map((r) => ({ value: r.value, time: r.time }));
  }

  private async baselineAvg(userId: string, metric: string) {
    const row = await this.prisma.personalBaseline.findUnique({
      where: { userId_metric_window: { userId, metric, window: '30d' } },
    });
    return row && row.n >= 3 ? row.avg : null;
  }

  /** Alle aktiven Regeln der genannten Metriken für einen Nutzer prüfen. */
  async evaluateMetrics(userId: string, metrics: string[]): Promise<number> {
    let created = 0;
    const uniqueMetrics = [...new Set(metrics)];

    for (const metric of uniqueMetrics) {
      const rules = await this.rules.activeForMetric(metric);
      if (rules.length === 0) continue;

      const samples = await this.recentSamples(userId, metric);
      const baselineAvg = await this.baselineAvg(userId, metric);
      const now = new Date();

      for (const rule of rules) {
        const def = rule.definition as unknown as RuleDefinition;
        const result = evaluateRule(def, { samples, baselineAvg, now });
        if (!result.triggered) continue;

        const alert = await this.alerts.createIfNotCoolingDown({
          userId,
          ruleId: rule.id,
          metric,
          severity: rule.severity,
          context: {
            matchedCount: result.matchedCount,
            required: result.required,
            matchedValues: result.matchedValues,
            baselineAvg,
          } as Prisma.InputJsonValue,
          cooldownHours: def.cooldown?.hours ?? 12,
        });
        if (alert) created += 1;
      }
    }

    if (created > 0) {
      this.logger.log(`${created} Alert(s) für Nutzer ${userId} erzeugt.`);
    }
    return created;
  }
}
