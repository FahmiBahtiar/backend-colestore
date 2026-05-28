/* eslint-disable */
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  CreatePaymentInvoiceInput,
  CreatePaymentRequestInput,
  IPaymentGatewayPort,
  PaymentInvoiceResult,
  PaymentMethodOption,
  PaymentRequestResult,
  PaymentWebhookPayload,
} from '../../application/interfaces';

/** Available payment methods mapping for Duitku Direct API */
const PAYMENT_METHODS: PaymentMethodOption[] = [
  // Virtual Accounts
  { type: 'VIRTUAL_ACCOUNT', channel: 'BCA', name: 'BCA Virtual Account' },
  { type: 'VIRTUAL_ACCOUNT', channel: 'BNI', name: 'BNI Virtual Account' },
  { type: 'VIRTUAL_ACCOUNT', channel: 'BRI', name: 'BRI Virtual Account' },
  {
    type: 'VIRTUAL_ACCOUNT',
    channel: 'MANDIRI',
    name: 'Mandiri Virtual Account',
  },
  {
    type: 'VIRTUAL_ACCOUNT',
    channel: 'PERMATA',
    name: 'Permata Virtual Account',
  },
  // QRIS – uses GQ (Gudang Voucher) acquirer code, testable via sandbox demo page.
  // QRIS is a universal standard: the generated QR can be scanned by any app.
  { type: 'QR_CODE', channel: 'GQ', name: 'QRIS' },
  // E-Wallets
  { type: 'EWALLET', channel: 'OVO', name: 'OVO' },
  { type: 'EWALLET', channel: 'DANA', name: 'DANA' },
  { type: 'EWALLET', channel: 'SHOPEEPAY', name: 'ShopeePay' },
  { type: 'EWALLET', channel: 'LINKAJA', name: 'LinkAja' },
];

@Injectable()
export class DuitkuService implements IPaymentGatewayPort {
  private readonly logger = new Logger(DuitkuService.name);

  private readonly merchantCode: string;
  private readonly merchantKey: string;
  private readonly callbackUrl: string;
  private readonly returnUrl: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get('duitku');
    if (!config) {
      throw new Error('Duitku configuration is missing from ConfigService!');
    }

    this.merchantCode = config.merchantCode;
    this.merchantKey = config.merchantKey;
    this.callbackUrl = config.callbackUrl;
    this.returnUrl = config.returnUrl;
    this.isProduction = config.environment === 'production';

    if (!this.merchantCode || !this.merchantKey) {
      this.logger.warn(
        'Duitku credentials are not fully configured in environment variables.',
      );
    }
  }

  private getBaseUrl(): string {
    return this.isProduction
      ? 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry'
      : 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry';
  }

  /**
   * Map generic channel to Duitku channel code.
   */
  private mapChannel(type: string, channel: string): string {
    const code = channel.toUpperCase();
    if (type === 'VIRTUAL_ACCOUNT') {
      switch (code) {
        case 'BCA':
          return 'BC';
        case 'BNI':
          return 'I1';
        case 'BRI':
          return 'BR';
        case 'MANDIRI':
          return 'M2';
        case 'PERMATA':
          return 'A1';
        default:
          return 'BC';
      }
    } else if (type === 'QR_CODE') {
      // QRIS channels use their Duitku code directly (GQ, SP, NQ, SQ)
      return code;
    } else if (type === 'EWALLET') {
      switch (code) {
        case 'OVO':
          return 'OV';
        case 'DANA':
          return 'DA';
        case 'SHOPEEPAY':
          return 'SA';
        case 'LINKAJA':
          return 'LA';
        default:
          return 'DA';
      }
    }
    return 'BC';
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Compute HMAC-SHA256 signature for Duitku V2 API.
   * stringToSign = merchantCode + merchantOrderId + paymentAmount
   * signature = HMAC_SHA256(stringToSign, merchantKey)
   */
  private computeSignature(orderId: string, amount: number): string {
    const stringToSign = `${this.merchantCode}${orderId}${amount}`;
    return crypto
      .createHmac('sha256', this.merchantKey)
      .update(stringToSign)
      .digest('hex');
  }

  /**
   * Create generic invoice by reusing custom payment request.
   */
  async createInvoice(
    input: CreatePaymentInvoiceInput,
  ): Promise<PaymentInvoiceResult> {
    this.logger.log(`Creating fallback invoice for Order: ${input.orderId}`);

    // Fallback to BCA VA request
    const reqResult = await this.createPaymentRequest({
      orderId: input.orderId,
      amount: input.amount,
      paymentMethodType: 'VIRTUAL_ACCOUNT',
      paymentChannel: 'BCA',
      payerEmail: input.payerEmail,
      items: input.items,
    });

    const paymentUrl =
      (reqResult.paymentInstructions?.paymentUrl as string) || '';

    return {
      invoiceId: reqResult.paymentRequestId,
      invoiceUrl: paymentUrl,
      expiresAt: reqResult.expiresAt,
    };
  }

  /**
   * Direct API Transaction Inquiry V2
   */
  async createPaymentRequest(
    input: CreatePaymentRequestInput,
  ): Promise<PaymentRequestResult> {
    this.logger.log(
      `Creating payment request for Order ${input.orderId} via ${input.paymentMethodType}/${input.paymentChannel}`,
    );

    const paymentMethod = this.mapChannel(
      input.paymentMethodType,
      input.paymentChannel,
    );
    const amountInt = Math.round(input.amount); // Duitku only accepts integers
    const signature = this.computeSignature(input.orderId, amountInt);

    const productDetails = `Pembayaran Order #${input.orderId}`;
    const expiryPeriod = input.expiryMinutes ?? 1440; // in minutes

    const payload = {
      merchantCode: this.merchantCode,
      paymentAmount: amountInt,
      paymentMethod,
      merchantOrderId: input.orderId,
      productDetails,
      additionalParam: input.orderId,
      merchantUserInfo:
        input.payerEmail && this.isValidEmail(input.payerEmail.trim())
          ? input.payerEmail.trim()
          : 'customer@colestore.com',
      customerVaName:
        input.payerEmail && this.isValidEmail(input.payerEmail.trim())
          ? input.payerEmail.trim().split('@')[0]
          : 'ColeStore VA',
      email:
        input.payerEmail && this.isValidEmail(input.payerEmail.trim())
          ? input.payerEmail.trim()
          : 'customer@colestore.com',
      phoneNumber: input.payerPhone
        ? input.payerPhone.replace(/\D/g, '')
        : '081234567890',
      itemDetails:
        input.items?.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: Math.round(item.price),
        })) || [],
      callbackUrl: this.callbackUrl,
      returnUrl: this.returnUrl,
      signature,
      expiryPeriod,
    };

    try {
      const response = await fetch(this.getBaseUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Duitku Inquiry V2 API HTTP Error: ${response.status} - ${errorText}`,
        );

        let detailedMessage = '';
        try {
          const parsed = JSON.parse(errorText);
          detailedMessage =
            parsed.Message || parsed.message || parsed.statusMessage || '';
        } catch (e) {
          // Response body is not a JSON object, or doesn't have standard fields
        }

        const errMsg = detailedMessage
          ? `HTTP Error from Duitku: ${response.status} - ${detailedMessage}`
          : `HTTP Error from Duitku: ${response.status}`;

        throw new BadRequestException(errMsg);
      }

      const resBody = (await response.json()) as {
        merchantCode?: string;
        merchantOrderId?: string;
        paymentUrl?: string;
        reference?: string;
        statusCode?: string;
        statusMessage?: string;
        vaNumber?: string;
        qrString?: string;
      };

      if (resBody.statusCode !== '00') {
        this.logger.error(
          `Duitku API returned business error: ${resBody.statusCode} - ${resBody.statusMessage}`,
        );
        throw new BadRequestException(
          resBody.statusMessage || 'Payment generation failed',
        );
      }

      const reference = resBody.reference || `DUITKU-${Date.now()}`;
      const expiresAt = new Date(Date.now() + expiryPeriod * 60 * 1000);

      // Build payment instructions depending on type
      const paymentInstructions: Record<string, unknown> = {
        paymentUrl: resBody.paymentUrl || '',
        reference: resBody.reference || '',
      };

      if (input.paymentMethodType === 'VIRTUAL_ACCOUNT') {
        paymentInstructions.vaNumber = resBody.vaNumber || '';
        paymentInstructions.bankCode = input.paymentChannel.toUpperCase();
      } else if (input.paymentMethodType === 'QR_CODE') {
        paymentInstructions.qrString = resBody.qrString || '';
      } else if (input.paymentMethodType === 'EWALLET') {
        paymentInstructions.checkoutUrl = resBody.paymentUrl || '';
      }

      return {
        paymentRequestId: reference,
        paymentMethodType: input.paymentMethodType,
        paymentChannel: input.paymentChannel,
        paymentInstructions,
        expiresAt,
      };
    } catch (err: any) {
      this.logger.error(
        `Failed to request payment from Duitku: ${err.message}`,
        err.stack,
      );
      throw new BadRequestException(
        err.message || 'Duitku Gateway Connection Failure',
      );
    }
  }

  /**
   * Return available Duitku methods.
   */
  async getAvailablePaymentMethods(): Promise<PaymentMethodOption[]> {
    return PAYMENT_METHODS;
  }

  /**
   * Parse and verify signature of Duitku Callback Webhook
   */
  async parseWebhook(payload: any): Promise<PaymentWebhookPayload> {
    this.logger.log(`Parsing Duitku Webhook callback payload`);

    const {
      merchantCode,
      amount,
      merchantOrderId,
      paymentCode,
      resultCode,
      reference,
      signature,
    } = payload;

    if (!merchantCode || !amount || !merchantOrderId || !signature) {
      throw new BadRequestException('Invalid callback webhook payload fields');
    }

    // Verify signature callback HMAC-SHA256 (V2 API)
    // stringToSign = merchantCode + amount + merchantOrderId
    // signature = HMAC_SHA256(stringToSign, merchantKey)
    const stringToSign = `${merchantCode}${amount}${merchantOrderId}`;
    const calculatedSignature = crypto
      .createHmac('sha256', this.merchantKey)
      .update(stringToSign)
      .digest('hex');

    if (calculatedSignature !== signature) {
      this.logger.error(
        `Signature mismatch! Calculated: ${calculatedSignature}, Received: ${signature}`,
      );
      throw new UnauthorizedException(
        'Invalid signature from Duitku webhook callback',
      );
    }

    const isPaid = resultCode === '00';

    return {
      invoiceId: reference,
      paymentRequestId: reference,
      status: isPaid ? 'PAID' : 'FAILED',
      paymentProof: reference,
    };
  }

  /**
   * Check transaction status directly from Duitku (real-time pulling/polling)
   */
  async checkTransactionStatus(
    merchantOrderId: string,
  ): Promise<PaymentWebhookPayload> {
    this.logger.log(
      `Checking Duitku transaction status for order ID: ${merchantOrderId}`,
    );

    const stringToSign = `${this.merchantCode}${merchantOrderId}`;
    // Generate signature using HMAC-SHA256 (Version 2.0)
    const signature = crypto
      .createHmac('sha256', this.merchantKey)
      .update(stringToSign)
      .digest('hex');

    const params = {
      merchantCode: this.merchantCode,
      merchantOrderId,
      signature,
    };

    const url = this.isProduction
      ? 'https://passport.duitku.com/webapi/api/merchant/transactionStatus'
      : 'https://sandbox.duitku.com/webapi/api/merchant/transactionStatus';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(
          `Duitku transactionStatus returned HTTP ${response.status}`,
        );
      }

      const body = (await response.json()) as {
        merchantOrderId?: string;
        reference?: string;
        amount?: string;
        fee?: string;
        statusCode?: string;
        statusMessage?: string;
      };

      this.logger.log(
        `Duitku transaction status for order ${merchantOrderId}: ${JSON.stringify(body)}`,
      );

      const { reference, statusCode } = body;
      const isPaid = statusCode === '00';
      const isFailed = statusCode === '02';

      return {
        invoiceId: reference || '',
        paymentRequestId: reference || '',
        status: isPaid ? 'PAID' : isFailed ? 'FAILED' : 'PENDING',
        paymentProof: reference || '',
      };
    } catch (err: any) {
      this.logger.error(
        `Failed to check Duitku transaction status: ${err.message}`,
      );
      throw err;
    }
  }
}
