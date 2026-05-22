import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProductVariant } from '../../../domain/entities';
import { IProductRepository } from '../../../domain/repositories';
import {
  PRODUCT_REPOSITORY,
  PRODUCT_VARIANT_REPOSITORY,
} from '../../../domain/repositories/tokens';
import {
  IProductVariantRepositoryPort,
  ProductVariantRecord,
} from '../../interfaces';
import {
  CreateProductVariantInputDto,
  ProductVariantResponseDto,
} from '../../dtos';
import { ProductMapper } from '../../mappers';

@Injectable()
export class CreateProductVariantUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepositoryPort,
  ) {}

  /** Create a product variant for products configured to use variants. */
  async execute(
    input: CreateProductVariantInputDto,
  ): Promise<ProductVariantResponseDto> {
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!product.hasVariants) {
      throw new NotFoundException('Product does not support variants');
    }

    const now = new Date();
    const variant = ProductVariant.create({
      id: 'new-variant',
      name: input.name,
      price: input.price ?? null,
      stockQuantity: input.stockQuantity ?? null,
      productId: input.productId,
      createdAt: now,
      updatedAt: now,
    });

    const created = await this.variantRepository.create(
      this.toCreateData(variant.toPrimitives()),
    );

    return ProductMapper.variantToResponse(created);
  }

  private toCreateData(
    variant: ProductVariantRecord,
  ): Omit<ProductVariantRecord, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: variant.name,
      price: variant.price,
      stockQuantity: variant.stockQuantity,
      productId: variant.productId,
    };
  }
}
