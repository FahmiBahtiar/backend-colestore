import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePaymentConfigDto {
  @ApiPropertyOptional({ description: 'Active status of the payment method' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Payment expiry limit in hours',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  paymentExpiryHours?: number;

  @ApiPropertyOptional({
    description: 'Payment expiry limit in minutes',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  paymentExpiryMinutes?: number;
}
