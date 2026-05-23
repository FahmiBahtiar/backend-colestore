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

  /** Find an order by ID with relations */
  async findById(id: string): Promise<OrderEntity | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true, variant: true },
        },
        user: { select: { id: true, email: true, name: true } },
        coupon: true,
      },
    });
    return order ? this.toEntity(order) : null;
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
        include: {
          items: { include: { product: true, variant: true } },
          user: { select: { id: true, email: true, name: true } },
        },
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
          items: { include: { product: true, variant: true } },
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

  /** Find an order by Xendit invoice ID */
  async findByXenditInvoiceId(invoiceId: string): Promise<OrderEntity | null> {
    const order = await this.prisma.order.findFirst({
      where: { xenditInvoiceId: invoiceId },
      include: {
        items: { include: { product: true, variant: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    return order ? this.toEntity(order) : null;
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
        items: { include: { product: true, variant: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    return this.toEntity(order);
  }

  /** Create a new order */
  async create(data: Partial<OrderEntity>): Promise<OrderEntity> {
    const order = await this.prisma.order.create({
      data: {
        userId: data.userId!,
        totalAmount: new Prisma.Decimal(data.totalAmount ?? 0),
        discountAmount: new Prisma.Decimal(data.discountAmount ?? 0),
        finalAmount: new Prisma.Decimal(data.finalAmount ?? 0),
        status: data.status ?? 'PENDING',
        xenditInvoiceId: data.xenditInvoiceId,
        xenditInvoiceUrl: data.xenditInvoiceUrl,
        xenditInvoiceExpiresAt: data.xenditInvoiceExpiresAt,
        couponId: data.couponId,
      },
      include: {
        items: { include: { product: true, variant: true } },
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
        ...(data.xenditInvoiceId !== undefined && {
          xenditInvoiceId: data.xenditInvoiceId,
        }),
        ...(data.xenditInvoiceUrl !== undefined && {
          xenditInvoiceUrl: data.xenditInvoiceUrl,
        }),
        ...(data.xenditInvoiceExpiresAt !== undefined && {
          xenditInvoiceExpiresAt: data.xenditInvoiceExpiresAt,
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
      include: {
        items: { include: { product: true, variant: true } },
        user: { select: { id: true, email: true, name: true } },
      },
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
    const o = order as {
      id: string;
      userId: string;
      totalAmount: Prisma.Decimal;
      discountAmount: Prisma.Decimal;
      finalAmount: Prisma.Decimal;
      status: string;
      xenditInvoiceId: string | null;
      xenditInvoiceUrl: string | null;
      xenditInvoiceExpiresAt: Date | null;
      paymentProof: string | null;
      deliveredAt: Date | null;
      deliveredById: string | null;
      deliveryNote: string | null;
      couponId: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
    return {
      id: o.id,
      userId: o.userId,
      totalAmount: Number(o.totalAmount),
      discountAmount: Number(o.discountAmount),
      finalAmount: Number(o.finalAmount),
      status: o.status as OrderEntity['status'],
      xenditInvoiceId: o.xenditInvoiceId,
      xenditInvoiceUrl: o.xenditInvoiceUrl,
      xenditInvoiceExpiresAt: o.xenditInvoiceExpiresAt,
      paymentProof: o.paymentProof,
      deliveredAt: o.deliveredAt,
      deliveredById: o.deliveredById,
      deliveryNote: o.deliveryNote,
      couponId: o.couponId,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }
}
