import { Module } from '@nestjs/common';
import { RulesModule } from '../rules/rules.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [RulesModule],
  controllers: [AlertsController],
  providers: [AlertsService, EvaluationService],
  exports: [AlertsService, EvaluationService],
})
export class AlertsModule {}
