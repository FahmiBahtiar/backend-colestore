import { DomainError } from '../../errors';
import { OrderItem } from './order-item.entity';
import { Order, OrderProps } from './order.entity';

const now = new Date('2026-01-01T00:00:00.000Z');

function makeOrder(overrides: Partial<OrderProps> = {}): Order {
  return Order.create({
    id: 'order-1',
    userId: 'user-1',
    customerEmail: 'customer@example.com',
    customerWhatsapp: '081234567890',
    totalAmount: 100_000,
    discountAmount: 10_000,
    finalAmount: 90_000,
    status: 'PENDING',
    paymentGatewayInvoiceId: null,
    paymentGatewayInvoiceUrl: null,
    paymentGatewayExpiresAt: null,
    paymentGatewayRequestId: null,
    paymentMethodType: null,
    paymentChannel: null,
    paymentInstructions: null,
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

    expect(order.toPrimitives().paymentGatewayInvoiceId).toBe('invoice-1');
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

  it('allows transitioning from CANCELLED to PAID', () => {
    const order = makeOrder();
    order.cancel();
    expect(order.status).toBe('CANCELLED');

    order.markPaid('paid-proof');
    expect(order.status).toBe('PAID');
    expect(order.toPrimitives().paymentProof).toBe('paid-proof');
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

  it('rejects delivered orders without a valid delivery date', () => {
    expect(() =>
      makeOrder({
        status: 'DELIVERED',
        deliveredById: 'admin-1',
        deliveredAt: null,
      }),
    ).toThrow(DomainError);
    expect(() =>
      makeOrder({
        status: 'DELIVERED',
        deliveredById: 'admin-1',
        deliveredAt: new Date('invalid-date'),
      }),
    ).toThrow(DomainError);
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
      createdAt: now,
      updatedAt: now,
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
        createdAt: now,
        updatedAt: now,
      }),
    ).toThrow(DomainError);
  });

  it('rejects invalid order item timestamps', () => {
    expect(() =>
      OrderItem.create({
        id: 'item-1',
        orderId: 'order-1',
        productId: 'product-1',
        variantId: null,
        couponId: null,
        quantity: 1,
        unitPrice: 50_000,
        subtotal: 50_000,
        createdAt: new Date('invalid-date'),
        updatedAt: now,
      }),
    ).toThrow(DomainError);
  });
});
