import { IBaseRepository } from './base.repository';

export interface OrderEntity {
  id: string;
  userId: string | null;
  customerEmail: string;
  customerWhatsapp: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status:
    | 'PENDING'
    | 'PAID'
    | 'PROCESSING'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'REFUNDED';
  paymentGatewayInvoiceId: string | null;
  paymentGatewayInvoiceUrl: string | null;
  paymentGatewayExpiresAt: Date | null;
  paymentGatewayRequestId: string | null;
  paymentMethodType: string | null;
  paymentChannel: string | null;
  paymentInstructions: Record<string, unknown> | null;
  paymentProof: string | null;
  deliveredAt: Date | null;
  deliveredById: string | null;
  deliveryNote: string | null;
  couponId: string | null;
  couponCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: {
    id: string;
    orderId: string;
    productId: string;
    variantId: string | null;
    couponId: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    productName: string | null;
    variantName: string | null;
    checkoutAnswers?: {
      id: string;
      orderItemId: string;
      checkoutFieldId: string | null;
      label: string;
      value: string;
      createdAt: Date;
      updatedAt: Date;
    }[];
  }[];
}

/**
 * Order repository interface — domain layer contract.
 */
export interface IOrderRepository extends IBaseRepository<OrderEntity> {
  findByUserId(
    userId: string,
    params?: { skip?: number; take?: number },
  ): Promise<{ items: OrderEntity[]; total: number }>;
  findByPaymentGatewayInvoiceId(invoiceId: string): Promise<OrderEntity | null>;
  findByPaymentGatewayRequestId(
    paymentRequestId: string,
  ): Promise<OrderEntity | null>;
  updateStatus(id: string, status: OrderEntity['status']): Promise<OrderEntity>;
}
