import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  IOrderRepository,
  OrderEntity,
} from '../../domain/repositories/order.repository';
import {
  PaginatedResult,
  buildPaginatedResult,
} from '../../common/utils/pagination';

/**
 * Concrete Prisma implementation of IOrderRepository.
 * Handles all Order-related database operations.
 */
@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Find all orders with pagination */
  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResult<OrderEntity>> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        skip,
        take,
        include: PrismaOrderRepository.orderInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count(),
    ]);

    return buildPaginatedResult(
      orders.map((o) => this.toEntity(o)),
      total,
      Math.floor(skip / take) + 1,
      take,
    );
  }

  /** Find orders by user ID with pagination */
  async findByUserId(
    userId: string,
    params?: { skip?: number; take?: number },
  ): Promise<{ items: OrderEntity[]; total: number }> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const where: Prisma.OrderWhereInput = { userId };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          items: {
            include: { product: true, variant: true, checkoutAnswers: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((o) => this.toEntity(o)),
      total,
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
    return this.toEntity(order);
  }

  /** Create a new order */
  async create(data: Partial<OrderEntity>): Promise<OrderEntity> {
    const order = await this.prisma.order.create({
      data: {
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
    return this.toEntity(order);
  }

  /** Update an existing order */
  async update(id: string, data: Partial<OrderEntity>): Promise<OrderEntity> {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID ${id} not found`);
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
    return this.toEntity(order);
  }

  /** Delete an order by ID */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    await this.prisma.order.delete({ where: { id } });
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
