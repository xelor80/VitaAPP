import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aggregierte KPIs – KEINE individuellen Gesundheitsdaten (docs/24). */
  async stats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      users,
      activeUsers,
      dau,
      devices,
      measurementsToday,
      openAlerts,
      pushToday,
      affiliateMonth,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'active' } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: startOfDay } } }),
      this.prisma.device.count(),
      this.prisma.healthMeasurement.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.healthAlert.count({ where: { acknowledgedAt: null } }),
      this.prisma.pushNotification.count({ where: { sentAt: { gte: startOfDay } } }),
      this.prisma.affiliateEvent.count({ where: { at: { gte: monthAgo } } }),
    ]);

    return {
      users,
      activeUsers,
      dau,
      devices,
      measurementsToday,
      openAlerts,
      pushToday,
      affiliateClicksMonth: affiliateMonth,
    };
  }

  listUsers(query?: string, take = 50) {
    return this.prisma.user.findMany({
      where: query
        ? { email: { contains: query, mode: 'insensitive' } }
        : undefined,
      select: {
        id: true,
        email: true,
        status: true,
        entitlement: true,
        locale: true,
        country: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  setUserStatus(userId: string, status: UserStatus) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, status: true },
    });
  }

  getConfig(key: string) {
    return this.prisma.appConfig.findUnique({ where: { key } });
  }

  listConfig() {
    return this.prisma.appConfig.findMany();
  }

  putConfig(key: string, value: Record<string, unknown>) {
    const json = value as Prisma.InputJsonValue;
    return this.prisma.appConfig.upsert({
      where: { key },
      update: { value: json, version: { increment: 1 } },
      create: { key, value: json },
    });
  }
}
