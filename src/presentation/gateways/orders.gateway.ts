import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ORDER_REPOSITORY } from '../../domain/repositories/tokens';
import { IOrderRepository } from '../../domain/repositories';
import { paymentEvents } from '../../application/interfaces/payment-events';

const getCorsOrigin = () => {
  const origin = process.env.CORS_ORIGIN;
  if (!origin) return '*';
  if (origin.includes(',')) {
    return origin.split(',').map((o) => o.trim());
  }
  return origin;
};

@WebSocketGateway({
  cors: {
    origin: getCorsOrigin(),
  },
})
export class OrdersGateway implements OnGatewayInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private handlePaymentStatusChanged = (data: {
    orderId: string;
    status: string;
  }) => {
    const room = `order:${data.orderId}`;
    if (this.server) {
      // Emit the generic event name for modern/secure handlers
      this.server.to(room).emit('orderStatusChanged', data);

      // Emit the legacy paymentSuccess event specifically for PAID status to preserve compatibility
      if (data.status === 'PAID') {
        this.server.to(room).emit('paymentSuccess', data);
      }

      this.logger.log(
        `[WebSocket] Broadcasted payment status change (${data.status}) to room: ${room}`,
      );
    } else {
      this.logger.warn(
        '[WebSocket] Server is not ready yet, skipping broadcast',
      );
    }
  };

  afterInit() {
    this.logger.log('WebSocket Gateway initialized.');
    paymentEvents.on('payment_status_changed', this.handlePaymentStatusChanged);
  }

  onModuleDestroy() {
    this.logger.log(
      'WebSocket Gateway destroyed. Removing payment_status_changed listener.',
    );
    paymentEvents.off(
      'payment_status_changed',
      this.handlePaymentStatusChanged,
    );
  }

  /** Client joins a room for a specific order (secured with CUID unguessability + registered user ownership verification) */
  @SubscribeMessage('joinOrder')
  async handleJoinOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.orderId) {
      return { status: 'error', message: 'Order ID is required' };
    }

    const order = await this.orderRepository.findById(data.orderId);
    if (!order) {
      this.logger.warn(
        `Join room request failed: Order ${data.orderId} not found`,
      );
      return { status: 'error', message: 'Order not found' };
    }

    // If the order belongs to a registered user, we must enforce token authentication and ownership
    if (order.userId !== null) {
      const auth = client.handshake.auth as Record<string, unknown> | undefined;
      let token = typeof auth?.token === 'string' ? auth.token : undefined;
      if (token && token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      interface JwtPayload {
        sub: string;
        role: string;
      }

      let decoded: JwtPayload | null = null;
      if (token) {
        try {
          const secret = this.configService.getOrThrow<string>('jwt.secret');
          decoded = this.jwtService.verify<JwtPayload>(token, { secret });
        } catch (err) {
          const error = err as Error;
          this.logger.warn(
            `WebSocket JWT verification failed: ${error.message}`,
          );
        }
      }

      if (!decoded) {
        this.logger.warn(
          `Unauthorized WebSocket join request for order: ${data.orderId}`,
        );
        return {
          status: 'error',
          message: 'Unauthorized: Valid token required for this order',
        };
      }

      if (decoded.sub !== order.userId && decoded.role !== 'ADMIN') {
        this.logger.warn(
          `Forbidden WebSocket join request for order: ${data.orderId} from user: ${decoded.sub}`,
        );
        return {
          status: 'error',
          message: 'Forbidden: You do not own this order',
        };
      }
    }

    // Guest checkout (order.userId === null) or authenticated user/admin
    const room = `order:${data.orderId}`;
    await client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return { status: 'success', room };
  }
}
