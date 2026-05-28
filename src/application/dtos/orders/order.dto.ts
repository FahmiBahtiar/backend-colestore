import { OrderStatus } from '../../../domain/entities';

export interface OrderResponseDto {
  id: string;
  userId: string | null;
  customerEmail: string;
  customerWhatsapp: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: OrderStatus;
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
}

export interface OrderItemCheckoutAnswerInputDto {
  checkoutFieldId?: string | null;
  label: string;
  value: string;
}

export interface OrderItemInputDto {
  productId: string;
  variantId?: string | null;
  quantity: number;
  checkoutAnswers?: OrderItemCheckoutAnswerInputDto[];
}

export interface PlaceOrderInputDto {
  userId?: string | null;
  items: OrderItemInputDto[];
  couponCode?: string | null;
  customerEmail: string;
  customerWhatsapp: string;
  paymentMethodType: string;
  paymentChannel: string;
}

export interface PlaceOrderResultDto {
  order: OrderResponseDto;
  paymentRequestId: string | null;
  paymentInstructions: Record<string, unknown> | null;
  /** @deprecated kept for backward compatibility */
  invoiceId?: string | null;
  /** @deprecated kept for backward compatibility */
  invoiceUrl?: string | null;
}

export interface ListOrdersInputDto {
  userId: string;
  skip?: number;
  take?: number;
}

export interface ListAllOrdersInputDto {
  skip?: number;
  take?: number;
}
