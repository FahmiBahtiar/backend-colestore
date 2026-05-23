import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IProductRepository } from '../../../domain/repositories';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/tokens';
import { ProductResponseDto } from '../../dtos';
import { ProductMapper } from '../../mappers';

@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  /** Retrieve one product by id. */
  async execute(id: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return ProductMapper.toResponse(product);
  }
}
