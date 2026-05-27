import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IProductRepository } from '../../../domain/repositories';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/tokens';
import { ProductResponseDto } from '../../dtos';
import { ProductMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class GetProductDetailUseCase {
  private readonly logger = new Logger(GetProductDetailUseCase.name);

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
        const error = err as Error;
        this.logger.error(
          `Failed to resolve presigned URL for product detail (ID: ${product.id}, imageKey: ${product.imageKey}): ${error.message}`,
          error.stack,
        );
      }
    }

    return ProductMapper.toResponse(product, imageUrl);
  }
}
