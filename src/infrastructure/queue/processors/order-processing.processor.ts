import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.ORDER_PROCESSING, { concurrency: 3 })
export class OrderProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessingProcessor.name);

  /** Placeholder processor for future long-running order workflows. */
  process(job: Job<{ orderId: string }>): Promise<void> {
    this.logger.log(
      `Received order processing job ${job.id} for ${job.data.orderId}`,
    );
    return Promise.resolve();
  }
}
