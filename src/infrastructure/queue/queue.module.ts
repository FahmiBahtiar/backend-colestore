import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from './queue.constants';
import { PaymentWebhookProcessor } from './processors/payment-webhook.processor';
import { OrderProcessingProcessor } from './processors/order-processing.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password'),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.PAYMENT_WEBHOOK,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      },
      {
        name: QUEUE_NAMES.ORDER_PROCESSING,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      },
      {
        name: QUEUE_NAMES.ACTIVITY_LOG,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      },
    ),
  ],
  providers: [PaymentWebhookProcessor, OrderProcessingProcessor],
  exports: [BullModule],
})
export class QueueModule {}
