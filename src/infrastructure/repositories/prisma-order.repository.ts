import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  IOrderRepository,
  OrderEntity,
  ListOrdersParams,
  OrderListResult,
} from '../../domain/repositories/order.repository';
import { RedisService } from '../redis/redis.service';

interface OrderWithInclude {
  id: string;
  createdAt: Date;
  [key: string]: unknown;
}

/**
 * Concrete Prisma implementation of IOrderRepository.
 * Handles all Order-related database operations.
 */
@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private serializeCursor(createdAt: Date, id: string): string {
    const jsonStr = JSON.stringify({ createdAt: createdAt.toISOString(), id });
    return Buffer.from(jsonStr).toString('base64');
  }

  private deserializeCursor(
    cursorStr: string,
  ): { createdAt: Date; id: string } | null {
    try {
      const jsonStr = Buffer.from(cursorStr, 'base64').toString('utf-8');
      const obj = JSON.parse(jsonStr) as unknown;
      if (
        obj &&
        typeof obj === 'object' &&
        'createdAt' in obj &&
        'id' in obj &&
        typeof (obj as { createdAt: unknown }).createdAt === 'string' &&
        typeof (obj as { id: unknown }).id === 'string'
      ) {
        const payload = obj as { createdAt: string; id: string };
        return { createdAt: new Date(payload.createdAt), id: payload.id };
      }
      return null;
    } catch {
      return null;
    }
  }

  private static lastExpirationCheck = 0;

  private static readonly orderInclude = {
    items: {
      include: { product: true, variant: true, checkoutAnswers: true },
    },
    user: { select: { id: true, email: true, name: true } },
    coupon: true,
    deliveredBy: { select: { id: true, email: true, name: true } },
  } satisfies Prisma.OrderInclude;

  /** Find an order by ID with relations */
  async findById(id: string): Promise<OrderEntity | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: PrismaOrderRepository.orderInclude,
    });
    if (!order) return null;

    if (!order.userId && order.customerEmail) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: order.customerEmail.toLowerCase().trim() },
        select: { id: true, email: true, name: true },
      });
      if (existingUser) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { userId: existingUser.id },
        });
        order.userId = existingUser.id;
        (order as unknown as { user: typeof existingUser }).user = existingUser;
      }
    }

    return this.toEntity(order);
  }

  /** Find all orders with pagination, filters, search, and sorting */
  async findAll(params?: ListOrdersParams): Promise<OrderListResult> {
    await this.processAutoExpirations();
    const limit = params?.take ?? 20;
    const safeLimit = Math.min(limit, 100);
    const takePlusOne = safeLimit + 1;

    const where: Prisma.OrderWhereInput = {};

    if (params?.status) {
      where.status = params.status as OrderStatus;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { customerWhatsapp: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    // Determine stable ordering: default to [createdAt DESC, id DESC]
    let orderBy: Prisma.OrderOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'desc' },
    ];

    if (!params?.cursor && params?.sortBy) {
      switch (params.sortBy) {
        case 'OLDEST':
          orderBy = [{ createdAt: 'asc' }, { id: 'asc' }];
          break;
        case 'AMOUNT_DESC':
          orderBy = [{ finalAmount: 'desc' }, { id: 'desc' }];
          break;
        case 'AMOUNT_ASC':
          orderBy = [{ finalAmount: 'asc' }, { id: 'asc' }];
          break;
        case 'NEWEST':
        default:
          orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];
          break;
      }
    }

    // Apply cursor filter if present
    let cursorData: { createdAt: Date; id: string } | null = null;
    if (params?.cursor) {
      cursorData = this.deserializeCursor(params.cursor);
    }

    if (cursorData) {
      where.AND = [
        ...(where.AND
          ? Array.isArray(where.AND)
            ? where.AND
            : [where.AND]
          : []),
        {
          OR: [
            { createdAt: { lt: cursorData.createdAt } },
            {
              createdAt: cursorData.createdAt,
              id: { lt: cursorData.id },
            },
          ],
        },
      ];
    }

    let orders: OrderWithInclude[];
    let total = 0;
    let hasNextPage = false;
    let pageNum = 1;

    if (params?.cursor) {
      // Cursor Mode: skip expensive COUNT, directly findMany
      orders = await this.prisma.order.findMany({
        where,
        take: takePlusOne,
        include: PrismaOrderRepository.orderInclude,
        orderBy,
      });

      hasNextPage = orders.length > safeLimit;
    } else {
      // Offset Mode: support full transaction with COUNT
      const skip = params?.skip ?? 0;
      pageNum = Math.floor(skip / safeLimit) + 1;

      const [rawOrders, rawTotal] = await this.prisma.$transaction([
        this.prisma.order.findMany({
          where,
          skip,
          take: takePlusOne,
          include: PrismaOrderRepository.orderInclude,
          orderBy,
        }),
        this.prisma.order.count({ where }),
      ]);

      orders = rawOrders;
      total = rawTotal;
      hasNextPage = rawOrders.length > safeLimit;
    }

    const itemsToReturn = hasNextPage ? orders.slice(0, safeLimit) : orders;
    const mappedItems = itemsToReturn.map((o) => this.toEntity(o));

    const nextCursor =
      hasNextPage && itemsToReturn.length > 0
        ? this.serializeCursor(
            itemsToReturn[itemsToReturn.length - 1].createdAt,
            itemsToReturn[itemsToReturn.length - 1].id,
          )
        : null;

    const totalPages = Math.ceil(total / safeLimit);

    return {
      items: mappedItems,
      data: mappedItems,
      total,
      nextCursor,
      hasNextPage,
      limit: safeLimit,
      meta: {
        total,
        page: pageNum,
        limit: safeLimit,
        totalPages: totalPages > 0 ? totalPages : 1,
        hasNextPage,
        hasPreviousPage: pageNum > 1,
      },
    };
  }

  /** Find orders by user ID with pagination and optional filters */
  async findByUserId(
    userId: string,
    params?: ListOrdersParams,
  ): Promise<OrderListResult> {
    await this.processAutoExpirations();
    const limit = params?.take ?? 20;
    const safeLimit = Math.min(limit, 100);
    const takePlusOne = safeLimit + 1;

    const where: Prisma.OrderWhereInput = { userId };

    if (params?.status) {
      where.status = params.status as OrderStatus;
    }

    if (params?.search) {
      const q = params.search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { customerWhatsapp: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    // Determine stable ordering: default to [createdAt DESC, id DESC]
    let orderBy: Prisma.OrderOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
      { id: 'desc' },
    ];

    if (!params?.cursor && params?.sortBy) {
      switch (params.sortBy) {
        case 'OLDEST':
          orderBy = [{ createdAt: 'asc' }, { id: 'asc' }];
          break;
        case 'AMOUNT_DESC':
          orderBy = [{ finalAmount: 'desc' }, { id: 'desc' }];
          break;
        case 'AMOUNT_ASC':
          orderBy = [{ finalAmount: 'asc' }, { id: 'asc' }];
          break;
        case 'NEWEST':
        default:
          orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];
          break;
      }
    }

    // Apply cursor filter if present
    let cursorData: { createdAt: Date; id: string } | null = null;
    if (params?.cursor) {
      cursorData = this.deserializeCursor(params.cursor);
    }

    if (cursorData) {
      where.AND = [
        ...(where.AND
          ? Array.isArray(where.AND)
            ? where.AND
            : [where.AND]
          : []),
        {
          OR: [
            { createdAt: { lt: cursorData.createdAt } },
            {
              createdAt: cursorData.createdAt,
              id: { lt: cursorData.id },
            },
          ],
        },
      ];
    }

    let orders: OrderWithInclude[];
    let total = 0;
    let hasNextPage = false;
    let pageNum = 1;

    if (params?.cursor) {
      // Cursor Mode: skip expensive COUNT, directly findMany
      orders = await this.prisma.order.findMany({
        where,
        take: takePlusOne,
        include: PrismaOrderRepository.orderInclude,
        orderBy,
      });

      hasNextPage = orders.length > safeLimit;
    } else {
      // Offset Mode: support full transaction with COUNT
      const skip = params?.skip ?? 0;
      pageNum = Math.floor(skip / safeLimit) + 1;

      const [rawOrders, rawTotal] = await this.prisma.$transaction([
        this.prisma.order.findMany({
          where,
          skip,
          take: takePlusOne,
          include: PrismaOrderRepository.orderInclude,
          orderBy,
        }),
        this.prisma.order.count({ where }),
      ]);

      orders = rawOrders;
      total = rawTotal;
      hasNextPage = rawOrders.length > safeLimit;
    }

    const itemsToReturn = hasNextPage ? orders.slice(0, safeLimit) : orders;
    const mappedItems = itemsToReturn.map((o) => this.toEntity(o));

    const nextCursor =
      hasNextPage && itemsToReturn.length > 0
        ? this.serializeCursor(
            itemsToReturn[itemsToReturn.length - 1].createdAt,
            itemsToReturn[itemsToReturn.length - 1].id,
          )
        : null;

    const totalPages = Math.ceil(total / safeLimit);

    return {
      items: mappedItems,
      data: mappedItems,
      total,
      nextCursor,
      hasNextPage,
      limit: safeLimit,
      meta: {
        total,
        page: pageNum,
        limit: safeLimit,
        totalPages: totalPages > 0 ? totalPages : 1,
        hasNextPage,
        hasPreviousPage: pageNum > 1,
      },
    };
  }

  /** Find an order by payment gateway invoice ID */
  async findByPaymentGatewayInvoiceId(
    invoiceId: string,
  ): Promise<OrderEntity | null> {
    const order = await this.prisma.order.findFirst({
      where: { paymentGatewayInvoiceId: invoiceId },
      include: {
        items: {
          include: { product: true, variant: true, checkoutAnswers: true },
        },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!order) return null;

    if (!order.userId && order.customerEmail) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: order.customerEmail.toLowerCase().trim() },
        select: { id: true, email: true, name: true },
      });
      if (existingUser) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { userId: existingUser.id },
        });
        order.userId = existingUser.id;
        (order as unknown as { user: typeof existingUser }).user = existingUser;
      }
    }

    return this.toEntity(order);
  }

  /** Find an order by payment gateway request ID */
  async findByPaymentGatewayRequestId(
    paymentRequestId: string,
  ): Promise<OrderEntity | null> {
    const order = await this.prisma.order.findFirst({
      where: { paymentGatewayRequestId: paymentRequestId },
      include: {
        items: {
          include: { product: true, variant: true, checkoutAnswers: true },
        },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!order) return null;

    if (!order.userId && order.customerEmail) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: order.customerEmail.toLowerCase().trim() },
        select: { id: true, email: true, name: true },
      });
      if (existingUser) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { userId: existingUser.id },
        });
        order.userId = existingUser.id;
        (order as unknown as { user: typeof existingUser }).user = existingUser;
      }
    }

    return this.toEntity(order);
  }

  /** Update order status */
  async updateStatus(
    id: string,
    status: OrderEntity['status'],
  ): Promise<OrderEntity> {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (status === 'CANCELLED' && existing.status === 'PENDING') {
      const transitionResult = await this.prisma.order.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      if (transitionResult.count > 0) {
        await this.restoreResources(id, existing.couponId);
      }
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: { product: true, variant: true, checkoutAnswers: true },
        },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    try {
      await this.redisService.delPattern('admin:dashboard:snapshot:*');
    } catch (err) {
      console.error('Redis delPattern error during updateStatus:', err);
    }

    return this.toEntity(order);
  }

  /**
   * Generate a branded order ID with APM prefix + 8 random uppercase alphanumeric chars.
   * Example: APM4R5K7N2X1
   */
  private static generateOrderId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'APM';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /** Create a new order */
  async create(data: Partial<OrderEntity>): Promise<OrderEntity> {
    const order = await this.prisma.order.create({
      data: {
        id: PrismaOrderRepository.generateOrderId(),
        userId: data.userId ?? null,
        customerEmail: data.customerEmail ?? '',
        customerWhatsapp: data.customerWhatsapp ?? '',
        totalAmount: new Prisma.Decimal(data.totalAmount ?? 0),
        discountAmount: new Prisma.Decimal(data.discountAmount ?? 0),
        finalAmount: new Prisma.Decimal(data.finalAmount ?? 0),
        status: data.status ?? 'PENDING',
        paymentGatewayInvoiceId: data.paymentGatewayInvoiceId,
        paymentGatewayInvoiceUrl: data.paymentGatewayInvoiceUrl,
        paymentGatewayExpiresAt: data.paymentGatewayExpiresAt,
        paymentGatewayRequestId: data.paymentGatewayRequestId,
        paymentMethodType: data.paymentMethodType,
        paymentChannel: data.paymentChannel,
        paymentInstructions: data.paymentInstructions as Prisma.InputJsonValue,
        couponId: data.couponId,
      },
      include: {
        items: {
          include: { product: true, variant: true, checkoutAnswers: true },
        },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    try {
      await this.redisService.delPattern('admin:dashboard:snapshot:*');
    } catch (err) {
      console.error('Redis delPattern error during create:', err);
    }

    this.eventEmitter.emit('order.created', { orderId: order.id });

    return this.toEntity(order);
  }

  /** Update an existing order */
  async update(id: string, data: Partial<OrderEntity>): Promise<OrderEntity> {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (data.status === 'CANCELLED' && existing.status === 'PENDING') {
      const transitionResult = await this.prisma.order.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      if (transitionResult.count > 0) {
        await this.restoreResources(id, existing.couponId);
      }
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.paymentGatewayInvoiceId !== undefined && {
          paymentGatewayInvoiceId: data.paymentGatewayInvoiceId,
        }),
        ...(data.paymentGatewayInvoiceUrl !== undefined && {
          paymentGatewayInvoiceUrl: data.paymentGatewayInvoiceUrl,
        }),
        ...(data.paymentGatewayExpiresAt !== undefined && {
          paymentGatewayExpiresAt: data.paymentGatewayExpiresAt,
        }),
        ...(data.paymentGatewayRequestId !== undefined && {
          paymentGatewayRequestId: data.paymentGatewayRequestId,
        }),
        ...(data.paymentMethodType !== undefined && {
          paymentMethodType: data.paymentMethodType,
        }),
        ...(data.paymentChannel !== undefined && {
          paymentChannel: data.paymentChannel,
        }),
        ...(data.paymentInstructions !== undefined && {
          paymentInstructions:
            data.paymentInstructions as Prisma.InputJsonValue,
        }),
        ...(data.paymentProof !== undefined && {
          paymentProof: data.paymentProof,
        }),
        ...(data.deliveredAt !== undefined && {
          deliveredAt: data.deliveredAt,
        }),
        ...(data.deliveredById !== undefined && {
          deliveredById: data.deliveredById,
        }),
        ...(data.deliveryNote !== undefined && {
          deliveryNote: data.deliveryNote,
        }),
      },
      include: PrismaOrderRepository.orderInclude,
    });

    try {
      await this.redisService.delPattern('admin:dashboard:snapshot:*');
    } catch (err) {
      console.error('Redis delPattern error during update:', err);
    }

    this.eventEmitter.emit('order.updated', { orderId: order.id });

    return this.toEntity(order);
  }

  /** Delete an order by ID */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    await this.prisma.order.delete({ where: { id } });

    try {
      await this.redisService.delPattern('admin:dashboard:snapshot:*');
    } catch (err) {
      console.error('Redis delPattern error during delete:', err);
    }
  }

  /** Find multiple orders by their IDs */
  async findByIds(ids: string[]): Promise<OrderEntity[]> {
    if (ids.length === 0) return [];
    const orders = await this.prisma.order.findMany({
      where: { id: { in: ids } },
      include: PrismaOrderRepository.orderInclude,
    });
    return orders.map((o) => this.toEntity(o));
  }

  private async restoreResources(
    orderId: string,
    couponId: string | null,
  ): Promise<void> {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      if (item.variantId) {
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      } else {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }

    if (couponId) {
      await this.prisma.coupon.updateMany({
        where: { id: couponId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
  }

  private async processAutoExpirations(): Promise<void> {
    const now = Date.now();
    const cooldownMs = 30000; // 30 seconds cooldown
    if (now - PrismaOrderRepository.lastExpirationCheck < cooldownMs) {
      return;
    }
    PrismaOrderRepository.lastExpirationCheck = now;

    try {
      const gracePeriodMs = 5 * 60 * 1000; // 5 minutes grace period
      const threshold = new Date(now - gracePeriodMs);

      const expiredOrders = await this.prisma.order.findMany({
        where: {
          status: 'PENDING',
          paymentGatewayExpiresAt: {
            lt: threshold,
          },
        },
        select: {
          id: true,
          couponId: true,
        },
      });

      for (const order of expiredOrders) {
        const transitionResult = await this.prisma.order.updateMany({
          where: { id: order.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });

        if (transitionResult.count > 0) {
          await this.restoreResources(order.id, order.couponId);
        }
      }
    } catch (err) {
      console.error('Failed to run auto-expirations in background:', err);
    }
  }

  /** Map Prisma Order to domain entity */
  private toEntity(order: Record<string, unknown>): OrderEntity {
    const dbOrder = order as {
      user?: { id: string; email: string; name: string } | null;
      deliveredBy?: { id: string; email: string; name: string } | null;
    };
    const o = order as {
      id: string;
      userId: string | null;
      customerEmail: string;
      customerWhatsapp: string;
      totalAmount: Prisma.Decimal;
      discountAmount: Prisma.Decimal;
      finalAmount: Prisma.Decimal;
      status: string;
      paymentGatewayInvoiceId: string | null;
      paymentGatewayInvoiceUrl: string | null;
      paymentGatewayExpiresAt: Date | null;
      paymentGatewayRequestId: string | null;
      paymentMethodType: string | null;
      paymentChannel: string | null;
      paymentInstructions: Prisma.JsonValue | null;
      paymentProof: string | null;
      deliveredAt: Date | null;
      deliveredById: string | null;
      deliveryNote: string | null;
      couponId: string | null;
      coupon?: { code: string } | null;
      createdAt: Date;
      updatedAt: Date;
      items?: (NonNullable<OrderEntity['items']>[number] & {
        product?: { name: string } | null;
        variant?: { name: string } | null;
      })[];
    };
    return {
      id: o.id,
      userId: o.userId,
      customerEmail: o.customerEmail ?? '',
      customerWhatsapp: o.customerWhatsapp ?? '',
      totalAmount: Number(o.totalAmount),
      discountAmount: Number(o.discountAmount),
      finalAmount: Number(o.finalAmount),
      status: o.status as OrderEntity['status'],
      paymentGatewayInvoiceId: o.paymentGatewayInvoiceId,
      paymentGatewayInvoiceUrl: o.paymentGatewayInvoiceUrl,
      paymentGatewayExpiresAt: o.paymentGatewayExpiresAt,
      paymentGatewayRequestId: o.paymentGatewayRequestId,
      paymentMethodType: o.paymentMethodType,
      paymentChannel: o.paymentChannel,
      paymentInstructions:
        o.paymentInstructions &&
        typeof o.paymentInstructions === 'object' &&
        !Array.isArray(o.paymentInstructions)
          ? o.paymentInstructions
          : null,
      paymentProof: o.paymentProof,
      deliveredAt: o.deliveredAt,
      deliveredById: o.deliveredById,
      deliveredBy: dbOrder.deliveredBy
        ? {
            id: dbOrder.deliveredBy.id,
            email: dbOrder.deliveredBy.email,
            name: dbOrder.deliveredBy.name,
          }
        : null,
      user: dbOrder.user
        ? {
            id: dbOrder.user.id,
            email: dbOrder.user.email,
            name: dbOrder.user.name,
          }
        : null,
      deliveryNote: o.deliveryNote,
      couponId: o.couponId,
      couponCode: o.coupon?.code ?? null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      items: o.items
        ? o.items.map((item) => ({
            id: item.id,
            orderId: item.orderId,
            productId: item.productId,
            variantId: item.variantId,
            couponId: item.couponId,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            subtotal: Number(item.subtotal),
            productName: item.product?.name ?? null,
            variantName: item.variant?.name ?? null,
            checkoutAnswers: item.checkoutAnswers
              ? item.checkoutAnswers.map((ans) => ({
                  id: ans.id,
                  orderItemId: ans.orderItemId,
                  checkoutFieldId: ans.checkoutFieldId,
                  label: ans.label,
                  value: ans.value,
                  createdAt: ans.createdAt,
                  updatedAt: ans.updatedAt,
                }))
              : [],
          }))
        : undefined,
    };
  }
}
