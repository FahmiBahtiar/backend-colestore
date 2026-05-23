import { OrderStatus } from '../../../domain/entities';

export interface OrderResponseDto {
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

export interface OrderItemInputDto {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface PlaceOrderInputDto {
  userId: string;
  items: OrderItemInputDto[];
  couponCode?: string | null;
}

export interface PlaceOrderResultDto {
  order: OrderResponseDto;
  invoiceId: string | null;
  invoiceUrl: string | null;
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
