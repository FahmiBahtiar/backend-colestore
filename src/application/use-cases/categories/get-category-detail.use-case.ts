import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/tokens';
import { CategoryResponseDto } from '../../dtos';
import { CategoryMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class GetCategoryDetailUseCase {
  private readonly logger = new Logger(GetCategoryDetailUseCase.name);

  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    private readonly minioService: MinioService,
  ) {}

  /** Retrieve one category by id. */
  async execute(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    let imageUrl: string | null = null;
    if (category.imageKey) {
      try {
        imageUrl = await this.minioService.getPresignedUrl(category.imageKey);
      } catch (err) {
        const error = err as Error;
        this.logger.error(
          `Failed to resolve presigned URL for category detail (ID: ${category.id}, imageKey: ${category.imageKey}): ${error.message}`,
          error.stack,
        );
      }
    }

    return CategoryMapper.toResponse(category, imageUrl);
  }
}
