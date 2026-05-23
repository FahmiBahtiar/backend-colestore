import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ApplicationModule } from '../application/application.module';
import { InfrastructureModule } from '../infrastructure';
import {
  AuthController,
  CategoriesController,
  CouponsController,
  FulfillmentController,
  OrdersController,
  PaymentsController,
  ProductsController,
  UsersController,
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
    CategoriesController,
    UsersController,
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
