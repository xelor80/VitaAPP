import { Controller, Get } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('today')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  today(@CurrentUser() user: AuthUser) {
    return this.dashboard.today(user.userId);
  }
}
