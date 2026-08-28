import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { BaselinesService, BASELINE_METRICS } from '../baselines/baselines.service';
import { ScoreService } from '../score/score.service';
import { InsightsService } from '../insights/insights.service';
import { EvaluationService } from '../alerts/evaluation.service';
import { HEALTH_QUEUE, JobName } from './jobs.constants';

/**
 * Verarbeitet die Health-Queue (docs/01 Worker/Scheduler). Der nächtliche
 * Fan-out erzeugt pro aktivem Nutzer einen Wartungsjob; dieser frischt
 * Baselines, Score und Insights auf und wertet die Regeln aus.
 */
@Processor(HEALTH_QUEUE)
export class HealthProcessor extends WorkerHost {
  private readonly logger = new Logger(HealthProcessor.name);

  constructor(
    @InjectQueue(HEALTH_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly baselines: BaselinesService,
    private readonly score: ScoreService,
    private readonly insights: InsightsService,
    private readonly evaluation: EvaluationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JobName.nightlyFanout:
        return this.fanout();
      case JobName.userMaintenance:
        return this.userMaintenance(job.data.userId as string);
      default:
        this.logger.warn(`Unbekannter Job: ${job.name}`);
    }
  }

  private async fanout(): Promise<void> {
    const batchSize = 500;
    let cursor: string | undefined;
    let total = 0;

    // Nutzer paginiert einreihen, um Speicher zu schonen.
    for (;;) {
      const users = await this.prisma.user.findMany({
        where: { status: 'active' },
        select: { id: true },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      });
      if (users.length === 0) break;
      await this.queue.addBulk(
        users.map((u) => ({
          name: JobName.userMaintenance,
          data: { userId: u.id },
          opts: { removeOnComplete: true, attempts: 2 },
        })),
      );
      total += users.length;
      cursor = users[users.length - 1].id;
      if (users.length < batchSize) break;
    }
    this.logger.log(`Nightly-Fanout: ${total} Nutzer eingereiht.`);
  }

  private async userMaintenance(userId: string): Promise<void> {
    await this.baselines.recomputeAll(userId);
    await this.score.computeDaily(userId);
    await this.insights.regenerate(userId);
    await this.evaluation.evaluateMetrics(userId, BASELINE_METRICS);
  }
}
