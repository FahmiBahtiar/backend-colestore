import { Inject, Injectable } from '@nestjs/common';
import {
  IPaymentMethodConfigRepository,
  PaymentMethodConfigEntity,
} from '../../../domain/repositories/payment-method-config.repository';
import { PAYMENT_METHOD_CONFIG_REPOSITORY } from '../../../domain/repositories/tokens';

@Injectable()
export class GetPaymentMethodConfigsUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_CONFIG_REPOSITORY)
    private readonly configRepository: IPaymentMethodConfigRepository,
  ) {}

  async execute(): Promise<PaymentMethodConfigEntity[]> {
    return this.configRepository.findAll();
  }
}
