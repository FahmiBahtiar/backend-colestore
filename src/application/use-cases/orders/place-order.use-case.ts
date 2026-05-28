import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Coupon,
  Order,
  OrderProps,
  Product,
  ProductVariant,
} from '../../../domain/entities';
import {
  ICouponRepository,
  IOrderRepository,
  IProductRepository,
  IUserRepository,
  OrderEntity,
} from '../../../domain/repositories';
import {
  COUPON_REPOSITORY,
  ORDER_ITEM_REPOSITORY,
  ORDER_REPOSITORY,
  PRODUCT_REPOSITORY,
  PRODUCT_VARIANT_REPOSITORY,
  PAYMENT_METHOD_CONFIG_REPOSITORY,
  USER_REPOSITORY,
} from '../../../domain/repositories/tokens';
import { IPaymentMethodConfigRepository } from '../../../domain/repositories/payment-method-config.repository';
import {
  IOrderItemRepositoryPort,
  IPaymentGatewayPort,
  IProductVariantRepositoryPort,
  ProductVariantRecord,
  PAYMENT_GATEWAY,
} from '../../interfaces';
import { PlaceOrderInputDto, PlaceOrderResultDto } from '../../dtos';
import { throwBadRequestForDomainError } from '../../errors';
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
    @Inject(PAYMENT_METHOD_CONFIG_REPOSITORY)
    private readonly configRepository: IPaymentMethodConfigRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGatewayPort,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  /** Place an order, apply coupon rules, and request a payment via custom checkout. */
  async execute(input: PlaceOrderInputDto): Promise<PlaceOrderResultDto> {
    if (input.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const pricedItems = await Promise.all(
      input.items.map(async (item) => {
        const variantId = this.normalizeOptionalId(item.variantId);
        const productRecord = await this.productRepository.findById(
          item.productId,
        );
        if (!productRecord) {
          throw new NotFoundException('Product not found');
        }

        const product = Product.create(productRecord);
        product.ensurePurchasable();

        // Relational dynamic custom fields validation
        const configuredFields = productRecord.checkoutFields || [];
        const answers = item.checkoutAnswers || [];

        for (const config of configuredFields) {
          if (config.isRequired) {
            const givenAnswer = answers.find(
              (ans) =>
                ans.checkoutFieldId === config.id || ans.label === config.label,
            );
            if (
              !givenAnswer ||
              !givenAnswer.value ||
              !givenAnswer.value.trim()
            ) {
              throw new BadRequestException(
                `Field '${config.label}' is required for product '${productRecord.name}'`,
              );
            }
          }
        }

        const variantRecord = await this.resolveVariantRecord(
          productRecord,
          variantId,
        );
        const variant = variantRecord
          ? ProductVariant.create(variantRecord)
          : null;
        const unitPrice = this.resolveUnitPrice(product, variant);
        this.decreaseStock(product, item.quantity, variant);
        await this.persistStock(product, variant);

        return {
          productId: item.productId,
          variantId,
          productName: productRecord.name,
          variantName: variantRecord?.name ?? null,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
          checkoutAnswers: answers.map((ans) => {
            const config = configuredFields.find(
              (cf) => cf.id === ans.checkoutFieldId || cf.label === ans.label,
            );
            return {
              checkoutFieldId: config?.id ?? null,
              label: ans.label,
              value: ans.value,
            };
          }),
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

    if (couponRecord) {
      if (couponRecord.userId && couponRecord.userId !== input.userId) {
        throw new BadRequestException(
          'This coupon is not assigned to you or is invalid.',
        );
      }
    }

    const coupon = couponRecord ? Coupon.create(couponRecord) : null;
    const discountAmount = coupon
      ? this.calculateDiscount(coupon, totalAmount)
      : 0;
    const finalAmount = totalAmount - discountAmount;
    const now = new Date();

    let userId = input.userId ?? null;
    if (!userId && input.customerEmail) {
      const user = await this.userRepository.findByEmail(
        input.customerEmail.toLowerCase().trim(),
      );
      if (user) {
        userId = user.id;
      }
    }

    const order = Order.create({
      id: 'new-order',
      userId,
      customerEmail: input.customerEmail,
      customerWhatsapp: input.customerWhatsapp,
      totalAmount,
      discountAmount,
      finalAmount,
      status: 'PENDING',
      paymentGatewayInvoiceId: null,
      paymentGatewayInvoiceUrl: null,
      paymentGatewayExpiresAt: null,
      paymentGatewayRequestId: null,
      paymentMethodType: null,
      paymentChannel: null,
      paymentInstructions: null,
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
        checkoutAnswers: item.checkoutAnswers,
      })),
    );
    if (couponRecord) {
      this.markCouponRedeemed(coupon);
      await this.couponRepository.incrementUsedCount(couponRecord.id);
    }

    const config = await this.configRepository.findByTypeAndChannel(
      input.paymentMethodType,
      input.paymentChannel,
    );
    const configHours = config?.paymentExpiryHours ?? 24;
    const configMinutes = config?.paymentExpiryMinutes ?? 0;
    const expiryMinutes = configHours * 60 + configMinutes;

    // Custom checkout: create Payment Request via active PAYMENT_GATEWAY
    const paymentResult = await this.paymentGateway.createPaymentRequest({
      orderId: createdOrder.id,
      amount: createdOrder.finalAmount,
      paymentMethodType: input.paymentMethodType,
      paymentChannel: input.paymentChannel,
      payerEmail: input.customerEmail,
      payerPhone: input.customerWhatsapp,
      expiryMinutes,
      items: pricedItems.map((item) => ({
        name: this.buildInvoiceItemName(item.productName, item.variantName),
        quantity: item.quantity,
        price: item.unitPrice,
      })),
    });

    const orderWithPayment = await this.orderRepository.update(
      createdOrder.id,
      {
        paymentGatewayRequestId: paymentResult.paymentRequestId,
        paymentMethodType: paymentResult.paymentMethodType,
        paymentChannel: paymentResult.paymentChannel,
        paymentInstructions: paymentResult.paymentInstructions,
        paymentGatewayExpiresAt: paymentResult.expiresAt,
      },
    );

    return {
      order: OrderMapper.toResponse(orderWithPayment),
      paymentRequestId: paymentResult.paymentRequestId,
      paymentInstructions: paymentResult.paymentInstructions,
    };
  }

  private toCreateData(
    order: OrderProps,
  ): Omit<OrderEntity, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      userId: order.userId,
      customerEmail: order.customerEmail,
      customerWhatsapp: order.customerWhatsapp,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      status: order.status,
      paymentGatewayInvoiceId: order.paymentGatewayInvoiceId,
      paymentGatewayInvoiceUrl: order.paymentGatewayInvoiceUrl,
      paymentGatewayExpiresAt: order.paymentGatewayExpiresAt,
      paymentGatewayRequestId: order.paymentGatewayRequestId,
      paymentMethodType: order.paymentMethodType,
      paymentChannel: order.paymentChannel,
      paymentInstructions: order.paymentInstructions,
      paymentProof: order.paymentProof,
      deliveredAt: order.deliveredAt,
      deliveredById: order.deliveredById,
      deliveryNote: order.deliveryNote,
      couponId: order.couponId,
    };
  }

  private async resolveVariantRecord(
    product: { id: string; hasVariants: boolean },
    variantId: string | null,
  ): Promise<ProductVariantRecord | null> {
    if (!product.hasVariants && variantId) {
      throw new BadRequestException('Product does not support variants');
    }
    if (product.hasVariants && !variantId) {
      throw new BadRequestException('Variant is required for this product');
    }
    if (!variantId) return null;

    const variant = await this.variantRepository.findById(variantId);
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
    if (variant.productId !== product.id) {
      throw new BadRequestException(
        'Product variant does not belong to product',
      );
    }
    return variant;
  }

  private normalizeOptionalId(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private buildInvoiceItemName(
    productName: string,
    variantName: string | null,
  ): string {
    return variantName ? `${productName} - ${variantName}` : productName;
  }

  private resolveUnitPrice(
    product: Product,
    variant: ProductVariant | null,
  ): number {
    try {
      return product.resolveUnitPrice(variant);
    } catch (error) {
      throwBadRequestForDomainError(error);
    }
  }

  private decreaseStock(
    product: Product,
    quantity: number,
    variant: ProductVariant | null,
  ): void {
    try {
      product.decreaseStock(quantity, variant);
    } catch (error) {
      throwBadRequestForDomainError(error);
    }
  }

  private async persistStock(
    product: Product,
    variant: ProductVariant | null,
  ): Promise<void> {
    if (variant) {
      const props = variant.toPrimitives();
      await this.variantRepository.update(props.id, {
        stockQuantity: props.stockQuantity,
      });
      return;
    }

    const props = product.toPrimitives();
    await this.productRepository.update(props.id, {
      stockQuantity: props.stockQuantity,
    });
  }

  private calculateDiscount(coupon: Coupon, totalAmount: number): number {
    try {
      return coupon.calculateDiscount(totalAmount);
    } catch (error) {
      throwBadRequestForDomainError(error);
    }
  }

  private markCouponRedeemed(coupon: Coupon | null): void {
    if (!coupon) return;
    try {
      coupon.markRedeemed();
    } catch (error) {
      throwBadRequestForDomainError(error);
    }
  }
}
