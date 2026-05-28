import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  IBannerRepository,
  BannerEntity,
} from '../../domain/repositories/banner.repository';
import {
  PaginatedResult,
  buildPaginatedResult,
} from '../../common/utils/pagination';

/**
 * Concrete Prisma implementation of IBannerRepository.
 * Handles all Banner-related database operations.
 */
@Injectable()
export class PrismaBannerRepository implements IBannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Find a Banner by ID */
  async findById(id: string): Promise<BannerEntity | null> {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    return banner ?? null;
  }

  /** Find all Banners with optional pagination and filters */
  async findAll(params?: {
    skip?: number;
    take?: number;
    isActive?: boolean;
  }): Promise<PaginatedResult<BannerEntity>> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 100; // default large take for banners as there are typically few

    const whereClause: Prisma.BannerWhereInput = {};
    if (params?.isActive !== undefined) {
      whereClause.isActive = params.isActive;
    }

    const [banners, total] = await this.prisma.$transaction([
      this.prisma.banner.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.banner.count({ where: whereClause }),
    ]);

    return buildPaginatedResult(
      banners,
      total,
      Math.floor(skip / take) + 1,
      take,
    );
  }

  /** Create a new Banner */
  async create(data: Partial<BannerEntity>): Promise<BannerEntity> {
    return this.prisma.banner.create({
      data: {
        title: data.title ?? null,
        subtitle: data.subtitle ?? null,
        buttonText: data.buttonText ?? null,
        buttonLink: data.buttonLink ?? null,
        imageKey: data.imageKey!,
        isActive: data.isActive ?? true,
        order: data.order ?? 0,
      },
    });
  }

  /** Update an existing Banner */
  async update(id: string, data: Partial<BannerEntity>): Promise<BannerEntity> {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
        ...(data.buttonText !== undefined && { buttonText: data.buttonText }),
        ...(data.buttonLink !== undefined && { buttonLink: data.buttonLink }),
        ...(data.imageKey !== undefined && { imageKey: data.imageKey }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  /** Delete a Banner by ID */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    await this.prisma.banner.delete({ where: { id } });
  }
}
