import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IFaqRepository } from '../../../domain/repositories';
import { FAQ_REPOSITORY } from '../../../domain/repositories/tokens';

@Injectable()
export class DeleteFaqUseCase {
  constructor(
    @Inject(FAQ_REPOSITORY)
    private readonly faqRepository: IFaqRepository,
  ) {}

  /** Delete an FAQ */
  async execute(id: string): Promise<void> {
    const existing = await this.faqRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }

    await this.faqRepository.delete(id);
  }
}
