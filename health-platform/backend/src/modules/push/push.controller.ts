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
import { PushService } from './push.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller()
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('push/tokens')
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterTokenDto) {
    return this.push.registerToken(user.userId, dto.token, dto.platform);
  }

  @Delete('push/tokens/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.push.removeToken(user.userId, id);
  }

  @Get('me/notification-preferences')
  getPreferences(@CurrentUser() user: AuthUser) {
    return this.push.getPreferences(user.userId);
  }

  @Patch('me/notification-preferences')
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.push.updatePreferences(user.userId, dto);
  }
}
