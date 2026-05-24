import { Inject, Injectable } from '@nestjs/common';
import {
  POINT_TRANSACTION_REPOSITORY,
  IPointTransactionRepository,
} from '../../../domain/repositories';
import { OrderEntity } from '../../../domain/repositories/order.repository';

@Injectable()
export class RevokeOrderPointsUseCase {
  constructor(
    @Inject(POINT_TRANSACTION_REPOSITORY)
    private readonly pointTxRepo: IPointTransactionRepository,
  ) {}

  async execute(order: OrderEntity): Promise<void> {
    if (!order.userId) {
      return;
    }

    // 1. Check if already refunded
    const existingTransactions = await this.pointTxRepo.findByOrderId(order.id);
    const hasRefunded = existingTransactions.some((t) => t.type === 'REFUNDED');
    if (hasRefunded) {
      return;
    }

    // 2. Find the earned points for this order
    const earnedTx = existingTransactions.find((t) => t.type === 'EARNED');
    if (!earnedTx) {
      return;
    }

    // 3. Create the REFUNDED transaction to deduct the exact points earned
    await this.pointTxRepo.create({
      userId: order.userId,
      orderId: order.id,
      type: 'REFUNDED',
      points: earnedTx.points,
      amount: order.finalAmount,
    });
  }
}
