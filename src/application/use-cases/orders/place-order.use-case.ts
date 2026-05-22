import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Coupon,
  Order,
  Product,
  ProductVariant,
} from '../../../domain/entities';
import {
  ICouponRepository,
  IOrderRepository,
  IProductRepository,
  OrderEntity,
} from '../../../domain/repositories';
import {
  COUPON_REPOSITORY,
  ORDER_ITEM_REPOSITORY,
  ORDER_REPOSITORY,
  PRODUCT_REPOSITORY,
  PRODUCT_VARIANT_REPOSITORY,
} from '../../../domain/repositories/tokens';
import {
  IOrderItemRepositoryPort,
  IPaymentGatewayPort,
  IProductVariantRepositoryPort,
  PAYMENT_GATEWAY,
} from '../../interfaces';
import { PlaceOrderInputDto, PlaceOrderResultDto } from '../../dtos';
import { OrderMapper } from '../../mappers';

@Injectable()
export class PlaceOrderUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PRODUCT_VARIANT_REPOSITORY)
    private readonly variantRepository: IProductVariantRepositoryPort,
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: ICouponRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(ORDER_ITEM_REPOSITORY)
    private readonly orderItemRepository: IOrderItemRepositoryPort,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGatewayPort,
  ) {}

  /** Place an order, apply coupon rules, and request a payment invoice. */
  async execute(input: PlaceOrderInputDto): Promise<PlaceOrderResultDto> {
    if (input.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const pricedItems = await Promise.all(
      input.items.map(async (item) => {
        const productRecord = await this.productRepository.findById(
          item.productId,
        );
        if (!productRecord) {
          throw new NotFoundException('Product not found');
        }

        const product = Product.create(productRecord);
        product.ensurePurchasable();

        const variantRecord = item.variantId
          ? await this.variantRepository.findById(item.variantId)
          : null;
        const variant = variantRecord
          ? ProductVariant.create(variantRecord)
          : null;
        const unitPrice = product.resolveUnitPrice(variant);
        product.decreaseStock(item.quantity, variant);

        return {
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
        };
      }),
    );

    const totalAmount = pricedItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const couponRecord = input.couponCode
      ? await this.couponRepository.findByCode(input.couponCode.toUpperCase())
      : null;
    const coupon = couponRecord ? Coupon.create(couponRecord) : null;
    const discountAmount = coupon ? coupon.calculateDiscount(totalAmount) : 0;
    const finalAmount = totalAmount - discountAmount;
    const now = new Date();

    const order = Order.create({
      id: 'new-order',
      userId: input.userId,
      totalAmount,
      discountAmount,
      finalAmount,
      status: 'PENDING',
      xenditInvoiceId: null,
      paymentProof: null,
      deliveredAt: null,
      deliveredById: null,
      deliveryNote: null,
      couponId: couponRecord?.id ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const createdOrder = await this.orderRepository.create(
      this.toCreateData(order.toPrimitives()),
    );
    await this.orderItemRepository.createMany(
      pricedItems.map((item) => ({
        orderId: createdOrder.id,
        productId: item.productId,
        variantId: item.variantId,
        couponId: couponRecord?.id ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    );
    if (couponRecord) {
      coupon?.markRedeemed();
      await this.couponRepository.incrementUsedCount(couponRecord.id);
    }

    const invoice = await this.paymentGateway.createInvoice({
      orderId: createdOrder.id,
      amount: createdOrder.finalAmount,
    });
    const orderWithInvoice = await this.orderRepository.update(
      createdOrder.id,
      {
        xenditInvoiceId: invoice.invoiceId,
      },
    );

    return {
      order: OrderMapper.toResponse(orderWithInvoice),
      invoiceId: invoice.invoiceId,
      invoiceUrl: invoice.invoiceUrl,
    };
  }

  private toCreateData(
    order: OrderEntity,
  ): Omit<OrderEntity, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      userId: order.userId,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      status: order.status,
      xenditInvoiceId: order.xenditInvoiceId,
      paymentProof: order.paymentProof,
      deliveredAt: order.deliveredAt,
      deliveredById: order.deliveredById,
      deliveryNote: order.deliveryNote,
      couponId: order.couponId,
    };
  }
}
