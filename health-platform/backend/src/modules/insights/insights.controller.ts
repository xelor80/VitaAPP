import { Controller, Get, Post } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.insights.list(user.userId);
  }

  @Post('regenerate')
  regenerate(@CurrentUser() user: AuthUser) {
    return this.insights.regenerate(user.userId);
  }
}
