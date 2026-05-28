import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/tokens';
import { CategoryResponseDto, UpdateCategoryInputDto } from '../../dtos';
import { CategoryMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class UpdateCategoryUseCase {
  private readonly logger = new Logger(UpdateCategoryUseCase.name);

  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    private readonly minioService: MinioService,
  ) {}

  /** Update category fields while keeping slug unique. */
  async execute(input: UpdateCategoryInputDto): Promise<CategoryResponseDto> {
    const existing = await this.categoryRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugOwner = await this.categoryRepository.findBySlug(input.slug);
      if (slugOwner) {
        throw new ConflictException('Category slug already exists');
      }
    }

    const updated = await this.categoryRepository.update(input.id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.imageKey !== undefined && { imageKey: input.imageKey }),
    });

    let imageUrl: string | null = null;
    if (updated.imageKey) {
      try {
        imageUrl = await this.minioService.getPresignedUrl(updated.imageKey);
      } catch (err) {
        const error = err as Error;
        this.logger.error(
          `Failed to resolve presigned URL for category image ${updated.imageKey}: ${error.message}`,
          error.stack,
        );
      }
    }

    return CategoryMapper.toResponse(updated, imageUrl);
  }
}
