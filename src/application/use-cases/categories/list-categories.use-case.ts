import { Inject, Injectable } from '@nestjs/common';
import { ICategoryRepository } from '../../../domain/repositories';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/tokens';
import { CategoryResponseDto, ListCategoriesInputDto } from '../../dtos';
import { CategoryMapper } from '../../mappers';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  /** List categories with pagination. */
  async execute(input: ListCategoriesInputDto = {}): Promise<{
    items: CategoryResponseDto[];
    total: number;
  }> {
    const result = await this.categoryRepository.findAll(input);
    return {
      items: result.items.map((category) =>
        CategoryMapper.toResponse(category),
      ),
      total: result.meta.total,
    };
  }
}
