import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ListUsersQueryDto {
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

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'BUYER'], example: 'BUYER' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateUserRequestDto {
  @ApiPropertyOptional({ example: 'Admin Cole' })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiPropertyOptional({ enum: ['ADMIN', 'BUYER'], example: 'ADMIN' })
  @IsOptional()
  @IsEnum(['ADMIN', 'BUYER'])
  role?: 'ADMIN' | 'BUYER';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
