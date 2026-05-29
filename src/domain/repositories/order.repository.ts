import { IBaseRepository } from './base.repository';

export interface ListOrdersParams {
  skip?: number;
  take?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  cursor?: string;
}

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
  deliveredBy?: { id: string; email: string; name: string | null } | null;
  user?: { id: string; email: string; name: string | null } | null;
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
export interface OrderListResult {
  items: OrderEntity[];
  data: OrderEntity[];
  total: number;
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Order repository interface — domain layer contract.
 */
export interface IOrderRepository extends IBaseRepository<OrderEntity> {
  findAll(params?: ListOrdersParams): Promise<OrderListResult>;
  findByUserId(
    userId: string,
    params?: ListOrdersParams,
  ): Promise<OrderListResult>;
  findByPaymentGatewayInvoiceId(invoiceId: string): Promise<OrderEntity | null>;
  findByPaymentGatewayRequestId(
    paymentRequestId: string,
  ): Promise<OrderEntity | null>;
  updateStatus(id: string, status: OrderEntity['status']): Promise<OrderEntity>;
  findByIds(ids: string[]): Promise<OrderEntity[]>;
}
