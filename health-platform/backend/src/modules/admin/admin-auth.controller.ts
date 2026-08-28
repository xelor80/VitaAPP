import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminLoginDto } from './admin.dtos';

@Public() // umgeht den globalen Nutzer-JWT-Guard; Admin-Login ist selbst öffentlich
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @HttpCode(200)
  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuth.login(dto.email, dto.password);
  }
}
