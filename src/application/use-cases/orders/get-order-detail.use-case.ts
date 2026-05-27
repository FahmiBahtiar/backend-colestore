import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Order } from '../../../domain/entities';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { OrderResponseDto } from '../../dtos';
import { OrderMapper } from '../../mappers';
import { IPaymentGatewayPort, PAYMENT_GATEWAY } from '../../interfaces';
import { AwardOrderPointsUseCase } from '../points/award-order-points.use-case';
import { paymentEvents } from '../../interfaces/payment-events';

@Injectable()
export class GetOrderDetailUseCase {
  private readonly logger = new Logger(GetOrderDetailUseCase.name);

  // Static Map to enforce cooldown between Duitku status queries per order
  private static readonly pollCooldowns = new Map<string, number>();

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGatewayPort,
    private readonly awardOrderPointsUseCase: AwardOrderPointsUseCase,
  ) {}

  /** Retrieve one order by id. */
  async execute(orderId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Auto-cancel if the payment expiration time has passed
    const now = Date.now();
    if (
      order.status === 'PENDING' &&
      order.paymentGatewayExpiresAt &&
      now > new Date(order.paymentGatewayExpiresAt).getTime()
    ) {
      this.logger.log(
        `Order ${order.id} payment expired, automatically updating status to CANCELLED...`,
      );
      const orderEntity = Order.create(order);
      orderEntity.cancel();

      const updated = await this.orderRepository.update(order.id, {
        status: 'CANCELLED',
      });

      // Emit WebSocket event to update connected clients in real-time
      paymentEvents.emit('payment_status_changed', {
        orderId: order.id,
        status: 'CANCELLED',
      });

      return OrderMapper.toResponse(updated);
    }

    // Active polling/pulling: Check transaction status directly with Duitku
    // if the order is still PENDING. This is a robust fallback when webhooks are blocked.
    // We enforce a 30-second cooldown per order to completely avoid Duitku rate limit blocks.
    const lastPolled = GetOrderDetailUseCase.pollCooldowns.get(order.id) || 0;
    const cooldownMs = 30000; // 30 seconds

    if (
      order.status === 'PENDING' &&
      this.paymentGateway.checkTransactionStatus &&
      now - lastPolled > cooldownMs
    ) {
      // Set the cooldown timestamp immediately to prevent race conditions
      GetOrderDetailUseCase.pollCooldowns.set(order.id, now);

      // Automatically evict/cleanup this entry from the map after the cooldown expires
      setTimeout(() => {
        GetOrderDetailUseCase.pollCooldowns.delete(order.id);
      }, cooldownMs);

      try {
        const checkResult = await this.paymentGateway.checkTransactionStatus(
          order.id,
        );
        if (checkResult.status === 'PAID') {
          this.logger.log(
            `Active polling: Order ${order.id} detected as PAID via Duitku inquiry, updating database...`,
          );

          const orderEntity = Order.create(order);
          orderEntity.markPaid(checkResult.paymentProof ?? null);

          const updated = await this.orderRepository.update(order.id, {
            status: orderEntity.toPrimitives().status,
            paymentProof: orderEntity.toPrimitives().paymentProof,
          });

          await this.awardOrderPointsUseCase.execute(updated);

          // Emit the payment success event to update connected WebSocket clients in real-time
          paymentEvents.emit('payment_status_changed', {
            orderId: order.id,
            status: 'PAID',
          });

          return OrderMapper.toResponse(updated);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to perform active polling on order ${order.id}: ${errorMessage}`,
        );
      }
    } else if (order.status === 'PENDING' && now - lastPolled <= cooldownMs) {
      this.logger.log(
        `Active polling for order ${order.id} skipped (cooldown active: ${Math.round((cooldownMs - (now - lastPolled)) / 1000)}s remaining)`,
      );
    }

    return OrderMapper.toResponse(order);
  }
}
