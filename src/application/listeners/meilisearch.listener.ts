import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../common/constants';
import { MeilisearchSyncJobPayload } from '../../infrastructure/queue/processors/meilisearch-sync.processor';

@Injectable()
export class MeilisearchEventListener {
  private readonly logger = new Logger(MeilisearchEventListener.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.MEILISEARCH_SYNC)
    private readonly syncQueue: Queue<MeilisearchSyncJobPayload>,
  ) {}

  @OnEvent('product.created')
  @OnEvent('product.updated')
  async handleProductUpsert(payload: { productId: string }) {
    this.logger.log(
      `Received product upsert event for ID: ${payload.productId}`,
    );
    await this.syncQueue.add('sync-product-upsert', {
      index: 'products',
      action: 'UPSERT',
      id: payload.productId,
    });
  }

  @OnEvent('product.deleted')
  async handleProductDelete(payload: { productId: string }) {
    this.logger.log(
      `Received product delete event for ID: ${payload.productId}`,
    );
    await this.syncQueue.add('sync-product-delete', {
      index: 'products',
      action: 'DELETE',
      id: payload.productId,
    });
  }

  @OnEvent('order.created')
  @OnEvent('order.updated')
  async handleOrderUpsert(payload: { orderId: string }) {
    this.logger.log(`Received order upsert event for ID: ${payload.orderId}`);
    await this.syncQueue.add('sync-order-upsert', {
      index: 'orders',
      action: 'UPSERT',
      id: payload.orderId,
    });
  }

  @OnEvent('user.created')
  @OnEvent('user.updated')
  @OnEvent('user.activated')
  @OnEvent('user.deactivated')
  async handleUserUpsert(payload: { userId: string }) {
    this.logger.log(
      `Received user/customer upsert event for ID: ${payload.userId}`,
    );
    await this.syncQueue.add('sync-user-upsert', {
      index: 'customers',
      action: 'UPSERT',
      id: payload.userId,
    });
  }
}
