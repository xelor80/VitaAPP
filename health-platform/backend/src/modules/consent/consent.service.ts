import { Injectable } from '@nestjs/common';
import { ConsentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SetConsentDto } from './dto/set-consent.dto';

/**
 * Consent-Log ist append-only: jede Erteilung/jeder Widerruf ist ein neuer
 * Eintrag (unveränderlich). Der aktuelle Status ergibt sich aus dem jeweils
 * letzten Eintrag je Consent-Typ. Siehe docs/09-datenschutz-security.md.
 */
@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async record(userId: string, dto: SetConsentDto) {
    return this.prisma.consent.create({
      data: {
        userId,
        type: dto.type as ConsentType,
        version: dto.version,
        granted: dto.granted,
        source: dto.source,
        revokedAt: dto.granted ? null : new Date(),
      },
    });
  }

  /** Aktueller Status je Consent-Typ (letzter Eintrag gewinnt). */
  async currentStatus(userId: string): Promise<Record<string, boolean>> {
    const entries = await this.prisma.consent.findMany({
      where: { userId },
      orderBy: { at: 'desc' },
    });
    const status: Record<string, boolean> = {};
    for (const entry of entries) {
      if (!(entry.type in status)) {
        status[entry.type] = entry.granted;
      }
    }
    return status;
  }

  async history(userId: string) {
    return this.prisma.consent.findMany({
      where: { userId },
      orderBy: { at: 'desc' },
    });
  }
}
