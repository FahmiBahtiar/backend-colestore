export interface PaymentMethodConfigEntity {
  id: string;
  type: string; // e.g. VIRTUAL_ACCOUNT, QR_CODE, EWALLET
  channel: string; // e.g. BCA, BNI, QRIS, OVO, DANA
  name: string;
  isActive: boolean;
  paymentExpiryHours: number;
  paymentExpiryMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentMethodConfigRepository {
  findAll(): Promise<PaymentMethodConfigEntity[]>;
  findById(id: string): Promise<PaymentMethodConfigEntity | null>;
  findByTypeAndChannel(
    type: string,
    channel: string,
  ): Promise<PaymentMethodConfigEntity | null>;
  update(
    id: string,
    data: Partial<
      Pick<
        PaymentMethodConfigEntity,
        'isActive' | 'paymentExpiryHours' | 'paymentExpiryMinutes'
      >
    >,
  ): Promise<PaymentMethodConfigEntity>;
}
