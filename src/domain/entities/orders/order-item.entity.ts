import { BaseEntity } from '../shared/base.entity';
import { DomainError } from '../../errors';

export interface OrderItemProps {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  couponId: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Order item entity with pricing consistency rules.
 */
export class OrderItem extends BaseEntity {
  private props: OrderItemProps;

  private constructor(props: OrderItemProps) {
    super(props);
    this.props = { ...props };
    this.validate();
  }

  /** Create an OrderItem entity from persisted properties. */
  static create(props: OrderItemProps): OrderItem {
    return new OrderItem(props);
  }

  /** Calculated subtotal from quantity and unit price. */
  calculateSubtotal(): number {
    return this.props.quantity * this.props.unitPrice;
  }

  /** Return plain properties for persistence or mapping. */
  toPrimitives(): OrderItemProps {
    return { ...this.props };
  }

  private validate(): void {
    this.requireNonEmpty(this.props.orderId, 'Order item order id is required');
    this.requireNonEmpty(
      this.props.productId,
      'Order item product id is required',
    );
    this.requireInteger(
      this.props.quantity,
      'Order item quantity must be an integer',
    );
    this.requirePositive(
      this.props.quantity,
      'Order item quantity must be greater than zero',
    );
    this.requireNonNegative(
      this.props.unitPrice,
      'Order item unit price cannot be negative',
    );
    this.requireNonNegative(
      this.props.subtotal,
      'Order item subtotal cannot be negative',
    );
    if (this.props.subtotal !== this.calculateSubtotal()) {
      throw new DomainError(
        'Order item subtotal must equal quantity multiplied by unit price',
      );
    }
  }
}
