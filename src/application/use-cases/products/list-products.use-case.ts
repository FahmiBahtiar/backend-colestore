import { Inject, Injectable } from '@nestjs/common';
import { IProductRepository } from '../../../domain/repositories';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/tokens';
import { ListProductsInputDto, ProductResponseDto } from '../../dtos';
import { ProductMapper } from '../../mappers';

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  /** List active products with optional category filtering. */
  async execute(input: ListProductsInputDto = {}): Promise<{
    items: ProductResponseDto[];
    total: number;
  }> {
    const result = await this.productRepository.findActiveProducts(input);
    return {
      items: result.items.map((product) => ProductMapper.toResponse(product)),
      total: result.total,
    };
  }
}
