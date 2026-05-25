import { Inject, Injectable } from '@nestjs/common';
import { IFaqRepository } from '../../../domain/repositories';
import { FAQ_REPOSITORY } from '../../../domain/repositories/tokens';
import { FaqResponseDto, ListFaqsInputDto } from '../../dtos';
import { FaqMapper } from '../../mappers';
import { PaginatedResult } from '../../../common/utils/pagination';

@Injectable()
export class ListFaqsUseCase {
  constructor(
    @Inject(FAQ_REPOSITORY)
    private readonly faqRepository: IFaqRepository,
  ) {}

  /** List FAQs with optional filters and pagination */
  async execute(
    input?: ListFaqsInputDto,
  ): Promise<PaginatedResult<FaqResponseDto>> {
    const result = await this.faqRepository.findAll({
      skip: input?.skip,
      take: input?.take,
      isActive: input?.isActive,
      search: input?.search,
    });

    return {
      ...result,
      items: result.items.map((faq) => FaqMapper.toResponse(faq)),
    };
  }
}
