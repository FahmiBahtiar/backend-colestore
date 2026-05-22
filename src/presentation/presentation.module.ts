import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ApplicationModule } from '../application/application.module';
import { InfrastructureModule } from '../infrastructure';
import {
  AuthController,
  CouponsController,
  FulfillmentController,
  OrdersController,
  PaymentsController,
  ProductsController,
} from './controllers';
import { JwtStrategy } from './strategies';

@Module({
  imports: [
    ApplicationModule,
    InfrastructureModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    AuthController,
    ProductsController,
    CouponsController,
    OrdersController,
    FulfillmentController,
    PaymentsController,
  ],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class PresentationModule {}
