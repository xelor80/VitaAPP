import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Access-Token (kurzlebig, JWT) + Refresh-Token mit Rotation.
 * Vom Refresh-Token wird nur der SHA-256-Hash gespeichert (nie der Klartext).
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiry(): Date {
    // TTL wie "30d" grob in ms umsetzen (Tage/Stunden/Minuten/Sekunden).
    const ttl = this.config.get<string>('jwt.refreshTtl') ?? '30d';
    const match = /^(\d+)([dhms])$/.exec(ttl);
    const factor: Record<string, number> = {
      d: 86_400_000,
      h: 3_600_000,
      m: 60_000,
      s: 1_000,
    };
    const ms = match ? parseInt(match[1], 10) * factor[match[2]] : 30 * 86_400_000;
    return new Date(Date.now() + ms);
  }

  async issue(
    userId: string,
    email: string,
    deviceInfo?: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessTtl'),
      },
    );

    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(refreshToken),
        deviceInfo,
        expiresAt: this.refreshExpiry(),
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Rotation: Token anhand seines Hashes auflösen, alten entwerten, neuen ausgeben.
   * Gibt null zurück, wenn der Token ungültig/abgelaufen/widerrufen ist.
   */
  async rotate(
    presentedToken: string,
    deviceInfo?: string,
  ): Promise<TokenPair | null> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(presentedToken) },
      include: { user: true },
    });
    if (
      !record ||
      record.revokedAt ||
      record.expiresAt.getTime() < Date.now() ||
      record.user.status !== 'active'
    ) {
      return null;
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issue(record.user.id, record.user.email, deviceInfo);
  }

  async revoke(presentedToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(presentedToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
