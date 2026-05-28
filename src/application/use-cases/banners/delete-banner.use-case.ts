import { Inject, Injectable } from '@nestjs/common';
import { IBannerRepository } from '../../../domain/repositories';
import { BANNER_REPOSITORY } from '../../../domain/repositories/tokens';

@Injectable()
export class DeleteBannerUseCase {
  constructor(
    @Inject(BANNER_REPOSITORY)
    private readonly bannerRepository: IBannerRepository,
  ) {}

  /** Delete a Banner */
  async execute(id: string): Promise<void> {
    await this.bannerRepository.delete(id);
  }
}
