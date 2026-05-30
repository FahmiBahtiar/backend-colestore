import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateCategoryRequestDto {
  @ApiProperty({ example: 'Design Assets' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'design-assets' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @ApiPropertyOptional({ example: 'categories/unique-image-key.jpg' })
  @IsOptional()
  @IsString()
  imageKey?: string;
}

export class UpdateCategoryRequestDto {
  @ApiPropertyOptional({ example: 'Design Assets' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'design-assets' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @ApiPropertyOptional({ example: 'categories/unique-image-key.jpg' })
  @IsOptional()
  @IsString()
  imageKey?: string;
}

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number;
}
