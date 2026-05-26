import { forwardRef, Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from '../application/interfaces';
import { QueueModule } from './queue';
import { PrismaModule } from './prisma';
import { MinioService, DuitkuService } from './services';

@Module({
  imports: [PrismaModule, forwardRef(() => QueueModule)],
  providers: [
    MinioService,
    DuitkuService,
    { provide: PAYMENT_GATEWAY, useClass: DuitkuService },
  ],
  exports: [
    PrismaModule,
    QueueModule,
    MinioService,
    DuitkuService,
    PAYMENT_GATEWAY,
  ],
})
export class InfrastructureModule {}
