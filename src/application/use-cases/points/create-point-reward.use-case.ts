import { Inject, Injectable } from '@nestjs/common';
import {
  POINT_REWARD_REPOSITORY,
  IPointRewardRepository,
} from '../../../domain/repositories';
import {
  CreatePointRewardInputDto,
  PointRewardResponseDto,
} from '../../dtos/points/point-reward.dto';

@Injectable()
export class CreatePointRewardUseCase {
  constructor(
    @Inject(POINT_REWARD_REPOSITORY)
    private readonly pointRewardRepo: IPointRewardRepository,
  ) {}

  async execute(
    dto: CreatePointRewardInputDto,
  ): Promise<PointRewardResponseDto> {
    const reward = await this.pointRewardRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      pointCost: dto.pointCost,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minOrderAmount: dto.minOrderAmount ?? 0,
      maxRedemptions: dto.maxRedemptions ?? null,
      isActive: dto.isActive ?? true,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

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
