import { BaseEntity } from '../shared/base.entity';
import { DomainError } from '../../errors';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderProps {
  id: string;
  userId: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: OrderStatus;
  xenditInvoiceId: string | null;
  xenditInvoiceUrl: string | null;
  xenditInvoiceExpiresAt: Date | null;
  paymentProof: string | null;
  deliveredAt: Date | null;
  deliveredById: string | null;
  deliveryNote: string | null;
  couponId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Order aggregate root with payment, cancellation, and manual delivery rules.
 */
export class Order extends BaseEntity {
  private props: OrderProps;

  private constructor(props: OrderProps) {
    super(props);
    this.props = { ...props };
    this.validate();
  }

  /** Create an Order entity from persisted properties. */
  static create(props: OrderProps): Order {
    return new Order(props);
  }

  /** Current order status. */
  get status(): OrderStatus {
    return this.props.status;
  }

  /** Attach payment invoice while order is pending. */
  attachInvoice(
    invoiceId: string,
    invoiceUrl?: string | null,
    expiresAt?: Date | null,
  ): void {
    this.ensureStatus(['PENDING']);
    this.requireNonEmpty(invoiceId, 'Invoice id is required');
    this.props.xenditInvoiceId = invoiceId;
    this.props.xenditInvoiceUrl = invoiceUrl ?? this.props.xenditInvoiceUrl;
    this.props.xenditInvoiceExpiresAt =
      expiresAt ?? this.props.xenditInvoiceExpiresAt;
  }

  /** Mark order as paid after trusted payment confirmation. */
  markPaid(paymentProof?: string | null): void {
    this.ensureStatus(['PENDING']);
    this.props.status = 'PAID';
    this.props.paymentProof = paymentProof ?? this.props.paymentProof;
  }

  /** Move paid order into manual processing. */
  startProcessing(): void {
    this.ensureStatus(['PAID']);
    this.props.status = 'PROCESSING';
  }

  /** Complete manual fulfillment by an admin. */
  deliver(deliveredById: string, deliveryNote?: string | null): void {
    this.ensureStatus(['PAID', 'PROCESSING']);
    this.requireNonEmpty(deliveredById, 'Delivery admin id is required');
    this.props.status = 'DELIVERED';
    this.props.deliveredById = deliveredById;
    this.props.deliveryNote = deliveryNote ?? null;
    this.props.deliveredAt = new Date();
  }

  /** Cancel an unpaid order. */
  cancel(): void {
    this.ensureStatus(['PENDING']);
    this.props.status = 'CANCELLED';
  }

  /** Refund an order after payment. */
  refund(): void {
    this.ensureStatus(['PAID', 'PROCESSING', 'DELIVERED']);
    this.props.status = 'REFUNDED';
  }

  /** Return plain properties for persistence or mapping. */
  toPrimitives(): OrderProps {
    return { ...this.props };
  }

  private validate(): void {
    this.requireNonEmpty(this.props.userId, 'Order user id is required');
    this.requireNonNegative(
      this.props.totalAmount,
      'Order total amount cannot be negative',
    );
    this.requireNonNegative(
      this.props.discountAmount,
      'Order discount cannot be negative',
    );
    this.requireNonNegative(
      this.props.finalAmount,
      'Order final amount cannot be negative',
    );
    if (this.props.discountAmount > this.props.totalAmount) {
      throw new DomainError('Order discount cannot exceed total amount');
    }
    if (
      this.props.finalAmount !==
      this.props.totalAmount - this.props.discountAmount
    ) {
      throw new DomainError(
        'Order final amount must equal total minus discount',
      );
    }
    if (
      ![
        'PENDING',
        'PAID',
        'PROCESSING',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
      ].includes(this.props.status)
    ) {
      throw new DomainError('Order status is invalid');
    }
    if (this.props.status === 'DELIVERED' && !this.props.deliveredById) {
      throw new DomainError('Delivered orders require delivery admin id');
    }
    if (
      this.props.status === 'DELIVERED' &&
      (!this.props.deliveredAt ||
        !(this.props.deliveredAt instanceof Date) ||
        Number.isNaN(this.props.deliveredAt.getTime()))
    ) {
      throw new DomainError('Delivered orders require a valid delivery date');
    }
  }

  private ensureStatus(allowedStatuses: OrderStatus[]): void {
    if (!allowedStatuses.includes(this.props.status)) {
      throw new DomainError(
        `Order status ${this.props.status} cannot perform this transition`,
      );
    }
  }
}
