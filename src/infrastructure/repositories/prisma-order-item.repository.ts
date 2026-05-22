import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * OrderItem entity interface.
 */
export interface OrderItemEntity {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  couponId: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * OrderItem repository interface — domain layer contract.
 */
export interface IOrderItemRepository {
  createMany(items: Omit<OrderItemEntity, 'id'>[]): Promise<number>;
  findByOrderId(orderId: string): Promise<OrderItemEntity[]>;
}

/**
 * Concrete Prisma implementation of IOrderItemRepository.
 */
@Injectable()
export class PrismaOrderItemRepository implements IOrderItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Bulk-create order items */
  async createMany(items: Omit<OrderItemEntity, 'id'>[]): Promise<number> {
    const result = await this.prisma.orderItem.createMany({
      data: items.map((item) => ({
        orderId: item.orderId,
        productId: item.productId,
        variantId: item.variantId,
        couponId: item.couponId,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        subtotal: new Prisma.Decimal(item.subtotal),
      })),
    });
    return result.count;
  }

  /** Find all items for an order */
  async findByOrderId(orderId: string): Promise<OrderItemEntity[]> {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        variant: { select: { id: true, name: true } },
      },
    });

    return items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      variantId: item.variantId,
      couponId: item.couponId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    }));
  }
}
