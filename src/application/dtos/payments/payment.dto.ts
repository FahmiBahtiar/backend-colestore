import { OrderStatus } from '../../../domain/entities';

export interface ProcessPaymentWebhookInputDto {
  payload: unknown;
}

export interface ProcessPaymentWebhookResultDto {
  orderId: string;
  status: OrderStatus;
  processed: boolean;
}
