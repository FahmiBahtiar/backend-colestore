import { Inject, Injectable } from '@nestjs/common';
import {
  POINT_TRANSACTION_REPOSITORY,
  IPointTransactionRepository,
} from '../../../domain/repositories';

@Injectable()
export class ListAllPointTransactionsUseCase {
  constructor(
    @Inject(POINT_TRANSACTION_REPOSITORY)
    private readonly pointTxRepo: IPointTransactionRepository,
  ) {}

  async execute(params?: {
    skip?: number;
    take?: number;
    type?: 'EARNED' | 'REFUNDED' | 'REDEEMED';
  }) {
    const { items, total } = await this.pointTxRepo.findAll(params);

    return {
      items: items.map((t) => {
        let couponUsed = null;
        if (t.coupon) {
          couponUsed =
            t.coupon.maxUses !== null && t.coupon.usedCount >= t.coupon.maxUses;
        }
        return {
          id: t.id,
          userId: t.userId,
          userName: t.userName,
          userEmail: t.userEmail,
          type: t.type,
          points: t.points,
          amount: t.amount,
          orderId: t.orderId,
          createdAt: t.createdAt,
          couponCode: t.coupon?.code ?? null,
          couponUsed,
        };
      }),
      total,
    };
  }
}
