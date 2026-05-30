import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IProductRepository } from '../../../domain/repositories';
import {
  PRODUCT_REPOSITORY,
  PRODUCT_VARIANT_REPOSITORY,
} from '../../../domain/repositories/tokens';
import { IProductVariantRepositoryPort } from '../../interfaces';
import { ProductVariantResponseDto } from '../../dtos';
import { ProductMapper } from '../../mappers';

@Injectable()
export class GetProductVariantsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepositoryPort,
  ) {}

  /** Retrieve all variants for a specific product. */
  async execute(productId: string): Promise<ProductVariantResponseDto[]> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variants = await this.variantRepository.findByProductId(productId);
    return variants.map((v) => ProductMapper.variantToResponse(v));
  }
}
