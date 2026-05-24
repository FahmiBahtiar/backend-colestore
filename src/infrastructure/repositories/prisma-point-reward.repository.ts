import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IPointRewardRepository,
  PointRewardEntity,
} from '../../domain/repositories/point-reward.repository';
import {
  PaginatedResult,
  buildPaginatedResult,
} from '../../common/utils/pagination';

@Injectable()
export class PrismaPointRewardRepository implements IPointRewardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PointRewardEntity | null> {
    const record = await this.prisma.pointReward.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResult<PointRewardEntity>> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.pointReward.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pointReward.count(),
    ]);

    return buildPaginatedResult(
      records.map((r) => this.toEntity(r)),
      total,
      Math.floor(skip / take) + 1,
      take,
    );
  }

  async findActive(): Promise<PointRewardEntity[]> {
    const now = new Date();
    const records = await this.prisma.pointReward.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { pointCost: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async create(data: Partial<PointRewardEntity>): Promise<PointRewardEntity> {
    const record = await this.prisma.pointReward.create({
      data: {
        name: data.name!,
        description: data.description ?? null,
        pointCost: data.pointCost!,
        discountType: data.discountType!,
        discountValue: data.discountValue!,
        minOrderAmount: data.minOrderAmount ?? 0,
        maxRedemptions: data.maxRedemptions ?? null,
        isActive: data.isActive ?? true,
        expiresAt: data.expiresAt ?? null,
      },
    });
    return this.toEntity(record);
  }

  async update(
    id: string,
    data: Partial<PointRewardEntity>,
  ): Promise<PointRewardEntity> {
    const existing = await this.prisma.pointReward.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Point reward with ID ${id} not found`);
    }

    const record = await this.prisma.pointReward.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.pointCost !== undefined && { pointCost: data.pointCost }),
        ...(data.discountType !== undefined && {
          discountType: data.discountType,
        }),
        ...(data.discountValue !== undefined && {
          discountValue: data.discountValue,
        }),
        ...(data.minOrderAmount !== undefined && {
          minOrderAmount: data.minOrderAmount,
        }),
        ...(data.maxRedemptions !== undefined && {
          maxRedemptions: data.maxRedemptions,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
      },
    });
    return this.toEntity(record);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.pointReward.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Point reward with ID ${id} not found`);
    }
    await this.prisma.pointReward.delete({ where: { id } });
  }

  async incrementRedeemedCount(id: string): Promise<void> {
    await this.prisma.pointReward.update({
      where: { id },
      data: { redeemedCount: { increment: 1 } },
    });
  }

  private toEntity(record: {
    id: string;
    name: string;
    description: string | null;
    pointCost: number;
    discountType: string;
    discountValue: unknown;
    minOrderAmount: unknown;
    maxRedemptions: number | null;
    redeemedCount: number;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PointRewardEntity {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      pointCost: record.pointCost,
      discountType: record.discountType as PointRewardEntity['discountType'],
      discountValue: Number(record.discountValue),
      minOrderAmount: Number(record.minOrderAmount),
      maxRedemptions: record.maxRedemptions,
      redeemedCount: record.redeemedCount,
      isActive: record.isActive,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
