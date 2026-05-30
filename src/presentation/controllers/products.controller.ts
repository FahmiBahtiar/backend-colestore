import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { Roles, CurrentUser } from '../../common/decorators';
import {
  CreateProductUseCase,
  CreateProductVariantUseCase,
  DeactivateProductUseCase,
  GetProductDetailUseCase,
  GetProductVariantsUseCase,
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
import { MinioService } from '../../infrastructure/services/minio.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly createProductVariantUseCase: CreateProductVariantUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly getProductDetailUseCase: GetProductDetailUseCase,
    private readonly getProductVariantsUseCase: GetProductVariantsUseCase,
    private readonly deactivateProductUseCase: DeactivateProductUseCase,
    private readonly minioService: MinioService,
  ) {}

  /** List active products with optional pagination and category filtering. */
  @Get()
  @ApiOperation({ summary: 'List active products' })
  @ApiResponse({ status: 200, description: 'Products retrieved.' })
  async listProducts(@Query() query: ListProductsQueryDto) {
    return this.listProductsUseCase.execute(query);
  }

  /** Retrieve product detail by id. */
  @Get(':id')
  @ApiOperation({ summary: 'Get product detail' })
  @ApiResponse({ status: 200, description: 'Product retrieved.' })
  async getProductDetail(@Param('id') id: string) {
    return this.getProductDetailUseCase.execute(id);
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

  /** Deactivate a digital product as a safe delete operation. */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Deactivate product' })
  @ApiResponse({ status: 204, description: 'Product deactivated.' })
  async deactivateProduct(@Param('id') id: string): Promise<void> {
    await this.deactivateProductUseCase.execute(id);
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

  /** Get all variants for a product. */
  @Get(':id/variants')
  @ApiOperation({ summary: 'Get product variants' })
  @ApiResponse({ status: 200, description: 'Product variants retrieved.' })
  async getProductVariants(@Param('id') id: string) {
    return this.getProductVariantsUseCase.execute(id);
  }

  /** Upload a product image to MinIO as an admin. */
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = new Set([
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ]);

        if (!allowedMimeTypes.has(file.mimetype)) {
          callback(new BadRequestException('Unsupported image type'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload product image' })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully.' })
  async uploadProductImage(@UploadedFile() file: UploadedProductImage) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const extensionByMimeType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    const extension =
      extensionByMimeType[file.mimetype] ?? extname(file.originalname);
    if (!extension) {
      throw new BadRequestException('Invalid image file extension');
    }

    // Generate unique object key in products/ prefix
    const objectKey = `products/${uuidv4()}${extension}`;

    // Upload to MinIO using our service
    const key = await this.minioService.uploadObject(objectKey, file.buffer, {
      'Content-Type': file.mimetype,
    });

    // Get preview/presigned url
    const url = await this.minioService.getPresignedUrl(key);

    return { key, url };
  }
}

type UploadedProductImage = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};
