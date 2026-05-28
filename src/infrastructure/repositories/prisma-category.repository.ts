import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ICategoryRepository,
  CategoryEntity,
} from '../../domain/repositories/category.repository';
import {
  PaginatedResult,
  buildPaginatedResult,
} from '../../common/utils/pagination';

/**
 * Concrete Prisma implementation of ICategoryRepository.
 * Handles all Category-related database operations.
 */
@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Find a category by ID */
  async findById(id: string): Promise<CategoryEntity | null> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    return category ?? null;
  }

  /** Find a category by slug */
  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    return category ?? null;
  }

  /** Find all categories with pagination */
  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResult<CategoryEntity>> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count(),
    ]);

    return buildPaginatedResult(
      categories,
      total,
      Math.floor(skip / take) + 1,
      take,
    );
  }

  /** Create a new category */
  async create(data: Partial<CategoryEntity>): Promise<CategoryEntity> {
    return this.prisma.category.create({
      data: {
        name: data.name!,
        slug: data.slug!,
        imageKey: data.imageKey,
      },
    });
  }

  /** Update an existing category */
  async update(
    id: string,
    data: Partial<CategoryEntity>,
  ): Promise<CategoryEntity> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.imageKey !== undefined && { imageKey: data.imageKey }),
      },
    });
  }

  /** Delete a category by ID */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    await this.prisma.category.delete({ where: { id } });
  }
}
