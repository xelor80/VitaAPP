import { Body, Controller, Delete, Get, HttpCode, Patch } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: AuthUser) {
    return this.users.getMe(user.userId);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(user.userId, dto);
  }

  @Delete()
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser): Promise<void> {
    await this.users.requestDeletion(user.userId);
  }
}
