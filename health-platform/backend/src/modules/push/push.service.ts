import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PUSH_PROVIDER,
  PushPayload,
  PushProvider,
} from './push.provider';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class PushService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_PROVIDER) private readonly provider: PushProvider,
  ) {}

  registerToken(userId: string, token: string, platform: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  async removeToken(userId: string, id: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { id, userId } });
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        channels: dto.channels as Prisma.InputJsonValue | undefined,
        categories: dto.categories as Prisma.InputJsonValue | undefined,
        quietHours: dto.quietHours as Prisma.InputJsonValue | undefined,
      },
      create: {
        userId,
        channels: (dto.channels ?? {}) as Prisma.InputJsonValue,
        categories: (dto.categories ?? {}) as Prisma.InputJsonValue,
        quietHours: dto.quietHours as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /**
   * Push an einen Nutzer senden – respektiert die Kanal-Präferenz und schreibt
   * einen Verlaufseintrag. Payload bleibt neutral (i18n-Keys, docs/16).
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    const prefs = await this.getPreferences(userId);
    const channels = (prefs.channels as { push?: boolean }) ?? {};
    if (channels.push === false) return 0;

    const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
    for (const t of tokens) {
      await this.provider.send(t.token, t.platform, payload);
    }

    await this.prisma.pushNotification.create({
      data: {
        userId,
        titleKey: payload.titleKey,
        bodyKey: payload.bodyKey,
        params: (payload.params ?? {}) as Prisma.InputJsonValue,
        sentAt: new Date(),
        delivered: tokens.length > 0,
      },
    });
    return tokens.length;
  }
}
