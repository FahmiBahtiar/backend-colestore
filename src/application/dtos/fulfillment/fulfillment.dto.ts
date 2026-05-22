export interface DeliverOrderInputDto {
  orderId: string;
  deliveredById: string;
  deliveryNote?: string | null;
}

export interface OrderActionInputDto {
  orderId: string;
}
