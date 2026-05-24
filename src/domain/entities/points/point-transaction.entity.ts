import { BaseEntity } from '../shared/base.entity';
import { DomainError } from '../../errors';

export type PointTransactionType = 'EARNED' | 'REFUNDED' | 'REDEEMED';

/** Rate: every POINTS_PER_UNIT currency earns 1 point. */
export const POINTS_PER_UNIT = 100;

export interface PointTransactionProps {
  id: string;
  userId: string;
  orderId: string | null;
  type: PointTransactionType;
  points: number;
  amount: number;
  createdAt: Date;
}

/**
 * Tracks a single point credit or debit event.
 */
export class PointTransaction extends BaseEntity {
  private props: PointTransactionProps;

  private constructor(props: PointTransactionProps) {
    super(props);
    this.props = { ...props };
    this.validate();
  }

  static create(props: PointTransactionProps): PointTransaction {
    return new PointTransaction(props);
  }

  /** Calculate the number of points earned from a monetary amount (floor). */
  static calculatePointsFromAmount(amount: number): number {
    if (amount <= 0) return 0;
    return Math.floor(amount / POINTS_PER_UNIT);
  }

  get userId(): string {
    return this.props.userId;
  }

  get orderId(): string | null {
    return this.props.orderId;
  }

  get type(): PointTransactionType {
    return this.props.type;
  }

  get points(): number {
    return this.props.points;
  }

  get amount(): number {
    return this.props.amount;
  }

  toPrimitives(): PointTransactionProps {
    return { ...this.props };
  }

  private validate(): void {
    this.requireNonEmpty(this.props.userId, 'User ID is required');
    if (!['EARNED', 'REFUNDED', 'REDEEMED'].includes(this.props.type)) {
      throw new DomainError('Invalid point transaction type');
    }
    this.requirePositive(this.props.points, 'Points must be positive');
  }
}
