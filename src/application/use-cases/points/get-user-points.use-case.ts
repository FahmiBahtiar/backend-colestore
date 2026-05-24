import { Inject, Injectable } from '@nestjs/common';
import {
  POINT_TRANSACTION_REPOSITORY,
  IPointTransactionRepository,
} from '../../../domain/repositories';
import { UserPointsResponseDto } from '../../dtos/points/point.dto';

@Injectable()
export class GetUserPointsUseCase {
  constructor(
    @Inject(POINT_TRANSACTION_REPOSITORY)
    private readonly pointTxRepo: IPointTransactionRepository,
  ) {}

  async execute(
    userId: string,
    params?: { skip?: number; take?: number },
  ): Promise<UserPointsResponseDto> {
    const totalPoints = await this.pointTxRepo.getTotalPointsByUserId(userId);
    const { items, total } = await this.pointTxRepo.findByUserId(
      userId,
      params,
    );

    return {
      totalPoints,
      transactions: items.map((t) => ({
        id: t.id,
        type: t.type,
        points: t.points,
        amount: t.amount,
        orderId: t.orderId,
        createdAt: t.createdAt,
      })),
      totalTransactions: total,
    };
  }
}
