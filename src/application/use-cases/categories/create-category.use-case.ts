import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/tokens';
import { CategoryResponseDto, CreateCategoryInputDto } from '../../dtos';
import { CategoryMapper } from '../../mappers';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  /** Create a category after enforcing unique slug. */
  async execute(input: CreateCategoryInputDto): Promise<CategoryResponseDto> {
    const existing = await this.categoryRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictException('Category slug already exists');
    }

    const category = await this.categoryRepository.create(input);
    return CategoryMapper.toResponse(category);
  }
}
