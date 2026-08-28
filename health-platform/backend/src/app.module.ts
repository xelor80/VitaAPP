import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ConsentModule } from './modules/consent/consent.module';
import { DevicesModule } from './modules/devices/devices.module';
import { SyncModule } from './modules/sync/sync.module';
import { BaselinesModule } from './modules/baselines/baselines.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ScoreModule } from './modules/score/score.module';
import { TrendsModule } from './modules/trends/trends.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { RulesModule } from './modules/rules/rules.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { HealthCheckController } from './health-check.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ConsentModule,
    DevicesModule,
    SyncModule,
    BaselinesModule,
    MetricsModule,
    ScoreModule,
    TrendsModule,
    DashboardModule,
    RulesModule,
    AlertsModule,
  ],
  controllers: [HealthCheckController],
  providers: [
    // JWT-Guard global; einzelne Routen via @Public() öffnen.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
