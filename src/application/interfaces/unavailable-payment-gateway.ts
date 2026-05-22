import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  CreatePaymentInvoiceInput,
  IPaymentGatewayPort,
  PaymentInvoiceResult,
  PaymentWebhookPayload,
} from './payment-gateway.port';

@Injectable()
export class UnavailablePaymentGateway implements IPaymentGatewayPort {
  /** Placeholder until the real Xendit adapter is implemented in infrastructure. */
  createInvoice(
    input: CreatePaymentInvoiceInput,
  ): Promise<PaymentInvoiceResult> {
    void input;
    throw new ServiceUnavailableException('Payment gateway is not configured');
  }

  /** Placeholder until the real Xendit webhook parser is implemented. */
  parseWebhook(payload: unknown): Promise<PaymentWebhookPayload> {
    void payload;
    throw new ServiceUnavailableException('Payment gateway is not configured');
  }
}
