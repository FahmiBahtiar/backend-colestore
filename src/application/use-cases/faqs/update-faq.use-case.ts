import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IFaqRepository } from '../../../domain/repositories';
import { FAQ_REPOSITORY } from '../../../domain/repositories/tokens';
import { FaqResponseDto, UpdateFaqInputDto } from '../../dtos';
import { FaqMapper } from '../../mappers';

@Injectable()
export class UpdateFaqUseCase {
  constructor(
    @Inject(FAQ_REPOSITORY)
    private readonly faqRepository: IFaqRepository,
  ) {}

  /** Update an FAQ */
  async execute(input: UpdateFaqInputDto): Promise<FaqResponseDto> {
    const existing = await this.faqRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException(`FAQ with ID ${input.id} not found`);
    }

    const faq = await this.faqRepository.update(input.id, input);
    return FaqMapper.toResponse(faq);
  }
}
