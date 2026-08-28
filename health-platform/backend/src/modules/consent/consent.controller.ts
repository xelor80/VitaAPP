import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { ConsentService } from './consent.service';
import { SetConsentDto } from './dto/set-consent.dto';

@Controller('me/consents')
export class ConsentController {
  constructor(private readonly consent: ConsentService) {}

  @Get()
  status(@CurrentUser() user: AuthUser) {
    return this.consent.currentStatus(user.userId);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.consent.history(user.userId);
  }

  @Post()
  record(@CurrentUser() user: AuthUser, @Body() dto: SetConsentDto) {
    return this.consent.record(user.userId, dto);
  }
}
