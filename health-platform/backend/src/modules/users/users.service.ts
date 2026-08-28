import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        locale: true,
        country: true,
        entitlement: true,
        emailVerifiedAt: true,
        createdAt: true,
        profile: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Nutzer nicht gefunden.');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.userProfile.update({
      where: { userId },
      data: { ...dto },
    });
  }

  /**
   * DSGVO-Löschung: Soft-Delete + Anonymisierung des Logins. Der harte Purge
   * (inkl. S3-Objekte) läuft als separater Job (siehe docs/09).
   */
  async requestDeletion(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
        email: `deleted+${userId}@vitaguide.invalid`,
      },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
