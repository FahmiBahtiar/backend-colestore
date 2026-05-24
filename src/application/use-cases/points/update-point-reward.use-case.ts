import { Inject, Injectable } from '@nestjs/common';
import {
  POINT_REWARD_REPOSITORY,
  IPointRewardRepository,
} from '../../../domain/repositories';
import {
  UpdatePointRewardInputDto,
  PointRewardResponseDto,
} from '../../dtos/points/point-reward.dto';

@Injectable()
export class UpdatePointRewardUseCase {
  constructor(
    @Inject(POINT_REWARD_REPOSITORY)
    private readonly pointRewardRepo: IPointRewardRepository,
  ) {}

  async execute(
    dto: UpdatePointRewardInputDto,
  ): Promise<PointRewardResponseDto> {
    const updated = await this.pointRewardRepo.update(dto.id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.pointCost !== undefined && { pointCost: dto.pointCost }),
      ...(dto.discountType !== undefined && { discountType: dto.discountType }),
      ...(dto.discountValue !== undefined && {
        discountValue: dto.discountValue,
      }),
      ...(dto.minOrderAmount !== undefined && {
        minOrderAmount: dto.minOrderAmount,
      }),
      ...(dto.maxRedemptions !== undefined && {
        maxRedemptions: dto.maxRedemptions,
      }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.expiresAt !== undefined && {
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      }),
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      pointCost: updated.pointCost,
      discountType: updated.discountType,
      discountValue: updated.discountValue,
      minOrderAmount: updated.minOrderAmount,
      maxRedemptions: updated.maxRedemptions,
      redeemedCount: updated.redeemedCount,
      isActive: updated.isActive,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
