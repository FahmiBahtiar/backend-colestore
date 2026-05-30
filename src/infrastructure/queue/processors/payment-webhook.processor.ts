import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProcessPaymentWebhookUseCase } from '../../../application/use-cases';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.PAYMENT_WEBHOOK, { concurrency: 5 })
export class PaymentWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentWebhookProcessor.name);

  constructor(
    private readonly processPaymentWebhookUseCase: ProcessPaymentWebhookUseCase,
  ) {
    super();
  }

  /** Process queued payment webhook jobs with a small payload. */
  async process(job: Job<{ payload: unknown }>): Promise<void> {
    await this.processPaymentWebhookUseCase.execute({
      payload: job.data.payload,
    });
    this.logger.log(`Processed payment webhook job ${job.id}`);
  }
}
