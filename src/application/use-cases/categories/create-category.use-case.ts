import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/tokens';
import { CategoryResponseDto, CreateCategoryInputDto } from '../../dtos';
import { CategoryMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class CreateCategoryUseCase {
  private readonly logger = new Logger(CreateCategoryUseCase.name);

  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    private readonly minioService: MinioService,
  ) {}

  /** Create a category after enforcing unique slug. */
  async execute(input: CreateCategoryInputDto): Promise<CategoryResponseDto> {
    const existing = await this.categoryRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictException('Category slug already exists');
    }

    const category = await this.categoryRepository.create(input);

    let imageUrl: string | null = null;
    if (category.imageKey) {
      try {
        imageUrl = await this.minioService.getPresignedUrl(category.imageKey);
      } catch (err) {
        const error = err as Error;
        this.logger.error(
          `Failed to resolve presigned URL for category image ${category.imageKey}: ${error.message}`,
          error.stack,
        );
      }
    }

    return CategoryMapper.toResponse(category, imageUrl);
  }
}
