/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/restrict-template-expressions */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { PrismaService } from '../../prisma';
import { MeilisearchService } from '../../meilisearch';

export interface MeilisearchSyncJobPayload {
  index: 'products' | 'orders' | 'customers';
  action: 'UPSERT' | 'DELETE';
  id: string;
}

@Processor(QUEUE_NAMES.MEILISEARCH_SYNC, { concurrency: 2 })
export class MeilisearchSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(MeilisearchSyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meilisearch: MeilisearchService,
  ) {
    super();
  }

  /**
   * Process a Meilisearch sync job asynchronously.
   */
  async process(job: Job<MeilisearchSyncJobPayload>): Promise<void> {
    const { index, action, id } = job.data;
    this.logger.log(
      `Starting ${action} job on index "${index}" for entity ID: ${id}`,
    );

    try {
      if (action === 'DELETE') {
        const msIndex = this.meilisearch.getIndex(index);
        await msIndex.deleteDocument(id);
        this.logger.log(
          `Successfully DELETED document ${id} from Meilisearch index "${index}"`,
        );
        return;
      }

      // Upsert actions
      switch (index) {
        case 'products':
          await this.syncProduct(id);
          break;
        case 'orders':
          await this.syncOrder(id);
          break;
        case 'customers':
          await this.syncCustomer(id);
          break;
        default:
          this.logger.error(
            `Unknown index name provided to sync job: "${index}"`,
          );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process Meilisearch sync job for ID: ${id} on index "${index}". Error: ${errorMessage}`,
      );
      throw error; // Throw so BullMQ can retry the job using its retry policy
    }
  }

  /** Sync Product details to Meilisearch */
  private async syncProduct(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      this.logger.warn(
        `Product with ID ${id} not found in database. Deleting from index.`,
      );
      await this.meilisearch.getIndex('products').deleteDocument(id);
      return;
    }

    const doc = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      basePrice: product.basePrice,
      isActive: product.isActive,
      categoryId: product.categoryId || '',
      categoryName: product.category?.name || '',
      stockQuantity: product.stockQuantity,
      imageKey: product.imageKey || '',
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    await this.meilisearch.getIndex('products').addDocuments([doc]);
    this.logger.log(
      `Successfully UPSERTED Product "${product.name}" (${id}) into Meilisearch.`,
    );
  }

  /** Sync Order details to Meilisearch - ENFORCING EXTREME SECURITY BLACKLISTS */
  private async syncOrder(id: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      this.logger.warn(
        `Order with ID ${id} not found in database. Deleting from index.`,
      );
      await this.meilisearch.getIndex('orders').deleteDocument(id);
      return;
    }

    const itemProductNames = order.items
      .filter((item) => item.product)
      .map((item) => item.product.name);

    const itemProductIds = order.items.map((item) => item.productId);

    // SECURE SCHEMA MAP: Excludes request keys, payment proof, gateway webhooks, shipping address details
    const doc = {
      id: order.id,
      userId: order.userId || '',
      customerEmail: order.customerEmail,
      customerWhatsapp: order.customerWhatsapp,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      status: order.status,
      paymentMethodType: order.paymentMethodType || '',
      paymentChannel: order.paymentChannel || '',
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      itemProductNames,
      itemProductIds,
    };

    await this.meilisearch.getIndex('orders').addDocuments([doc]);
    this.logger.log(
      `Successfully UPSERTED Order "${order.id}" into Meilisearch.`,
    );
  }

  /** Sync User/Customer details to Meilisearch */
  private async syncCustomer(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { pointTransactions: true },
    });

    if (!user) {
      this.logger.warn(
        `User with ID ${id} not found in database. Deleting from index.`,
      );
      await this.meilisearch.getIndex('customers').deleteDocument(id);
      return;
    }

    const earned = (user.pointTransactions || [])
      .filter((p) => p.type === 'EARNED')
      .reduce((sum, p) => sum + p.points, 0);
    const spent = (user.pointTransactions || [])
      .filter((p) => p.type === 'REFUNDED' || p.type === 'REDEEMED')
      .reduce((sum, p) => sum + p.points, 0);
    const totalPoints = Math.max(0, earned - spent);

    const doc = {
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      totalPoints,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    await this.meilisearch.getIndex('customers').addDocuments([doc]);
    this.logger.log(
      `Successfully UPSERTED User "${user.email}" (${id}) into Meilisearch.`,
    );
  }
}
