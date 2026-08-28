import { Controller, Get, Query } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { ScoreService } from './score.service';

@Controller('score')
export class ScoreController {
  constructor(private readonly score: ScoreService) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    const day = date ? new Date(date) : new Date();
    return this.score.getForDate(user.userId, day);
  }
}
