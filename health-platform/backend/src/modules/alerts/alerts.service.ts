import { Injectable } from '@nestjs/common';
import {
  AlertSeverity,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.healthAlert.findMany({
      where: { userId },
      orderBy: { triggeredAt: 'desc' },
      take: 50,
    });
  }

  async acknowledge(userId: string, alertId: string) {
    // updateMany erzwingt die Nutzer-Isolation (id + userId).
    await this.prisma.healthAlert.updateMany({
      where: { id: alertId, userId },
      data: { acknowledgedAt: new Date() },
    });
    return { acknowledged: true };
  }

  /**
   * Legt eine Warnung an, sofern der Cooldown seit der letzten gleichartigen
   * Warnung abgelaufen ist (verhindert Benachrichtigungsfluten, docs/10).
   * Gibt null zurück, wenn im Cooldown-Fenster (kein neuer Alert).
   */
  async createIfNotCoolingDown(params: {
    userId: string;
    ruleId: string;
    metric: string;
    severity: AlertSeverity;
    context: Prisma.InputJsonValue;
    cooldownHours: number;
  }) {
    const since = new Date(Date.now() - params.cooldownHours * 3_600_000);
    const recent = await this.prisma.healthAlert.findFirst({
      where: {
        userId: params.userId,
        ruleId: params.ruleId,
        triggeredAt: { gte: since },
      },
    });
    if (recent) return null;

    return this.prisma.healthAlert.create({
      data: {
        userId: params.userId,
        ruleId: params.ruleId,
        metric: params.metric,
        severity: params.severity,
        context: params.context,
      },
    });
  }
}
