import { forwardRef, Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from '../application/interfaces';
import { QueueModule } from './queue';
import { PrismaModule } from './prisma';
import { RedisModule } from './redis';
import { MeilisearchModule } from './meilisearch';
import { MinioService, DuitkuService } from './services';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    MeilisearchModule,
    forwardRef(() => QueueModule),
  ],
  providers: [
    MinioService,
    DuitkuService,
    { provide: PAYMENT_GATEWAY, useExisting: DuitkuService },
  ],
  exports: [
    PrismaModule,
    RedisModule,
    MeilisearchModule,
    QueueModule,
    MinioService,
    DuitkuService,
    PAYMENT_GATEWAY,
  ],
})
export class InfrastructureModule {}
