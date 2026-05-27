import { Inject, Injectable, Logger } from '@nestjs/common';
import { IProductRepository } from '../../../domain/repositories';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/tokens';
import { ListProductsInputDto, ProductResponseDto } from '../../dtos';
import { ProductMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class ListProductsUseCase {
  private readonly logger = new Logger(ListProductsUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly minioService: MinioService,
  ) {}

  /** List active products with optional category filtering. */
  async execute(input: ListProductsInputDto = {}): Promise<{
    items: ProductResponseDto[];
    total: number;
  }> {
    const result = await this.productRepository.findActiveProducts(input);

    const items = await Promise.all(
      result.items.map(async (product) => {
        let imageUrl: string | null = null;
        if (product.imageKey) {
          try {
            imageUrl = await this.minioService.getPresignedUrl(
              product.imageKey,
            );
          } catch (err) {
            const error = err as Error;
            this.logger.error(
              `Failed to resolve presigned URL for product list (ID: ${product.id}, imageKey: ${product.imageKey}): ${error.message}`,
              error.stack,
            );
          }
        }
        return ProductMapper.toResponse(product, imageUrl);
      }),
    );

    return {
      items,
      total: result.total,
    };
  }
}
