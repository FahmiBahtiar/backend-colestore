import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IProductRepository,
  ProductEntity,
} from '../../../domain/repositories';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/tokens';
import { ListProductsInputDto, ProductResponseDto } from '../../dtos';
import { ProductMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';
import { MeilisearchService } from '../../../infrastructure/meilisearch';

@Injectable()
export class ListProductsUseCase {
  private readonly logger = new Logger(ListProductsUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly minioService: MinioService,
    private readonly meilisearch: MeilisearchService,
  ) {}

  /** List active products with optional category filtering. */
  async execute(input: ListProductsInputDto = {}): Promise<{
    items: ProductResponseDto[];
    total: number;
  }> {
    let productsList: ProductEntity[] = [];
    let totalCount = 0;

    const useSearch = !!input.search && input.search.trim().length > 0;

    if (useSearch) {
      // 1. Build Meilisearch dynamic search request parameters
      const filterArray: string[] = [];

      // Storefront search must always enforce isActive = true unless explicitly bypassed (e.g. admin searches)
      if (input.includeInactive !== true) {
        filterArray.push('isActive = true');
      }

      if (input.categoryId) {
        filterArray.push(`categoryId = "${input.categoryId}"`);
      }

      const take = Math.min(input.take || 20, 100);
      const skip = input.skip || 0;

      const msResult = await this.meilisearch.search<{ id: string }>(
        'products',
        input.search!,
        {
          filter: filterArray.join(' AND '),
          limit: take,
          offset: skip,
        },
      );

      if (msResult) {
        totalCount = msResult.total;

        // Retrieve dynamic entities while preserving sorted Meilisearch order
        if (msResult.hits.length > 0) {
          const productIds = msResult.hits.map((hit) => hit.id);
          const productsFromDb =
            await this.productRepository.findByIds(productIds);

          productsList = productIds
            .map((id) => productsFromDb.find((p) => p.id === id))
            .filter((p): p is ProductEntity => !!p);
        }
      } else {
        // MEILISEARCH DOWN: Trigger DB fallback!
        this.logger.warn(
          `Meilisearch is down. Reverting to database fallback capped query for: "${input.search}"`,
        );
        const cappedTake = Math.min(input.take || 20, 20); // strictly capped to 20 for database protection
        const fallbackResult = await this.productRepository.findActiveProducts({
          ...input,
          take: cappedTake,
        });
        productsList = fallbackResult.items;
        totalCount = fallbackResult.total;
      }
    } else {
      // Standard database path (no search query)
      const result = await this.productRepository.findActiveProducts(input);
      productsList = result.items;
      totalCount = result.total;
    }

    const items = await Promise.all(
      productsList.map(async (product) => {
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
      total: totalCount,
    };
  }
}
