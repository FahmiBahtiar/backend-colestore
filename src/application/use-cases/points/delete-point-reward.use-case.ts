import { Inject, Injectable } from '@nestjs/common';
import {
  POINT_REWARD_REPOSITORY,
  IPointRewardRepository,
} from '../../../domain/repositories';

@Injectable()
export class DeletePointRewardUseCase {
  constructor(
    @Inject(POINT_REWARD_REPOSITORY)
    private readonly pointRewardRepo: IPointRewardRepository,
  ) {}

  async execute(id: string): Promise<void> {
    await this.pointRewardRepo.delete(id);
  }
}
