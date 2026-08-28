import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { isRangeKey, RangeKey } from '../../common/time/ranges';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get(':metric/series')
  series(
    @CurrentUser() user: AuthUser,
    @Param('metric') metric: string,
    @Query('range') range = '24h',
  ) {
    if (!isRangeKey(range)) {
      throw new BadRequestException('range muss 24h | 7d | 30d | 3m | 1y sein.');
    }
    return this.metrics.series(user.userId, metric, range as RangeKey);
  }

  @Get(':metric/summary')
  summary(@CurrentUser() user: AuthUser, @Param('metric') metric: string) {
    return this.metrics.summary(user.userId, metric);
  }
}
