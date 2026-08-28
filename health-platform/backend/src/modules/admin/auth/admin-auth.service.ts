import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!admin || admin.status !== 'active') {
      throw new UnauthorizedException('Ungültige Zugangsdaten.');
    }
    const valid = await argon2.verify(admin.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Ungültige Zugangsdaten.');
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: admin.id, email: admin.email, roles: admin.roles, admin: true },
      {
        secret: this.config.get<string>('jwt.adminSecret'),
        expiresIn: this.config.get<string>('jwt.adminTtl'),
      },
    );
    return { accessToken };
  }
}
