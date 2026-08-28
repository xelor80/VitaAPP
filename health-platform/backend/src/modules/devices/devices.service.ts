import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { CreateConnectionEventDto } from './dto/connection-event.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: { pairedAt: 'desc' },
    });
  }

  register(userId: string, dto: RegisterDeviceDto) {
    return this.prisma.device.create({
      data: {
        userId,
        vendor: dto.vendor,
        model: dto.model,
        providerKey: dto.providerKey,
        serial: dto.serial,
        firmware: dto.firmware,
        capabilities: (dto.capabilities ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /** Stellt sicher, dass das Gerät dem Nutzer gehört (Isolation). */
  private async assertOwnership(userId: string, deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      throw new NotFoundException('Gerät nicht gefunden.');
    }
    if (device.userId !== userId) {
      throw new ForbiddenException('Kein Zugriff auf dieses Gerät.');
    }
    return device;
  }

  async update(
    userId: string,
    deviceId: string,
    data: { firmware?: string },
  ) {
    await this.assertOwnership(userId, deviceId);
    return this.prisma.device.update({
      where: { id: deviceId },
      data,
    });
  }

  async remove(userId: string, deviceId: string): Promise<void> {
    await this.assertOwnership(userId, deviceId);
    await this.prisma.device.delete({ where: { id: deviceId } });
  }

  async recordConnectionEvent(
    userId: string,
    deviceId: string,
    dto: CreateConnectionEventDto,
  ) {
    await this.assertOwnership(userId, deviceId);
    return this.prisma.deviceConnection.create({
      data: {
        deviceId,
        event: dto.event as ConnectionEvent,
        battery: dto.battery,
        detail: (dto.detail ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
