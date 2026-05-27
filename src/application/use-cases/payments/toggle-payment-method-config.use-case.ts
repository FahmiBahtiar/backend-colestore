import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IPaymentMethodConfigRepository,
  PaymentMethodConfigEntity,
} from '../../../domain/repositories/payment-method-config.repository';
import { PAYMENT_METHOD_CONFIG_REPOSITORY } from '../../../domain/repositories/tokens';

export interface TogglePaymentMethodConfigInput {
  isActive?: boolean;
  paymentExpiryHours?: number;
}

@Injectable()
export class TogglePaymentMethodConfigUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_CONFIG_REPOSITORY)
    private readonly configRepository: IPaymentMethodConfigRepository,
  ) {}

  async execute(
    id: string,
    input: TogglePaymentMethodConfigInput,
  ): Promise<PaymentMethodConfigEntity> {
    const existing = await this.configRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        `Payment method config with ID ${id} not found`,
      );
    }

    return this.configRepository.update(id, input);
  }
}
