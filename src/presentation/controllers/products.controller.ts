import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles, CurrentUser } from '../../common/decorators';
import {
  CreateProductUseCase,
  CreateProductVariantUseCase,
  ListProductsUseCase,
  UpdateProductUseCase,
} from '../../application/use-cases';
import { AuthenticatedUser } from '../auth/authenticated-user';
import {
  CreateProductRequestDto,
  CreateProductVariantRequestDto,
  ListProductsQueryDto,
  UpdateProductRequestDto,
} from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly createProductVariantUseCase: CreateProductVariantUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
  ) {}

  /** List active products with optional pagination and category filtering. */
  @Get()
  @ApiOperation({ summary: 'List active products' })
  @ApiResponse({ status: 200, description: 'Products retrieved.' })
  async listProducts(@Query() query: ListProductsQueryDto) {
    return this.listProductsUseCase.execute(query);
  }

  /** Create a digital product as an admin. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create product' })
  @ApiResponse({ status: 201, description: 'Product created.' })
  async createProduct(
    @Body() body: CreateProductRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createProductUseCase.execute({
      ...body,
      createdById: user.id,
    });
  }

  /** Update a digital product as an admin. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated.' })
  async updateProduct(
    @Param('id') id: string,
    @Body() body: UpdateProductRequestDto,
  ) {
    return this.updateProductUseCase.execute({ id, ...body });
  }

  /** Create a variant for a product configured with variants. */
  @Post(':id/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create product variant' })
  @ApiResponse({ status: 201, description: 'Product variant created.' })
  async createVariant(
    @Param('id') productId: string,
    @Body() body: CreateProductVariantRequestDto,
  ) {
    return this.createProductVariantUseCase.execute({ productId, ...body });
  }
}
