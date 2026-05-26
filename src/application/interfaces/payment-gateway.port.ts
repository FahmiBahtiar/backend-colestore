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

export interface CreatePaymentRequestInput {
  orderId: string;
  amount: number;
  paymentMethodType: string;
  paymentChannel: string;
  payerEmail?: string;
  items?: PaymentInvoiceItem[];
  expiryMinutes?: number;
}

export interface PaymentRequestResult {
  paymentRequestId: string;
  paymentMethodType: string;
  paymentChannel: string;
  paymentInstructions: Record<string, unknown> | null;
  expiresAt?: Date | null;
}

export interface PaymentMethodOption {
  type: string;
  channel: string;
  name: string;
  logoUrl?: string | null;
}

export interface PaymentWebhookPayload {
  invoiceId?: string;
  paymentRequestId?: string;
  status: 'PAID' | 'EXPIRED' | 'FAILED' | 'PENDING';
  paymentProof?: string | null;
}

/** Port for external payment provider integration. */
export interface IPaymentGatewayPort {
  createInvoice(
    input: CreatePaymentInvoiceInput,
  ): Promise<PaymentInvoiceResult>;
  createPaymentRequest(
    input: CreatePaymentRequestInput,
  ): Promise<PaymentRequestResult>;
  getAvailablePaymentMethods(): Promise<PaymentMethodOption[]>;
  parseWebhook(payload: unknown): Promise<PaymentWebhookPayload>;
  checkTransactionStatus?(
    merchantOrderId: string,
  ): Promise<PaymentWebhookPayload>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
