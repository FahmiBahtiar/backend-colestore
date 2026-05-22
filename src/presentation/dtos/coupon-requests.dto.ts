import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { DiscountType } from '../../domain/entities';

export class CreateCouponRequestDto {
  @ApiProperty({ example: 'LAUNCH25' })
  @IsString()
  @MinLength(3)
  code: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'], example: 'PERCENTAGE' })
  @IsEnum(['PERCENTAGE', 'FIXED'])
  discountType: DiscountType;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @IsPositive()
  discountValue: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  maxUses?: number | null;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateCouponRequestDto {
  @ApiProperty({ example: 'LAUNCH25' })
  @IsString()
  @MinLength(3)
  code: string;

  @ApiProperty({ example: 250000 })
  @IsNumber()
  @Min(0)
  orderAmount: number;
}
