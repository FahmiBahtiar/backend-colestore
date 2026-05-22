import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ProductVariant entity interface for the repository.
 */
export interface ProductVariantEntity {
  id: string;
  name: string;
  price: number | null;
  stockQuantity: number | null;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ProductVariant repository interface — domain layer contract.
 */
export interface IProductVariantRepository {
  findById(id: string): Promise<ProductVariantEntity | null>;
  findByProductId(productId: string): Promise<ProductVariantEntity[]>;
  create(
    data: Omit<ProductVariantEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ProductVariantEntity>;
  update(
    id: string,
    data: Partial<ProductVariantEntity>,
  ): Promise<ProductVariantEntity>;
  delete(id: string): Promise<void>;
}

/**
 * Concrete Prisma implementation of IProductVariantRepository.
 */
@Injectable()
export class PrismaProductVariantRepository implements IProductVariantRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Find a variant by ID */
  async findById(id: string): Promise<ProductVariantEntity | null> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
    });
    return variant ? this.toEntity(variant) : null;
  }

  /** Find all variants for a product */
  async findByProductId(productId: string): Promise<ProductVariantEntity[]> {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
    return variants.map((v) => this.toEntity(v));
  }

  /** Create a new product variant */
  async create(
    data: Omit<ProductVariantEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ProductVariantEntity> {
    const variant = await this.prisma.productVariant.create({
      data: {
        name: data.name,
        price: data.price !== null ? new Prisma.Decimal(data.price) : null,
        stockQuantity: data.stockQuantity,
        productId: data.productId,
      },
    });
    return this.toEntity(variant);
  }

  /** Update an existing variant */
  async update(
    id: string,
    data: Partial<ProductVariantEntity>,
  ): Promise<ProductVariantEntity> {
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`ProductVariant with ID ${id} not found`);
    }

    const variant = await this.prisma.productVariant.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.price !== undefined && {
          price: data.price !== null ? new Prisma.Decimal(data.price) : null,
        }),
        ...(data.stockQuantity !== undefined && {
          stockQuantity: data.stockQuantity,
        }),
      },
    });
    return this.toEntity(variant);
  }

  /** Delete a variant by ID */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.productVariant.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`ProductVariant with ID ${id} not found`);
    }
    await this.prisma.productVariant.delete({ where: { id } });
  }

  /** Map Prisma ProductVariant to domain entity */
  private toEntity(variant: {
    id: string;
    name: string;
    price: Prisma.Decimal | null;
    stockQuantity: number | null;
    productId: string;
    createdAt: Date;
    updatedAt: Date;
  }): ProductVariantEntity {
    return {
      id: variant.id,
      name: variant.name,
      price: variant.price !== null ? Number(variant.price) : null,
      stockQuantity: variant.stockQuantity,
      productId: variant.productId,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  }
}
