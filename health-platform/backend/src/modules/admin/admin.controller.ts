import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { Roles } from './auth/roles.decorator';
import { AdminPrincipal, CurrentAdmin } from './auth/admin-principal';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { PutConfigDto, SetUserStatusDto } from './admin.dtos';

@Public()
@UseGuards(AdminAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Roles('support')
  @Get('users')
  listUsers(@Query('q') q?: string) {
    return this.admin.listUsers(q);
  }

  @Roles('support')
  @Patch('users/:id/status')
  async setUserStatus(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() dto: SetUserStatusDto,
  ) {
    const res = await this.admin.setUserStatus(id, dto.status);
    await this.audit.log({
      actor: admin.adminId,
      action: 'user.status_change',
      targetType: 'user',
      targetId: id,
      meta: { status: dto.status },
    });
    return res;
  }

  @Get('config')
  listConfig() {
    return this.admin.listConfig();
  }

  @Put('config/:key')
  async putConfig(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('key') key: string,
    @Body() dto: PutConfigDto,
  ) {
    const res = await this.admin.putConfig(key, dto.value);
    await this.audit.log({
      actor: admin.adminId,
      action: 'config.update',
      targetType: 'app_config',
      targetId: key,
    });
    return res;
  }

  @Get('audit-logs')
  auditLogs() {
    return this.audit.list();
  }
}
