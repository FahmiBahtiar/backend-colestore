export interface OrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  couponId: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/** Port for order item persistence used by application use cases. */
export interface IOrderItemRepositoryPort {
  createMany(items: Omit<OrderItemRecord, 'id'>[]): Promise<number>;
  findByOrderId(orderId: string): Promise<OrderItemRecord[]>;
}
