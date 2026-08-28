import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Schreibt unveränderliche Audit-Einträge für Admin-Aktionen (docs/09). */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(params: {
    actor: string;
    action: string;
    targetType?: string;
    targetId?: string;
    meta?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actor: params.actor,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        meta: params.meta,
      },
    });
  }

  list(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { at: 'desc' },
      take: limit,
    });
  }
}
