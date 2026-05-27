import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IPaymentMethodConfigRepository,
  PaymentMethodConfigEntity,
} from '../../domain/repositories/payment-method-config.repository';

@Injectable()
export class PrismaPaymentMethodConfigRepository implements IPaymentMethodConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PaymentMethodConfigEntity[]> {
    const records = await this.prisma.paymentMethodConfig.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return records.map((r) => this.toEntity(r));
  }

  async findById(id: string): Promise<PaymentMethodConfigEntity | null> {
    const record = await this.prisma.paymentMethodConfig.findUnique({
      where: { id },
    });
    return record ? this.toEntity(record) : null;
  }

  async findByTypeAndChannel(
    type: string,
    channel: string,
  ): Promise<PaymentMethodConfigEntity | null> {
    const record = await this.prisma.paymentMethodConfig.findUnique({
      where: {
        type_channel: { type, channel },
      },
    });
    return record ? this.toEntity(record) : null;
  }

  async update(
    id: string,
    data: Partial<
      Pick<PaymentMethodConfigEntity, 'isActive' | 'paymentExpiryHours'>
    >,
  ): Promise<PaymentMethodConfigEntity> {
    const existing = await this.prisma.paymentMethodConfig.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Payment config not found`);
    }

    const record = await this.prisma.paymentMethodConfig.update({
      where: { id },
      data: {
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.paymentExpiryHours !== undefined && {
          paymentExpiryHours: data.paymentExpiryHours,
        }),
      },
    });
    return this.toEntity(record);
  }

  private toEntity(r: {
    id: string;
    type: string;
    channel: string;
    name: string;
    isActive: boolean;
    paymentExpiryHours: number;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentMethodConfigEntity {
    return {
      id: r.id,
      type: r.type,
      channel: r.channel,
      name: r.name,
      isActive: r.isActive,
      paymentExpiryHours: r.paymentExpiryHours,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
