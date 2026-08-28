import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.alerts.list(user.userId);
  }

  @Post(':id/ack')
  @HttpCode(200)
  ack(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.alerts.acknowledge(user.userId, id);
  }
}
