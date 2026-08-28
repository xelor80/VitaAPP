import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aktive Regeln für eine Metrik (vom Rule-Evaluator genutzt). */
  activeForMetric(metric: string) {
    return this.prisma.healthRule.findMany({
      where: { metric, active: true },
    });
  }

  list() {
    return this.prisma.healthRule.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
