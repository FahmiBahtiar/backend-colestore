import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
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
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

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
    private readonly prisma: PrismaService,
  ) {}

  /** Place an order, apply coupon rules, and request a payment via custom checkout. */
  private generateRequestHash(input: PlaceOrderInputDto): string {
    const payload = {
      items: input.items
        .map((item) => ({
          productId: item.productId,
          variantId: this.normalizeOptionalId(item.variantId),
          quantity: item.quantity,
          checkoutAnswers:
            item.checkoutAnswers?.map((ans) => ({
              checkoutFieldId: ans.checkoutFieldId,
              label: ans.label,
              value: ans.value,
            })) || [],
        }))
        .sort((a, b) => a.productId.localeCompare(b.productId)),
      couponCode: input.couponCode?.toUpperCase() || null,
      customerEmail: input.customerEmail.toLowerCase().trim(),
      customerWhatsapp: input.customerWhatsapp.trim(),
      paymentMethodType: input.paymentMethodType,
      paymentChannel: input.paymentChannel,
    };
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /** Place an order, apply coupon rules, and request a payment via custom checkout. */
  async execute(input: PlaceOrderInputDto): Promise<PlaceOrderResultDto> {
    if (input.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const idempotencyKey = input.idempotencyKey;
    const requestHash = this.generateRequestHash(input);

    let userIdScope = input.userId ?? null;
    if (!userIdScope && input.customerEmail) {
      const user = await this.userRepository.findByEmail(
        input.customerEmail.toLowerCase().trim(),
      );
      if (user) {
        userIdScope = user.id;
      }
    }
    const idempotencyUser = userIdScope ?? 'GUEST';

    if (idempotencyKey) {
      try {
        await this.prisma.idempotencyKey.create({
          data: {
            userId: idempotencyUser,
            key: idempotencyKey,
            requestHash,
            status: 'PROCESSING',
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const existing = await this.prisma.idempotencyKey.findUnique({
            where: {
              userId_key: {
                userId: idempotencyUser,
                key: idempotencyKey,
              },
            },
          });

          if (!existing) {
            throw new ConflictException(
              'Transaksi sedang diproses. Silakan coba lagi.',
            );
          }

          if (existing.requestHash !== requestHash) {
            throw new ConflictException(
              'Idempotency key telah digunakan untuk transaksi yang berbeda.',
            );
          }

          if (existing.status === 'PROCESSING') {
            throw new ConflictException(
              'Transaksi Anda sedang diproses. Silakan tunggu.',
            );
          }

          if (existing.status === 'SUCCESS') {
            return existing.responsePayload as unknown as PlaceOrderResultDto;
          }

          if (existing.status === 'FAILED') {
            throw new BadRequestException(
              'Transaksi sebelumnya telah gagal. Silakan coba lagi dengan Key baru.',
            );
          }

          if (existing.status === 'COMPENSATED') {
            throw new BadRequestException(
              'Transaksi dibatalkan karena kegagalan pembayaran. Silakan coba lagi.',
            );
          }
        }
        throw error;
      }
    }

    // Outer try-catch to update status to FAILED if the transaction itself throws
    try {
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
                  ans.checkoutFieldId === config.id ||
                  ans.label === config.label,
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
        id: this.generateOrderId(),
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

      // Execute safe checkout inside strict ACID transaction
      const { createdOrder, pricedItemsWithOrder } =
        await this.prisma.$transaction(async (tx) => {
          // 1. Concurrency-safe atomic conditional stock check and decrement
          for (const item of pricedItems) {
            if (item.variantId) {
              const updated = await tx.productVariant.updateMany({
                where: {
                  id: item.variantId,
                  stockQuantity: { gte: item.quantity },
                },
                data: {
                  stockQuantity: { decrement: item.quantity },
                },
              });
              if (updated.count === 0) {
                throw new BadRequestException(
                  `Stok varian produk '${item.variantName ?? item.productName}' tidak mencukupi`,
                );
              }
            } else {
              const updated = await tx.product.updateMany({
                where: {
                  id: item.productId,
                  stockQuantity: { gte: item.quantity },
                },
                data: {
                  stockQuantity: { decrement: item.quantity },
                },
              });
              if (updated.count === 0) {
                throw new BadRequestException(
                  `Stok produk '${item.productName}' tidak mencukupi`,
                );
              }
            }
          }

          // 2. Coupon redemption validation and usedCount increment
          if (couponRecord) {
            const dbCoupon = await tx.coupon.findUnique({
              where: { id: couponRecord.id },
            });
            if (!dbCoupon) {
              throw new NotFoundException('Kupon tidak ditemukan');
            }
            if (dbCoupon.maxUses && dbCoupon.usedCount >= dbCoupon.maxUses) {
              throw new BadRequestException(
                'Kupon telah melebihi batas penggunaan.',
              );
            }
            await tx.coupon.update({
              where: { id: couponRecord.id },
              data: { usedCount: { increment: 1 } },
            });
          }

          // 3. Persist Order in DB
          const orderData = this.toCreateData(order.toPrimitives());
          const created = await tx.order.create({
            data: {
              id: orderData.id,
              userId: orderData.userId,
              customerEmail: orderData.customerEmail,
              customerWhatsapp: orderData.customerWhatsapp,
              totalAmount: new Prisma.Decimal(orderData.totalAmount),
              discountAmount: new Prisma.Decimal(orderData.discountAmount),
              finalAmount: new Prisma.Decimal(orderData.finalAmount),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              status: orderData.status as any,
              couponId: orderData.couponId,
            },
          });

          // 4. Persist Order Items and dynamic field answers in DB
          for (const item of pricedItems) {
            await tx.orderItem.create({
              data: {
                orderId: created.id,
                productId: item.productId,
                variantId: item.variantId,
                couponId: couponRecord?.id ?? null,
                quantity: item.quantity,
                unitPrice: new Prisma.Decimal(item.unitPrice),
                subtotal: new Prisma.Decimal(item.subtotal),
                ...(item.checkoutAnswers?.length && {
                  checkoutAnswers: {
                    create: item.checkoutAnswers.map((ans) => ({
                      checkoutFieldId: ans.checkoutFieldId,
                      label: ans.label,
                      value: ans.value,
                    })),
                  },
                }),
              },
            });
          }

          return { createdOrder: created, pricedItemsWithOrder: pricedItems };
        });

      // 5. Query active payment methods config outside the transaction boundary
      const config = await this.configRepository.findByTypeAndChannel(
        input.paymentMethodType,
        input.paymentChannel,
      );
      const configHours = config?.paymentExpiryHours ?? 24;
      const configMinutes = config?.paymentExpiryMinutes ?? 0;
      const expiryMinutes = configHours * 60 + configMinutes;

      try {
        // 6. External payment request (Duitku) - isolated from SQL locks
        const paymentResult = await this.paymentGateway.createPaymentRequest({
          orderId: createdOrder.id,
          amount: Number(createdOrder.finalAmount),
          paymentMethodType: input.paymentMethodType,
          paymentChannel: input.paymentChannel,
          payerEmail: input.customerEmail,
          payerPhone: input.customerWhatsapp,
          expiryMinutes,
          items: pricedItemsWithOrder.map((item) => ({
            name: this.buildInvoiceItemName(item.productName, item.variantName),
            quantity: item.quantity,
            price: item.unitPrice,
          })),
        });

        // 7. Update order payment references
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

        const responsePayload = {
          order: OrderMapper.toCheckoutResponse(orderWithPayment),
          paymentRequestId: paymentResult.paymentRequestId,
          paymentInstructions: paymentResult.paymentInstructions,
        };

        // Cache success payload on idempotency record
        if (idempotencyKey) {
          await this.prisma.idempotencyKey.update({
            where: {
              userId_key: {
                userId: idempotencyUser,
                key: idempotencyKey,
              },
            },
            data: {
              status: 'SUCCESS',
              responsePayload:
                responsePayload as unknown as Prisma.InputJsonValue,
              orderId: createdOrder.id,
            },
          });
        }

        return responsePayload;
      } catch (error) {
        // 8. Gateway Compensation/Saga Rollback: Atomic guard status PENDING -> CANCELLED
        const transitionResult = await this.prisma.order.updateMany({
          where: { id: createdOrder.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });

        if (transitionResult.count > 0) {
          // Restore stock and coupons exactly once
          for (const item of pricedItemsWithOrder) {
            if (item.variantId) {
              await this.prisma.productVariant.update({
                where: { id: item.variantId },
                data: { stockQuantity: { increment: item.quantity } },
              });
            } else {
              await this.prisma.product.update({
                where: { id: item.productId },
                data: { stockQuantity: { increment: item.quantity } },
              });
            }
          }

          if (couponRecord) {
            await this.prisma.coupon.updateMany({
              where: { id: couponRecord.id, usedCount: { gt: 0 } },
              data: { usedCount: { decrement: 1 } },
            });
          }
        }

        if (idempotencyKey) {
          await this.prisma.idempotencyKey.update({
            where: {
              userId_key: {
                userId: idempotencyUser,
                key: idempotencyKey,
              },
            },
            data: {
              status: 'COMPENSATED',
              orderId: createdOrder.id,
            },
          });
        }

        throw new BadRequestException(
          `Gagal membuat permintaan pembayaran: ${error instanceof Error ? error.message : 'Unknown payment gateway error'}`,
        );
      }
    } catch (globalError) {
      if (idempotencyKey) {
        try {
          const existingKey = await this.prisma.idempotencyKey.findUnique({
            where: {
              userId_key: {
                userId: idempotencyUser,
                key: idempotencyKey,
              },
            },
          });
          if (existingKey && existingKey.status === 'PROCESSING') {
            await this.prisma.idempotencyKey.update({
              where: {
                userId_key: {
                  userId: idempotencyUser,
                  key: idempotencyKey,
                },
              },
              data: {
                status: 'FAILED',
              },
            });
          }
        } catch {
          // Keep logging silent to preserve the original exception
        }
      }
      throw globalError;
    }
  }

  private toCreateData(
    order: OrderProps,
  ): Omit<OrderEntity, 'createdAt' | 'updatedAt'> {
    return {
      id: order.id,
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

  private generateOrderId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'APM';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
