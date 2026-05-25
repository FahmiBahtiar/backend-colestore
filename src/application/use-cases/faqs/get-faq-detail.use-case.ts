import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IFaqRepository } from '../../../domain/repositories';
import { FAQ_REPOSITORY } from '../../../domain/repositories/tokens';
import { FaqResponseDto } from '../../dtos';
import { FaqMapper } from '../../mappers';

@Injectable()
export class GetFaqDetailUseCase {
  constructor(
    @Inject(FAQ_REPOSITORY)
    private readonly faqRepository: IFaqRepository,
  ) {}

  /** Get an FAQ detail */
  async execute(id: string): Promise<FaqResponseDto> {
    const faq = await this.faqRepository.findById(id);
    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }

    return FaqMapper.toResponse(faq);
  }
}
