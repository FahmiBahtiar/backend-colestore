import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  IProductRepository,
  ProductEntity,
} from '../../domain/repositories/product.repository';
import {
  PaginatedResult,
  buildPaginatedResult,
} from '../../common/utils/pagination';

/**
 * Concrete Prisma implementation of IProductRepository.
 * Handles all Product-related database operations.
 */
@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Find a product by ID with category and variants */
  async findById(id: string): Promise<ProductEntity | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: true },
    });
    return product ? this.toEntity(product) : null;
  }

  /** Find a product by slug */
  async findBySlug(slug: string): Promise<ProductEntity | null> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { category: true, variants: true },
    });
    return product ? this.toEntity(product) : null;
  }

  /** Find all products with pagination */
  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResult<ProductEntity>> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        skip,
        take,
        include: { category: true, variants: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count(),
    ]);

    return buildPaginatedResult(
      products.map((p) => this.toEntity(p)),
      total,
      Math.floor(skip / take) + 1,
      take,
    );
  }

  /** Find active products with optional category filter */
  async findActiveProducts(params?: {
    skip?: number;
    take?: number;
    categoryId?: string;
  }): Promise<{ items: ProductEntity[]; total: number }> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(params?.categoryId && { categoryId: params.categoryId }),
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: { category: true, variants: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: products.map((p) => this.toEntity(p)),
      total,
    };
  }

  /** Create a new product */
  async create(data: Partial<ProductEntity>): Promise<ProductEntity> {
    const product = await this.prisma.product.create({
      data: {
        name: data.name!,
        slug: data.slug!,
        description: data.description,
        basePrice: new Prisma.Decimal(data.basePrice ?? 0),
        isActive: data.isActive ?? true,
        hasVariants: data.hasVariants ?? false,
        stockQuantity: data.stockQuantity,
        digitalFileKey: data.digitalFileKey,
        categoryId: data.categoryId,
        createdById: data.createdById!,
      },
      include: { category: true, variants: true },
    });
    return this.toEntity(product);
  }

  /** Update an existing product */
  async update(
    id: string,
    data: Partial<ProductEntity>,
  ): Promise<ProductEntity> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.basePrice !== undefined && {
          basePrice: new Prisma.Decimal(data.basePrice),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.hasVariants !== undefined && {
          hasVariants: data.hasVariants,
        }),
        ...(data.stockQuantity !== undefined && {
          stockQuantity: data.stockQuantity,
        }),
        ...(data.digitalFileKey !== undefined && {
          digitalFileKey: data.digitalFileKey,
        }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      },
      include: { category: true, variants: true },
    });
    return this.toEntity(product);
  }

  /** Delete a product by ID */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.prisma.product.delete({ where: { id } });
  }

  /** Map Prisma Product to domain entity */
  private toEntity(product: Record<string, unknown>): ProductEntity {
    const p = product as {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      basePrice: Prisma.Decimal;
      isActive: boolean;
      hasVariants: boolean;
      stockQuantity: number | null;
      digitalFileKey: string | null;
      categoryId: string | null;
      createdById: string;
      createdAt: Date;
      updatedAt: Date;
    };
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      basePrice: Number(p.basePrice),
      isActive: p.isActive,
      hasVariants: p.hasVariants,
      stockQuantity: p.stockQuantity,
      digitalFileKey: p.digitalFileKey,
      categoryId: p.categoryId,
      createdById: p.createdById,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
