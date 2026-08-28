import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { HEALTH_QUEUE, JobName } from './jobs.constants';

@Injectable()
export class JobsService implements OnModuleInit {
  constructor(@InjectQueue(HEALTH_QUEUE) private readonly queue: Queue) {}

  /** Nächtlichen Fan-out als wiederholbaren Job registrieren (03:15 UTC). */
  async onModuleInit(): Promise<void> {
    await this.queue.add(
      JobName.nightlyFanout,
      {},
      {
        repeat: { pattern: '15 3 * * *' },
        jobId: 'nightly-fanout', // idempotent – nur ein Repeatable
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  /** Wartung für einen Nutzer außerplanmäßig anstoßen. */
  enqueueUserMaintenance(userId: string) {
    return this.queue.add(
      JobName.userMaintenance,
      { userId },
      { removeOnComplete: true, attempts: 2 },
    );
  }
}
