import { Module } from '@nestjs/common';
import { BaselinesModule } from '../baselines/baselines.module';
import { AlertsModule } from '../alerts/alerts.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [BaselinesModule, AlertsModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
