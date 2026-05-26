import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { paymentEvents } from '../../application/interfaces/payment-events';

@WebSocketGateway({
  cors: {
    origin: '*', // Di production, Anda bisa membatasi ini ke domain frontend spesifik
  },
})
export class OrdersGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  afterInit() {
    this.logger.log('WebSocket Gateway initialized.');

    // Listen to internal payment events and broadcast to the respective room
    paymentEvents.on(
      'payment_success',
      (data: { orderId: string; status: string }) => {
        const room = `order:${data.orderId}`;
        if (this.server) {
          this.server.to(room).emit('paymentSuccess', data);
          this.logger.log(
            `[WebSocket] Broadcasted paymentSuccess to room: ${room}`,
          );
        } else {
          this.logger.warn(
            '[WebSocket] Server is not ready yet, skipping broadcast',
          );
        }
      },
    );
  }

  /** Client (Next.js) joins a room for a specific order */
  @SubscribeMessage('joinOrder')
  handleJoinOrder(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `order:${data.orderId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return { status: 'success', room };
  }
}
