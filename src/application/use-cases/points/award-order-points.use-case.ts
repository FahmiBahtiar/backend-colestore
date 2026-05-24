import { Inject, Injectable } from '@nestjs/common';
import {
  POINT_TRANSACTION_REPOSITORY,
  IPointTransactionRepository,
} from '../../../domain/repositories';
import { OrderEntity } from '../../../domain/repositories/order.repository';
import { POINTS_PER_UNIT } from '../../../domain/entities/points/point-transaction.entity';

@Injectable()
export class AwardOrderPointsUseCase {
  constructor(
    @Inject(POINT_TRANSACTION_REPOSITORY)
    private readonly pointTxRepo: IPointTransactionRepository,
  ) {}

  async execute(order: OrderEntity): Promise<void> {
    // 1. Guest order does not get points
    if (!order.userId) {
      return;
    }

    // 2. Avoid duplicate points if already awarded
    const existingTransactions = await this.pointTxRepo.findByOrderId(order.id);
    const hasEarned = existingTransactions.some((t) => t.type === 'EARNED');
    if (hasEarned) {
      return;
    }

    // 3. Calculate points: Rp 100 = 1 point (floor)
    const points = Math.floor(order.finalAmount / POINTS_PER_UNIT);
    if (points <= 0) {
      return;
    }

    // 4. Create the transaction
    await this.pointTxRepo.create({
      userId: order.userId,
      orderId: order.id,
      type: 'EARNED',
      points,
      amount: order.finalAmount,
    });
  }
}
