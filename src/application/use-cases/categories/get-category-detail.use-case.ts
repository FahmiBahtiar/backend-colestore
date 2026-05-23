import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/tokens';
import { CategoryResponseDto } from '../../dtos';
import { CategoryMapper } from '../../mappers';

@Injectable()
export class GetCategoryDetailUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  /** Retrieve one category by id. */
  async execute(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return CategoryMapper.toResponse(category);
  }
}
