import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ApplicationModule } from '../application/application.module';
import { InfrastructureModule } from '../infrastructure';
import {
  ActivityLogsController,
  AdminDashboardController,
  AuthController,
  CategoriesController,
  CouponsController,
  FulfillmentController,
  OrdersController,
  PaymentsController,
  ProductsController,
  UsersController,
  PointsController,
  PointRewardsController,
  FaqsController,
} from './controllers';
import { JwtStrategy } from './strategies';
import { OrdersGateway } from './gateways/orders.gateway';

@Module({
  imports: [
    ApplicationModule,
    InfrastructureModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    ActivityLogsController,
    AdminDashboardController,
    AuthController,
    CategoriesController,
    UsersController,
    ProductsController,
    CouponsController,
    OrdersController,
    FulfillmentController,
    PaymentsController,
    PointsController,
    PointRewardsController,
    FaqsController,
  ],
  providers: [JwtStrategy, OrdersGateway],
  exports: [PassportModule],
})
export class PresentationModule {}
