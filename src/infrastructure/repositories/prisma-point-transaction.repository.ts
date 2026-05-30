import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IPointTransactionRepository,
  PointTransactionEntity,
} from '../../domain/repositories/point-transaction.repository';

@Injectable()
export class PrismaPointTransactionRepository implements IPointTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<PointTransactionEntity, 'id' | 'createdAt'>,
  ): Promise<PointTransactionEntity> {
    const record = await this.prisma.pointTransaction.create({
      data: {
        userId: data.userId,
        orderId: data.orderId,
        type: data.type,
        points: data.points,
        amount: data.amount,
        couponId: data.couponId,
      },
    });
    return this.toEntity(record);
  }

  async findByUserId(
    userId: string,
    params?: { skip?: number; take?: number },
  ): Promise<{ items: PointTransactionEntity[]; total: number }> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 50;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.pointTransaction.findMany({
        where: { userId },
        skip,
        take,
        include: {
          coupon: {
            select: {
              code: true,
              usedCount: true,
              maxUses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pointTransaction.count({ where: { userId } }),
    ]);

    return {
      items: records.map((r) => this.toEntity(r)),
      total,
    };
  }

  async findByOrderId(orderId: string): Promise<PointTransactionEntity[]> {
    const records = await this.prisma.pointTransaction.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async getTotalPointsByUserId(userId: string): Promise<number> {
    const earned = await this.prisma.pointTransaction.aggregate({
      where: { userId, type: 'EARNED' },
      _sum: { points: true },
    });
    const spent = await this.prisma.pointTransaction.aggregate({
      where: { userId, type: { in: ['REFUNDED', 'REDEEMED'] } },
      _sum: { points: true },
    });

    const totalEarned = earned._sum.points ?? 0;
    const totalSpent = spent._sum.points ?? 0;
    return Math.max(0, totalEarned - totalSpent);
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    type?: 'EARNED' | 'REFUNDED' | 'REDEEMED';
  }): Promise<{ items: PointTransactionEntity[]; total: number }> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 50;
    const where = params?.type ? { type: params.type } : {};

    const [records, total] = await this.prisma.$transaction([
      this.prisma.pointTransaction.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { name: true, email: true } },
          coupon: {
            select: {
              code: true,
              usedCount: true,
              maxUses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pointTransaction.count({ where }),
    ]);

    return {
      items: records.map((r) =>
        this.toEntity({
          ...r,
          userName: r.user?.name ?? 'Guest',
          userEmail: r.user?.email ?? '',
        }),
      ),
      total,
    };
  }

  private toEntity(record: {
    id: string;
    userId: string;
    orderId: string | null;
    type: string;
    points: number;
    amount: unknown;
    createdAt: Date;
    couponId?: string | null;
    coupon?: {
      code: string;
      usedCount: number;
      maxUses: number | null;
    } | null;
    userName?: string | null;
    userEmail?: string | null;
  }): PointTransactionEntity {
    return {
      id: record.id,
      userId: record.userId,
      orderId: record.orderId,
      type: record.type as PointTransactionEntity['type'],
      points: record.points,
      amount: Number(record.amount),
      createdAt: record.createdAt,
      couponId: record.couponId ?? null,
      coupon: record.coupon
        ? {
            code: record.coupon.code,
            usedCount: record.coupon.usedCount,
            maxUses: record.coupon.maxUses,
          }
        : null,
      userName: record.userName ?? null,
      userEmail: record.userEmail ?? null,
    };
  }
}
