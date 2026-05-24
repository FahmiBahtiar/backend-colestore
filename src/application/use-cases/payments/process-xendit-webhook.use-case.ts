import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Order } from '../../../domain/entities';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import {
  ProcessXenditWebhookInputDto,
  ProcessXenditWebhookResultDto,
} from '../../dtos';
import { IPaymentGatewayPort, PAYMENT_GATEWAY } from '../../interfaces';
import { AwardOrderPointsUseCase } from '../points/award-order-points.use-case';

@Injectable()
export class ProcessXenditWebhookUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGatewayPort,
    private readonly awardOrderPointsUseCase: AwardOrderPointsUseCase,
  ) {}

  /** Process a trusted Xendit webhook payload and update order payment status. */
  async execute(
    input: ProcessXenditWebhookInputDto,
  ): Promise<ProcessXenditWebhookResultDto> {
    const webhook = await this.paymentGateway.parseWebhook(input.payload);
    const orderRecord = await this.orderRepository.findByXenditInvoiceId(
      webhook.invoiceId,
    );
    if (!orderRecord) {
      throw new NotFoundException('Order not found for invoice');
    }

    const order = Order.create(orderRecord);
    if (webhook.status === 'PAID') {
      order.markPaid(webhook.paymentProof ?? null);
    } else if (webhook.status === 'EXPIRED' || webhook.status === 'FAILED') {
      order.cancel();
    } else {
      return { orderId: order.id, status: order.status, processed: false };
    }

    const updated = await this.orderRepository.update(order.id, {
      status: order.toPrimitives().status,
      paymentProof: order.toPrimitives().paymentProof,
    });

    if (webhook.status === 'PAID') {
      await this.awardOrderPointsUseCase.execute(updated);
    }

    return { orderId: updated.id, status: updated.status, processed: true };
  }
}
