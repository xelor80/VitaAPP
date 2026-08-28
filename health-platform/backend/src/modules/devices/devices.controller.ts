import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { CreateConnectionEventDto } from './dto/connection-event.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.devices.list(user.userId);
  }

  @Post()
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { firmware?: string },
  ) {
    return this.devices.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.devices.remove(user.userId, id);
  }

  @Post(':id/connection-events')
  recordEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateConnectionEventDto,
  ) {
    return this.devices.recordConnectionEvent(user.userId, id, dto);
  }
}
