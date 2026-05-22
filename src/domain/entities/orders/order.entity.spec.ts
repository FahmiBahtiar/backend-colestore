import { DomainError } from '../../errors';
import { OrderItem } from './order-item.entity';
import { Order, OrderProps } from './order.entity';

const now = new Date('2026-01-01T00:00:00.000Z');

function makeOrder(overrides: Partial<OrderProps> = {}): Order {
  return Order.create({
    id: 'order-1',
    userId: 'user-1',
    totalAmount: 100_000,
    discountAmount: 10_000,
    finalAmount: 90_000,
    status: 'PENDING',
    xenditInvoiceId: null,
    paymentProof: null,
    deliveredAt: null,
    deliveredById: null,
    deliveryNote: null,
    couponId: 'coupon-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe('Order entity', () => {
  it('rejects inconsistent final amounts', () => {
    expect(() => makeOrder({ finalAmount: 100_000 })).toThrow(DomainError);
  });

  it('attaches an invoice while pending', () => {
    const order = makeOrder();

    order.attachInvoice('invoice-1');

    expect(order.toPrimitives().xenditInvoiceId).toBe('invoice-1');
  });

  it('moves through paid, processing, and delivered states', () => {
    const order = makeOrder();

    order.markPaid('paid-proof');
    order.startProcessing();
    order.deliver('admin-1', 'Manual delivery completed');

    expect(order.status).toBe('DELIVERED');
    expect(order.toPrimitives().deliveredById).toBe('admin-1');
    expect(order.toPrimitives().deliveredAt).toBeInstanceOf(Date);
  });

  it('cancels only pending orders', () => {
    const pendingOrder = makeOrder();
    pendingOrder.cancel();

    expect(pendingOrder.status).toBe('CANCELLED');

    const paidOrder = makeOrder({ status: 'PAID' });

    expect(() => paidOrder.cancel()).toThrow(DomainError);
  });

  it('refunds only paid, processing, or delivered orders', () => {
    const paidOrder = makeOrder({ status: 'PAID' });

    paidOrder.refund();

    expect(paidOrder.status).toBe('REFUNDED');
    expect(() => makeOrder().refund()).toThrow(DomainError);
  });

  it('rejects delivery from pending orders', () => {
    expect(() => makeOrder().deliver('admin-1')).toThrow(DomainError);
  });
});

describe('OrderItem entity', () => {
  it('accepts valid subtotal calculations', () => {
    const item = OrderItem.create({
      id: 'item-1',
      orderId: 'order-1',
      productId: 'product-1',
      variantId: null,
      couponId: null,
      quantity: 2,
      unitPrice: 50_000,
      subtotal: 100_000,
    });

    expect(item.calculateSubtotal()).toBe(100_000);
  });

  it('rejects invalid subtotal calculations', () => {
    expect(() =>
      OrderItem.create({
        id: 'item-1',
        orderId: 'order-1',
        productId: 'product-1',
        variantId: null,
        couponId: null,
        quantity: 2,
        unitPrice: 50_000,
        subtotal: 90_000,
      }),
    ).toThrow(DomainError);
  });
});
