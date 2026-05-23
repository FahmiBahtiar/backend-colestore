import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/tokens';
import { CategoryResponseDto, UpdateCategoryInputDto } from '../../dtos';
import { CategoryMapper } from '../../mappers';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
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
    });
    return CategoryMapper.toResponse(updated);
  }
}
