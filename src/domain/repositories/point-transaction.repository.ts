export interface PointTransactionEntity {
  id: string;
  userId: string;
  orderId: string | null;
  type: 'EARNED' | 'REFUNDED' | 'REDEEMED';
  points: number;
  amount: number;
  createdAt: Date;
}

/**
 * Point transaction repository — domain layer contract.
 */
export interface IPointTransactionRepository {
  create(
    data: Omit<PointTransactionEntity, 'id' | 'createdAt'>,
  ): Promise<PointTransactionEntity>;
  findByUserId(
    userId: string,
    params?: { skip?: number; take?: number },
  ): Promise<{ items: PointTransactionEntity[]; total: number }>;
  findByOrderId(orderId: string): Promise<PointTransactionEntity[]>;
  getTotalPointsByUserId(userId: string): Promise<number>;
}
