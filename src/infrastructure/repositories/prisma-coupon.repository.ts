import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ICouponRepository,
  CouponEntity,
} from '../../domain/repositories/coupon.repository';
import {
  PaginatedResult,
  buildPaginatedResult,
} from '../../common/utils/pagination';

/**
 * Concrete Prisma implementation of ICouponRepository.
 * Handles all Coupon-related database operations.
 */
@Injectable()
export class PrismaCouponRepository implements ICouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Find a coupon by ID */
  async findById(id: string): Promise<CouponEntity | null> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    return coupon ? this.toEntity(coupon) : null;
  }

  /** Find a coupon by code */
  async findByCode(code: string): Promise<CouponEntity | null> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    return coupon ? this.toEntity(coupon) : null;
  }

  /** Find all coupons with pagination */
  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResult<CouponEntity>> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const [coupons, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count(),
    ]);

    return buildPaginatedResult(
      coupons.map((c) => this.toEntity(c)),
      total,
      Math.floor(skip / take) + 1,
      take,
    );
  }

  /** Increment the used count of a coupon (atomic) */
  async incrementUsedCount(id: string): Promise<void> {
    await this.prisma.coupon.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }

  /** Create a new coupon */
  async create(data: Partial<CouponEntity>): Promise<CouponEntity> {
    const coupon = await this.prisma.coupon.create({
      data: {
        code: data.code!.toUpperCase(),
        discountType: data.discountType!,
        discountValue: new Prisma.Decimal(data.discountValue ?? 0),
        minOrderAmount: new Prisma.Decimal(data.minOrderAmount ?? 0),
        maxUses: data.maxUses,
        expiresAt: data.expiresAt,
        isActive: data.isActive ?? true,
      },
    });
    return this.toEntity(coupon);
  }

  /** Update an existing coupon */
  async update(id: string, data: Partial<CouponEntity>): Promise<CouponEntity> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code.toUpperCase() }),
        ...(data.discountType !== undefined && {
          discountType: data.discountType,
        }),
        ...(data.discountValue !== undefined && {
          discountValue: new Prisma.Decimal(data.discountValue),
        }),
        ...(data.minOrderAmount !== undefined && {
          minOrderAmount: new Prisma.Decimal(data.minOrderAmount),
        }),
        ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return this.toEntity(coupon);
  }

  /** Delete a coupon by ID */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    await this.prisma.coupon.delete({ where: { id } });
  }

  /** Map Prisma Coupon to domain entity */
  private toEntity(coupon: {
    id: string;
    code: string;
    discountType: string;
    discountValue: Prisma.Decimal;
    minOrderAmount: Prisma.Decimal;
    maxUses: number | null;
    usedCount: number;
    expiresAt: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CouponEntity {
    return {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType as CouponEntity['discountType'],
      discountValue: Number(coupon.discountValue),
      minOrderAmount: Number(coupon.minOrderAmount),
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      expiresAt: coupon.expiresAt,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }
}
