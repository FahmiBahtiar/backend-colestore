import 'reflect-metadata';
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/prisma';
import { MeilisearchService } from '../infrastructure/meilisearch';
import { Logger } from '@nestjs/common';

const logger = new Logger('MeilisearchBackfill');

async function bootstrap() {
  logger.log(
    'Bootstrapping standalone NestJS application context for Meilisearch Backfill...',
  );
  const app = await NestFactory.createApplicationContext(AppModule);

  const prisma = app.get(PrismaService);
  const meilisearch = app.get(MeilisearchService);
  const client = meilisearch.getClient();

  try {
    // ----------------------------------------------------
    // 1. PRODUCTS INDEX SETUP
    // ----------------------------------------------------
    const productIndexName = meilisearch.getResolvedIndexName('products');
    logger.log(`Setting up index: ${productIndexName}...`);

    try {
      await client.deleteIndex(productIndexName);
      logger.log(`Old index "${productIndexName}" deleted.`);
    } catch {
      // Index did not exist, safe to ignore
    }

    await client.createIndex(productIndexName, { primaryKey: 'id' });
    const productIndex = client.index(productIndexName);

    await productIndex.updateSettings({
      searchableAttributes: ['name', 'description', 'categoryName'],
      filterableAttributes: ['isActive', 'categoryId'],
      sortableAttributes: ['createdAt', 'basePrice'],
    });
    logger.log(`Configured settings for index "${productIndexName}".`);

    // Fetch and sync products in batches
    const products = await prisma.product.findMany({
      include: { category: true },
    });

    if (products.length > 0) {
      const productDocs = products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        basePrice: Number(product.basePrice),
        isActive: product.isActive,
        categoryId: product.categoryId || '',
        categoryName: product.category?.name || '',
        stockQuantity: product.stockQuantity,
        imageKey: product.imageKey || '',
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      }));

      await productIndex.addDocuments(productDocs);
      logger.log(
        `Successfully indexed ${productDocs.length} Products into "${productIndexName}".`,
      );
    } else {
      logger.log('No Products found in database to index.');
    }

    // ----------------------------------------------------
    // 2. ORDERS INDEX SETUP
    // ----------------------------------------------------
    const orderIndexName = meilisearch.getResolvedIndexName('orders');
    logger.log(`Setting up index: ${orderIndexName}...`);

    try {
      await client.deleteIndex(orderIndexName);
      logger.log(`Old index "${orderIndexName}" deleted.`);
    } catch {
      // Index did not exist, safe to ignore
    }

    await client.createIndex(orderIndexName, { primaryKey: 'id' });
    const orderIndex = client.index(orderIndexName);

    await orderIndex.updateSettings({
      searchableAttributes: [
        'id',
        'customerEmail',
        'customerWhatsapp',
        'itemProductNames',
      ],
      filterableAttributes: ['status', 'userId', 'createdAt', 'itemProductIds'],
      sortableAttributes: ['createdAt', 'finalAmount'],
    });
    logger.log(`Configured settings for index "${orderIndexName}".`);

    // Fetch and sync orders (blacklisting payment credentials/proof!)
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (orders.length > 0) {
      const orderDocs = orders.map((order) => {
        const itemProductNames = order.items
          .filter((item) => item.product)
          .map((item) => item.product.name);
        const itemProductIds = order.items.map((item) => item.productId);

        return {
          id: order.id,
          userId: order.userId || '',
          customerEmail: order.customerEmail,
          customerWhatsapp: order.customerWhatsapp,
          totalAmount: Number(order.totalAmount),
          discountAmount: Number(order.discountAmount),
          finalAmount: Number(order.finalAmount),
          status: order.status,
          paymentMethodType: order.paymentMethodType || '',
          paymentChannel: order.paymentChannel || '',
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          itemProductNames,
          itemProductIds,
        };
      });

      await orderIndex.addDocuments(orderDocs);
      logger.log(
        `Successfully indexed ${orderDocs.length} Orders into "${orderIndexName}".`,
      );
    } else {
      logger.log('No Orders found in database to index.');
    }

    // ----------------------------------------------------
    // 3. CUSTOMERS INDEX SETUP
    // ----------------------------------------------------
    const customerIndexName = meilisearch.getResolvedIndexName('customers');
    logger.log(`Setting up index: ${customerIndexName}...`);

    try {
      await client.deleteIndex(customerIndexName);
      logger.log(`Old index "${customerIndexName}" deleted.`);
    } catch {
      // Index did not exist, safe to ignore
    }

    await client.createIndex(customerIndexName, { primaryKey: 'id' });
    const customerIndex = client.index(customerIndexName);

    await customerIndex.updateSettings({
      searchableAttributes: ['name', 'email'],
      filterableAttributes: ['role', 'isActive'],
      sortableAttributes: ['createdAt', 'totalPoints'],
    });
    logger.log(`Configured settings for index "${customerIndexName}".`);

    // Fetch and sync users
    const users = await prisma.user.findMany({
      include: { pointTransactions: true },
    });

    if (users.length > 0) {
      const customerDocs = users.map((user) => {
        const earned = (user.pointTransactions || [])
          .filter((p) => p.type === 'EARNED')
          .reduce((sum, p) => sum + p.points, 0);
        const spent = (user.pointTransactions || [])
          .filter((p) => p.type === 'REFUNDED' || p.type === 'REDEEMED')
          .reduce((sum, p) => sum + p.points, 0);
        const totalPoints = Math.max(0, earned - spent);

        return {
          id: user.id,
          name: user.name || '',
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          totalPoints,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      });

      await customerIndex.addDocuments(customerDocs);
      logger.log(
        `Successfully indexed ${customerDocs.length} Customers into "${customerIndexName}".`,
      );
    } else {
      logger.log('No Users found in database to index.');
    }

    logger.log('--- Meilisearch backfill completed successfully! ---');
  } catch (error) {
    logger.error('An error occurred during Meilisearch backfill:', error);
  } finally {
    logger.log('Closing NestJS application context...');
    await app.close();
    process.exit(0);
  }
}

void bootstrap();
