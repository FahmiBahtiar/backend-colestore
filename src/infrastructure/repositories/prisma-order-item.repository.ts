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
  checkoutAnswers?: {
    id: string;
    orderItemId: string;
    checkoutFieldId: string | null;
    label: string;
    value: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
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
    let count = 0;
    for (const item of items) {
      await this.prisma.orderItem.create({
        data: {
          orderId: item.orderId,
          productId: item.productId,
          variantId: item.variantId,
          couponId: item.couponId,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          subtotal: new Prisma.Decimal(item.subtotal),
          ...(item.checkoutAnswers && {
            checkoutAnswers: {
              create: item.checkoutAnswers.map((ans) => ({
                checkoutFieldId: ans.checkoutFieldId,
                label: ans.label,
                value: ans.value,
              })),
            },
          }),
        },
      });
      count++;
    }
    return count;
  }

  /** Find all items for an order */
  async findByOrderId(orderId: string): Promise<OrderItemEntity[]> {
    const items = await this.prisma.orderItem.findMany({
      where: { orderId },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        variant: { select: { id: true, name: true } },
        checkoutAnswers: true,
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
      checkoutAnswers: item.checkoutAnswers.map((ans) => ({
        id: ans.id,
        orderItemId: ans.orderItemId,
        checkoutFieldId: ans.checkoutFieldId,
        label: ans.label,
        value: ans.value,
        createdAt: ans.createdAt,
        updatedAt: ans.updatedAt,
      })),
    }));
  }
}
