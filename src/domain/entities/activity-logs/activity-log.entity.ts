import { BaseEntity } from '../shared/base.entity';
import { DomainError } from '../../errors';

export type LogCategory =
  | 'AUTH'
  | 'USER'
  | 'PRODUCT'
  | 'ORDER'
  | 'PAYMENT'
  | 'DELIVERY'
  | 'COUPON'
  | 'SYSTEM'
  | 'SECURITY';

export interface ActivityLogProps {
  id: string;
  category: LogCategory;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  details: Record<string, unknown> | null;
  orderId: string | null;
  createdAt: Date;
}

/**
 * Append-only activity log entity for audit trail records.
 */
export class ActivityLog extends BaseEntity {
  private props: ActivityLogProps;

  private constructor(props: ActivityLogProps) {
    super(props);
    this.props = { ...props };
    this.validate();
  }

  /** Create an ActivityLog entity from persisted properties. */
  static create(props: ActivityLogProps): ActivityLog {
    return new ActivityLog(props);
  }

  /** Return plain properties for persistence or mapping. */
  toPrimitives(): ActivityLogProps {
    return { ...this.props };
  }

  private validate(): void {
    this.requireNonEmpty(this.props.action, 'Activity log action is required');
    const categories: LogCategory[] = [
      'AUTH',
      'USER',
      'PRODUCT',
      'ORDER',
      'PAYMENT',
      'DELIVERY',
      'COUPON',
      'SYSTEM',
      'SECURITY',
    ];
    if (!categories.includes(this.props.category)) {
      throw new DomainError('Activity log category is invalid');
    }
  }
}
