import { Inject, Injectable } from '@nestjs/common';
import {
  POINT_REWARD_REPOSITORY,
  IPointRewardRepository,
  PointRewardEntity,
} from '../../../domain/repositories';
import { PointRewardResponseDto } from '../../dtos/points/point-reward.dto';
import { PaginatedResult } from '../../../common/utils/pagination';

@Injectable()
export class ListPointRewardsUseCase {
  constructor(
    @Inject(POINT_REWARD_REPOSITORY)
    private readonly pointRewardRepo: IPointRewardRepository,
  ) {}

  async execute(params?: {
    activeOnly?: boolean;
    skip?: number;
    take?: number;
  }): Promise<
    PaginatedResult<PointRewardResponseDto> | PointRewardResponseDto[]
  > {
    if (params?.activeOnly) {
      const activeRewards = await this.pointRewardRepo.findActive();
      return activeRewards.map((reward) => this.mapToDto(reward));
    }

    const paginated = await this.pointRewardRepo.findAll({
      skip: params?.skip,
      take: params?.take,
    });

    return {
      items: paginated.items.map((reward) => this.mapToDto(reward)),
      meta: paginated.meta,
    };
  }

  private mapToDto(reward: PointRewardEntity): PointRewardResponseDto {
    return {
      id: reward.id,
      name: reward.name,
      description: reward.description,
      pointCost: reward.pointCost,
      discountType: reward.discountType,
      discountValue: reward.discountValue,
      minOrderAmount: reward.minOrderAmount,
      maxRedemptions: reward.maxRedemptions,
      redeemedCount: reward.redeemedCount,
      isActive: reward.isActive,
      expiresAt: reward.expiresAt,
      createdAt: reward.createdAt,
      updatedAt: reward.updatedAt,
    };
  }
}
