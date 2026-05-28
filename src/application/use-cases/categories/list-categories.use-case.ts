import { Inject, Injectable, Logger } from '@nestjs/common';
import { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/tokens';
import { CategoryResponseDto, ListCategoriesInputDto } from '../../dtos';
import { CategoryMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class ListCategoriesUseCase {
  private readonly logger = new Logger(ListCategoriesUseCase.name);

  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    private readonly minioService: MinioService,
  ) {}

  /** List categories with pagination. */
  async execute(input: ListCategoriesInputDto = {}): Promise<{
    items: CategoryResponseDto[];
    total: number;
  }> {
    const result = await this.categoryRepository.findAll(input);

    const items = await Promise.all(
      result.items.map(async (category) => {
        let imageUrl: string | null = null;
        if (category.imageKey) {
          try {
            imageUrl = await this.minioService.getPresignedUrl(
              category.imageKey,
            );
          } catch (err) {
            const error = err as Error;
            this.logger.error(
              `Failed to resolve presigned URL for category list (ID: ${category.id}, imageKey: ${category.imageKey}): ${error.message}`,
              error.stack,
            );
          }
        }
        return CategoryMapper.toResponse(category, imageUrl);
      }),
    );

    return {
      items,
      total: result.meta.total,
    };
  }
}
