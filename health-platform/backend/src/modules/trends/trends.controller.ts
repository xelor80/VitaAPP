import { Controller, Get, Query } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { TrendsService } from './trends.service';

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

@Controller('trends')
export class TrendsController {
  constructor(private readonly trends: TrendsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Query('range') range = '30d') {
    const days = RANGE_DAYS[range] ?? 30;
    return this.trends.compute(user.userId, days);
  }
}
