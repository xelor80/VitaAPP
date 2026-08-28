import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { isWindowKey, WindowKey } from '../../common/time/ranges';
import { BaselinesService } from './baselines.service';

@Controller('baselines')
export class BaselinesController {
  constructor(private readonly baselines: BaselinesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('metric') metric?: string,
    @Query('window') window?: string,
  ) {
    if (window && !isWindowKey(window)) {
      throw new BadRequestException('window muss 7d | 30d | 90d sein.');
    }
    return this.baselines.list(user.userId, metric, window as WindowKey);
  }
}
