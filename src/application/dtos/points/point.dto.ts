export interface PointTransactionResponseDto {
  id: string;
  type: 'EARNED' | 'REFUNDED' | 'REDEEMED';
  points: number;
  amount: number;
  orderId: string | null;
  createdAt: Date;
  couponCode?: string | null;
  couponUsed?: boolean | null;
}

export interface UserPointsResponseDto {
  totalPoints: number;
  transactions: PointTransactionResponseDto[];
  totalTransactions: number;
}
