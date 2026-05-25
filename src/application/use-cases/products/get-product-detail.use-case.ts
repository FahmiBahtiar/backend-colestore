import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IProductRepository } from '../../../domain/repositories';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/tokens';
import { ProductResponseDto } from '../../dtos';
import { ProductMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class GetProductDetailUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly minioService: MinioService,
  ) {}

  /** Retrieve one product by id. */
  async execute(id: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let imageUrl: string | null = null;
    if (product.imageKey) {
      try {
        imageUrl = await this.minioService.getPresignedUrl(product.imageKey);
      } catch (err) {
        console.error(
          'Failed to resolve presigned URL for product detail:',
          err,
        );
      }
    }

    return ProductMapper.toResponse(product, imageUrl);
  }
}
