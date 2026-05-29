import { OrderEntity } from '../../domain/repositories';
import { OrderResponseDto } from '../dtos';
import { Prisma } from '@prisma/client';

export class OrderMapper {
  private static toNumber(val: any): number {
    if (val instanceof Prisma.Decimal) {
      return val.toNumber();
    }
    return Number(val ?? 0);
  }

  private static mapItems(items: OrderEntity['items']): any[] | undefined {
    if (!items) return undefined;
    return items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: this.toNumber(item.unitPrice),
      subtotal: this.toNumber(item.subtotal),
      productName: item.productName ?? null,
      variantName: item.variantName ?? null,
      checkoutAnswers: item.checkoutAnswers
        ? item.checkoutAnswers.map((ans) => ({
            id: ans.id,
            orderItemId: ans.orderItemId,
            checkoutFieldId: ans.checkoutFieldId,
            label: ans.label,
            value: ans.value,
          }))
        : [],
    }));
  }

  /**
   * 1. toBuyerSummaryResponse: Excludes all sensitive payment gateway references,
   * payment instructions, internal logs, proofs, and coupon mappings.
   */
  static toBuyerSummaryResponse(order: OrderEntity): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      customerEmail: order.customerEmail,
      customerWhatsapp: order.customerWhatsapp,
      totalAmount: this.toNumber(order.totalAmount),
      discountAmount: this.toNumber(order.discountAmount),
      finalAmount: this.toNumber(order.finalAmount),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paymentMethodType: order.paymentMethodType,
      paymentChannel: order.paymentChannel,
      paymentGatewayExpiresAt: order.paymentGatewayExpiresAt,
      items: this.mapItems(order.items),

      // Strict pruning of sensitive internal technical fields
      paymentGatewayInvoiceId: null,
      paymentGatewayRequestId: null,
      paymentGatewayInvoiceUrl: null,
      paymentInstructions: null,
      paymentProof: null,
      deliveredAt: order.deliveredAt,
      deliveredById: order.deliveredById,
      deliveryNote: null,
      couponId: null,
    };
  }

  /**
   * 2. toAdminSummaryResponse: Keeps columns like gateway reference status for admins,
   * but explicitly prunes heavy relational instruction JSON blocks.
   */
  static toAdminSummaryResponse(order: OrderEntity): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      customerEmail: order.customerEmail,
      customerWhatsapp: order.customerWhatsapp,
      totalAmount: this.toNumber(order.totalAmount),
      discountAmount: this.toNumber(order.discountAmount),
      finalAmount: this.toNumber(order.finalAmount),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paymentMethodType: order.paymentMethodType,
      paymentChannel: order.paymentChannel,
      paymentGatewayExpiresAt: order.paymentGatewayExpiresAt,
      paymentGatewayInvoiceId: order.paymentGatewayInvoiceId,
      paymentGatewayRequestId: order.paymentGatewayRequestId,
      paymentGatewayInvoiceUrl: order.paymentGatewayInvoiceUrl,
      paymentProof: order.paymentProof,
      deliveredAt: order.deliveredAt,
      deliveredById: order.deliveredById,
      deliveryNote: order.deliveryNote,
      couponId: order.couponId,
      items: this.mapItems(order.items),

      // Heavy/sensitive instructions are pruned from lists
      paymentInstructions: null,
    };
  }

  /**
   * 3. toDetailResponse: Complete details, including all payment instructions,
   * proofs, and relations required for detail pages.
   */
  static toDetailResponse(order: OrderEntity): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      customerEmail: order.customerEmail,
      customerWhatsapp: order.customerWhatsapp,
      totalAmount: this.toNumber(order.totalAmount),
      discountAmount: this.toNumber(order.discountAmount),
      finalAmount: this.toNumber(order.finalAmount),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paymentMethodType: order.paymentMethodType,
      paymentChannel: order.paymentChannel,
      paymentGatewayExpiresAt: order.paymentGatewayExpiresAt,
      paymentGatewayInvoiceId: order.paymentGatewayInvoiceId,
      paymentGatewayRequestId: order.paymentGatewayRequestId,
      paymentGatewayInvoiceUrl: order.paymentGatewayInvoiceUrl,
      paymentInstructions: order.paymentInstructions
        ? order.paymentInstructions
        : null,
      paymentProof: order.paymentProof,
      deliveredAt: order.deliveredAt,
      deliveredById: order.deliveredById,
      deliveryNote: order.deliveryNote,
      couponId: order.couponId,
      items: this.mapItems(order.items),
      user: order.user
        ? { id: order.user.id, email: order.user.email, name: order.user.name }
        : null,
    };
  }

  /**
   * 4. toCheckoutResponse: Specific checkout response including crucial payment instructions
   * and invoice redirect URLs needed for client storefront.
   */
  static toCheckoutResponse(order: OrderEntity): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      customerEmail: order.customerEmail,
      customerWhatsapp: order.customerWhatsapp,
      totalAmount: this.toNumber(order.totalAmount),
      discountAmount: this.toNumber(order.discountAmount),
      finalAmount: this.toNumber(order.finalAmount),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paymentMethodType: order.paymentMethodType,
      paymentChannel: order.paymentChannel,
      paymentGatewayExpiresAt: order.paymentGatewayExpiresAt,
      paymentGatewayInvoiceId: order.paymentGatewayInvoiceId,
      paymentGatewayRequestId: order.paymentGatewayRequestId,
      paymentGatewayInvoiceUrl: order.paymentGatewayInvoiceUrl,
      paymentInstructions: order.paymentInstructions
        ? order.paymentInstructions
        : null,
      paymentProof: order.paymentProof,
      deliveredAt: order.deliveredAt,
      deliveredById: order.deliveredById,
      deliveryNote: order.deliveryNote,
      couponId: order.couponId,
      items: this.mapItems(order.items),
    };
  }
}
