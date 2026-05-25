import { Inject, Injectable } from '@nestjs/common';
import { IFaqRepository } from '../../../domain/repositories';
import { FAQ_REPOSITORY } from '../../../domain/repositories/tokens';
import { FaqResponseDto, CreateFaqInputDto } from '../../dtos';
import { FaqMapper } from '../../mappers';

@Injectable()
export class CreateFaqUseCase {
  constructor(
    @Inject(FAQ_REPOSITORY)
    private readonly faqRepository: IFaqRepository,
  ) {}

  /** Create an FAQ */
  async execute(input: CreateFaqInputDto): Promise<FaqResponseDto> {
    const faq = await this.faqRepository.create(input);
    return FaqMapper.toResponse(faq);
  }
}
