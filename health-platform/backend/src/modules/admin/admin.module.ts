import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminAuthController } from './admin-auth.controller';
import { AdminController } from './admin.controller';
import { CatalogController } from './catalog.controller';
import { AdminService } from './admin.service';
import { CatalogService } from './catalog.service';
import { AuditService } from './audit.service';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminJwtStrategy } from './auth/admin-jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AdminAuthController, AdminController, CatalogController],
  providers: [
    AdminService,
    CatalogService,
    AuditService,
    AdminAuthService,
    AdminJwtStrategy,
  ],
})
export class AdminModule {}
