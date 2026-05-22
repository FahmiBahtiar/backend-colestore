export interface ProcessXenditWebhookInputDto {
  payload: unknown;
}

export interface ProcessXenditWebhookResultDto {
  orderId: string;
  status: string;
  processed: boolean;
}
