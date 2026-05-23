import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Xendit } from 'xendit-node';
import {
  CreatePaymentInvoiceInput,
  IPaymentGatewayPort,
  PaymentInvoiceResult,
  PaymentWebhookPayload,
} from '../../application/interfaces';

interface XenditInvoiceResponse {
  id?: string;
  invoiceUrl?: string;
  invoice_url?: string;
  expiryDate?: string;
  expiry_date?: string;
}

@Injectable()
export class XenditService implements IPaymentGatewayPort {
  private readonly client: Xendit;
  private readonly webhookToken?: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('xendit.secretKey');
    if (!secretKey) {
      throw new Error('XENDIT_SECRET_KEY is not configured');
    }

    this.client = new Xendit({ secretKey });
    this.webhookToken = this.configService.get<string>('xendit.webhookToken');
  }

  /** Create a Xendit invoice for an order payment. */
  async createInvoice(
    input: CreatePaymentInvoiceInput,
  ): Promise<PaymentInvoiceResult> {
    const invoiceApi = this.client.Invoice as unknown as {
      createInvoice(request: {
        data: Record<string, unknown>;
      }): Promise<XenditInvoiceResponse>;
    };
    const invoice = await invoiceApi.createInvoice({
      data: {
        externalId: input.orderId,
        amount: input.amount,
        payerEmail: input.payerEmail,
        description: this.buildInvoiceDescription(input),
        ...(input.items?.length && { items: input.items }),
      },
    });

    return {
      invoiceId: invoice.id ?? input.orderId,
      invoiceUrl: invoice.invoiceUrl ?? invoice.invoice_url ?? null,
      expiresAt: this.parseOptionalDate(
        invoice.expiryDate ?? invoice.expiry_date,
      ),
    };
  }

  /** Normalize a Xendit webhook payload into the payment gateway port shape. */
  parseWebhook(payload: unknown): Promise<PaymentWebhookPayload> {
    const data = this.assertWebhookPayload(payload);
    const statusValue = this.asString(data.status) ?? 'PENDING';
    const invoiceId =
      this.asString(data.id) ??
      this.asString(data.invoice_id) ??
      this.asString(data.external_id);

    if (!invoiceId) {
      throw new BadRequestException('Invalid Xendit invoice identifier');
    }

    return Promise.resolve({
      invoiceId,
      status: this.mapInvoiceStatus(statusValue),
      paymentProof: this.asString(data.payment_method),
    });
  }

  /** Validate webhook token from presentation layer headers before processing. */
  verifyWebhookToken(token: string | undefined): void {
    if (this.webhookToken && token !== this.webhookToken) {
      throw new UnauthorizedException('Invalid Xendit webhook token');
    }
  }

  private assertWebhookPayload(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Invalid Xendit webhook payload');
    }
    return payload as Record<string, unknown>;
  }

  private mapInvoiceStatus(status: string): PaymentWebhookPayload['status'] {
    if (status === 'PAID' || status === 'SETTLED') return 'PAID';
    if (status === 'EXPIRED') return 'EXPIRED';
    if (status === 'FAILED') return 'FAILED';
    return 'PENDING';
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private buildInvoiceDescription(input: CreatePaymentInvoiceInput): string {
    if (!input.items?.length) return `Payment for order ${input.orderId}`;

    const itemSummary = input.items
      .map((item) => `${item.quantity}x ${item.name}`)
      .join(', ');
    return `Order ${input.orderId}: ${itemSummary}`;
  }

  private parseOptionalDate(value: string | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
