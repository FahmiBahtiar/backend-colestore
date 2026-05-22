import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import {
  COUPON_REPOSITORY,
  ORDER_ITEM_REPOSITORY,
  ORDER_REPOSITORY,
  PRODUCT_REPOSITORY,
  PRODUCT_VARIANT_REPOSITORY,
  USER_REPOSITORY,
} from '../domain/repositories/tokens';
import { InfrastructureModule } from '../infrastructure';
import {
  PrismaCouponRepository,
  PrismaOrderItemRepository,
  PrismaOrderRepository,
  PrismaProductRepository,
  PrismaProductVariantRepository,
  PrismaUserRepository,
} from '../infrastructure/repositories';
import {
  CreateCouponUseCase,
  CreateProductUseCase,
  CreateProductVariantUseCase,
  DeliverOrderUseCase,
  GetOrderDetailUseCase,
  GetUserOrdersUseCase,
  ListProductsUseCase,
  LoginUseCase,
  PlaceOrderUseCase,
  ProcessXenditWebhookUseCase,
  RedeemCouponUseCase,
  RefreshTokenUseCase,
  RegisterUserUseCase,
  RefundOrderUseCase,
  StartOrderProcessingUseCase,
  TokenService,
  UpdateProductUseCase,
  ValidateCouponUseCase,
} from './use-cases';

const repositoryProviders = [
  { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
  {
    provide: PRODUCT_VARIANT_REPOSITORY,
    useClass: PrismaProductVariantRepository,
  },
  { provide: COUPON_REPOSITORY, useClass: PrismaCouponRepository },
  { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
  { provide: ORDER_ITEM_REPOSITORY, useClass: PrismaOrderItemRepository },
];

const useCaseProviders = [
  TokenService,
  RegisterUserUseCase,
  LoginUseCase,
  RefreshTokenUseCase,
  CreateProductUseCase,
  UpdateProductUseCase,
  CreateProductVariantUseCase,
  ListProductsUseCase,
  CreateCouponUseCase,
  ValidateCouponUseCase,
  RedeemCouponUseCase,
  PlaceOrderUseCase,
  GetUserOrdersUseCase,
  GetOrderDetailUseCase,
  ProcessXenditWebhookUseCase,
  StartOrderProcessingUseCase,
  DeliverOrderUseCase,
  RefundOrderUseCase,
];

@Module({
  imports: [
    forwardRef(() => InfrastructureModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          'jwt.secret',
          'change-me-in-production',
        ),
        signOptions: {
          expiresIn: configService.get<string>(
            'jwt.accessExpiration',
            '15m',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  providers: [...repositoryProviders, ...useCaseProviders],
  exports: [JwtModule, ...repositoryProviders, ...useCaseProviders],
})
export class ApplicationModule {}
