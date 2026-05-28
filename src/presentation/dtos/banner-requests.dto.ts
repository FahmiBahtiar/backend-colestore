import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBannerRequestDto {
  @ApiPropertyOptional({ example: 'Level Up Your Game' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Premium top-ups delivered instantly' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'Explore Offers' })
  @IsOptional()
  @IsString()
  buttonText?: string;

  @ApiPropertyOptional({ example: '#products' })
  @IsOptional()
  @IsString()
  buttonLink?: string;

  @ApiProperty({ example: 'banners/unique-image-key.jpg' })
  @IsString()
  imageKey: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateBannerRequestDto {
  @ApiPropertyOptional({ example: 'Level Up Your Game' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Premium top-ups delivered instantly' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'Explore Offers' })
  @IsOptional()
  @IsString()
  buttonText?: string;

  @ApiPropertyOptional({ example: '#products' })
  @IsOptional()
  @IsString()
  buttonLink?: string;

  @ApiPropertyOptional({ example: 'banners/unique-image-key.jpg' })
  @IsOptional()
  @IsString()
  imageKey?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class ListBannersQueryDto {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(({ value }: { value: string | number }) =>
    typeof value === 'number' ? value : parseInt(value, 10),
  )
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Transform(({ value }: { value: string | number }) =>
    typeof value === 'number' ? value : parseInt(value, 10),
  )
  @IsInt()
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }: { value: string | boolean }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
