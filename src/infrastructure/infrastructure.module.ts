import { forwardRef, Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from '../application/interfaces';
import { QueueModule } from './queue';
import { PrismaModule } from './prisma';
import { MinioService, XenditService } from './services';

@Module({
  imports: [PrismaModule, forwardRef(() => QueueModule)],
  providers: [
    MinioService,
    XenditService,
    { provide: PAYMENT_GATEWAY, useExisting: XenditService },
  ],
  exports: [
    PrismaModule,
    QueueModule,
    MinioService,
    XenditService,
    PAYMENT_GATEWAY,
  ],
})
export class InfrastructureModule {}
