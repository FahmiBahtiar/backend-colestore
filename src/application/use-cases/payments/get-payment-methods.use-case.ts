import { Inject, Injectable } from '@nestjs/common';
import {
  IPaymentGatewayPort,
  PaymentMethodOption,
  PAYMENT_GATEWAY,
} from '../../interfaces';
import { IPaymentMethodConfigRepository } from '../../../domain/repositories/payment-method-config.repository';
import { PAYMENT_METHOD_CONFIG_REPOSITORY } from '../../../domain/repositories/tokens';

@Injectable()
export class GetPaymentMethodsUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGatewayPort,
    @Inject(PAYMENT_METHOD_CONFIG_REPOSITORY)
    private readonly configRepository: IPaymentMethodConfigRepository,
  ) {}

  /** Return available payment methods for the custom checkout flow. */
  async execute(): Promise<PaymentMethodOption[]> {
    const [allMethods, dbConfigs] = await Promise.all([
      this.paymentGateway.getAvailablePaymentMethods(),
      this.configRepository.findAll(),
    ]);

    // Filter to only include methods where isActive = true in DB
    return allMethods.filter((method) => {
      const dbConfig = dbConfigs.find(
        (c) => c.type === method.type && c.channel === method.channel,
      );
      return dbConfig ? dbConfig.isActive : true;
    });
  }
}
