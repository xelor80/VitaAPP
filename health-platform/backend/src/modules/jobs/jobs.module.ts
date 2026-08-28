import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BaselinesModule } from '../baselines/baselines.module';
import { ScoreModule } from '../score/score.module';
import { InsightsModule } from '../insights/insights.module';
import { AlertsModule } from '../alerts/alerts.module';
import { HEALTH_QUEUE } from './jobs.constants';
import { JobsService } from './jobs.service';
import { HealthProcessor } from './health.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
    }),
    BullModule.registerQueue({ name: HEALTH_QUEUE }),
    BaselinesModule,
    ScoreModule,
    InsightsModule,
    AlertsModule,
  ],
  providers: [JobsService, HealthProcessor],
  exports: [JobsService],
})
export class JobsModule {}
