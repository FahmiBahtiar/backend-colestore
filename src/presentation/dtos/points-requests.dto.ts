import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsDateString,
} from 'class-validator';

export class ListPointsQueryDto {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number;
}

export class ListPointRewardsQueryDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number;
}

export class CreatePointRewardRequestDto {
  @ApiProperty({ example: 'Diskon Rp 10.000' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Tukarkan 100 point untuk diskon Rp 10.000' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  pointCost: number;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED'], example: 'FIXED' })
  @IsEnum(['PERCENTAGE', 'FIXED'])
  discountType: 'PERCENTAGE' | 'FIXED';

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(1)
  discountValue: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdatePointRewardRequestDto {
  @ApiPropertyOptional({ example: 'Diskon Rp 15.000' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Tukarkan 150 point untuk diskon Rp 15.000' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pointCost?: number;

  @ApiPropertyOptional({ enum: ['PERCENTAGE', 'FIXED'], example: 'FIXED' })
  @IsOptional()
  @IsEnum(['PERCENTAGE', 'FIXED'])
  discountType?: 'PERCENTAGE' | 'FIXED';

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  discountValue?: number;

  @ApiPropertyOptional({ example: 75000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
