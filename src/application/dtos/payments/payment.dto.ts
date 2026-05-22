import { OrderStatus } from '../../../domain/entities';

export interface ProcessXenditWebhookInputDto {
  payload: unknown;
}

export interface ProcessXenditWebhookResultDto {
  orderId: string;
  status: OrderStatus;
  processed: boolean;
}
