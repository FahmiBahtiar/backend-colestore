export interface CreatePaymentInvoiceInput {
  orderId: string;
  amount: number;
  payerEmail?: string;
  items?: PaymentInvoiceItem[];
}

export interface PaymentInvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

export interface PaymentInvoiceResult {
  invoiceId: string;
  invoiceUrl: string | null;
  expiresAt?: Date | null;
}

export interface PaymentWebhookPayload {
  invoiceId: string;
  status: 'PAID' | 'EXPIRED' | 'FAILED' | 'PENDING';
  paymentProof?: string | null;
}

/** Port for external payment provider integration. */
export interface IPaymentGatewayPort {
  createInvoice(
    input: CreatePaymentInvoiceInput,
  ): Promise<PaymentInvoiceResult>;
  parseWebhook(payload: unknown): Promise<PaymentWebhookPayload>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
