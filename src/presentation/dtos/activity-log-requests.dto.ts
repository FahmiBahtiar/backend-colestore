import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { LogCategory } from '../../domain/entities';

const logCategories = [
  'AUTH',
  'USER',
  'PRODUCT',
  'ORDER',
  'PAYMENT',
  'DELIVERY',
  'COUPON',
  'SYSTEM',
  'SECURITY',
] as const;

export class ActivityLogQueryDto {
  @ApiPropertyOptional({ example: 'ORDER', enum: logCategories })
  @IsOptional()
  @IsIn(logCategories)
  category?: LogCategory;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
