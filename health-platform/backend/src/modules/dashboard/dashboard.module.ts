import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { ScoreModule } from '../score/score.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [MetricsModule, ScoreModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
