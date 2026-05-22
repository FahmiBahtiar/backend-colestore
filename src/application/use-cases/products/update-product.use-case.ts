import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '../../../domain/entities';
import {
  IProductRepository,
  ProductEntity,
} from '../../../domain/repositories';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/tokens';
import { ProductResponseDto, UpdateProductInputDto } from '../../dtos';
import { throwBadRequestForDomainError } from '../../errors';
import { ProductMapper } from '../../mappers';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  /** Update product details while preserving domain invariants. */
  async execute(input: UpdateProductInputDto): Promise<ProductResponseDto> {
    const existing = await this.productRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    try {
      Product.create({
        ...existing,
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        basePrice: input.basePrice ?? existing.basePrice,
        isActive: input.isActive ?? existing.isActive,
        stockQuantity: input.stockQuantity ?? existing.stockQuantity,
        digitalFileKey: input.digitalFileKey ?? existing.digitalFileKey,
        categoryId: input.categoryId ?? existing.categoryId,
      });
    } catch (error) {
      throwBadRequestForDomainError(error);
    }

    const updated = await this.productRepository.update(
      input.id,
      this.toUpdateData(input),
    );

    return ProductMapper.toResponse(updated);
  }

  private toUpdateData(input: UpdateProductInputDto): Partial<ProductEntity> {
    return {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.stockQuantity !== undefined && {
        stockQuantity: input.stockQuantity,
      }),
      ...(input.digitalFileKey !== undefined && {
        digitalFileKey: input.digitalFileKey,
      }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
    };
  }
}
