import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Order } from '../../../domain/entities';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import {
  ProcessPaymentWebhookInputDto,
  ProcessPaymentWebhookResultDto,
} from '../../dtos';
import { IPaymentGatewayPort, PAYMENT_GATEWAY } from '../../interfaces';
import { paymentEvents } from '../../interfaces/payment-events';

@Injectable()
export class ProcessPaymentWebhookUseCase {
  private readonly logger = new Logger(ProcessPaymentWebhookUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGatewayPort,
  ) {}

  /** Process a trusted payment webhook payload and update order payment status.
   *  Handles BOTH Invoice webhooks and Payment Request webhooks dynamically.
   */
  async execute(
    input: ProcessPaymentWebhookInputDto,
  ): Promise<ProcessPaymentWebhookResultDto> {
    const webhook = await this.paymentGateway.parseWebhook(input.payload);

    // Lookup order — try Payment Request ID first, then Invoice ID
    let orderRecord = null;

    if (webhook.paymentRequestId) {
      this.logger.log(
        `Looking up order by payment request ID: ${webhook.paymentRequestId}`,
      );
      orderRecord = await this.orderRepository.findByPaymentGatewayRequestId(
        webhook.paymentRequestId,
      );
    }

    if (!orderRecord && webhook.invoiceId) {
      this.logger.log(`Looking up order by invoice ID: ${webhook.invoiceId}`);
      orderRecord = await this.orderRepository.findByPaymentGatewayInvoiceId(
        webhook.invoiceId,
      );
    }

    if (!orderRecord) {
      throw new NotFoundException('Order not found for payment webhook');
    }

    const order = Order.create(orderRecord);

    // Idempotency: Webhooks only process orders currently in the PENDING state.
    // Duplicate callbacks for already PAID or CANCELLED orders are safely ignored.
    if (order.status !== 'PENDING') {
      this.logger.log(
        `Order ${order.id} already in status ${order.status}, skipping webhook`,
      );
      return { orderId: order.id, status: order.status, processed: false };
    }

    if (webhook.status === 'PAID') {
      // Validate payment callback amount against order amount to prevent tampering
      if (webhook.amount !== undefined) {
        const expectedAmount = Number(orderRecord.finalAmount);
        const paidAmount = Number(webhook.amount);

        if (!Number.isFinite(expectedAmount) || !Number.isFinite(paidAmount)) {
          throw new BadRequestException('Invalid payment amount.');
        }

        if (expectedAmount !== paidAmount) {
          this.logger.error(
            `Amount mismatch on payment callback for order ${order.id}. Expected: ${expectedAmount}, Paid: ${paidAmount}`,
          );
          throw new BadRequestException('Payment amount mismatch.');
        }
      }
      order.markPaid(webhook.paymentProof ?? null);
    } else if (webhook.status === 'EXPIRED' || webhook.status === 'FAILED') {
      order.cancel();
    } else {
      this.logger.log(
        `Order ${order.id} is in status ${order.status} and webhook status is ${webhook.status}, skipping further updates.`,
      );
      return { orderId: order.id, status: order.status, processed: false };
    }

    const updated = await this.orderRepository.update(order.id, {
      status: order.toPrimitives().status,
      paymentProof: order.toPrimitives().paymentProof,
    });

    if (webhook.status === 'PAID') {
      // Emit the payment success event to update connected WebSocket clients in real-time
      paymentEvents.emit('payment_status_changed', {
        orderId: updated.id,
        status: 'PAID',
      });
    }

    this.logger.log(
      `Webhook processed for order ${updated.id}: status → ${updated.status}`,
    );

    return { orderId: updated.id, status: updated.status, processed: true };
  }
}
