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
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  GetCategoryDetailUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
} from '../../application/use-cases';
import { Roles } from '../../common/decorators';
import {
  CreateCategoryRequestDto,
  ListCategoriesQueryDto,
  UpdateCategoryRequestDto,
} from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';
import { MinioService } from '../../infrastructure/services/minio.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly getCategoryDetailUseCase: GetCategoryDetailUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly minioService: MinioService,
  ) {}

  /** List categories with optional pagination. */
  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved.' })
  async listCategories(@Query() query: ListCategoriesQueryDto) {
    return this.listCategoriesUseCase.execute(query);
  }

  /** Retrieve category detail by id. */
  @Get(':id')
  @ApiOperation({ summary: 'Get category detail' })
  @ApiResponse({ status: 200, description: 'Category retrieved.' })
  async getCategoryDetail(@Param('id') id: string) {
    return this.getCategoryDetailUseCase.execute(id);
  }

  /** Create a category as an admin. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201, description: 'Category created.' })
  async createCategory(@Body() body: CreateCategoryRequestDto) {
    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    return this.createCategoryUseCase.execute({ ...body, slug });
  }

  /** Update a category as an admin. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated.' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateCategoryRequestDto,
  ) {
    return this.updateCategoryUseCase.execute({ id, ...body });
  }

  /** Delete a category as an admin. */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 204, description: 'Category deleted.' })
  async deleteCategory(@Param('id') id: string): Promise<void> {
    await this.deleteCategoryUseCase.execute(id);
  }

  /** Upload a category image to MinIO as an admin. */
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
  @ApiOperation({ summary: 'Upload category image' })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully.' })
  async uploadCategoryImage(@UploadedFile() file: UploadedCategoryImage) {
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

    // Generate unique object key in categories/ prefix
    const objectKey = `categories/${uuidv4()}${extension}`;

    // Upload to MinIO using our service
    const key = await this.minioService.uploadObject(objectKey, file.buffer, {
      'Content-Type': file.mimetype,
    });

    // Get preview/presigned url
    const url = await this.minioService.getPresignedUrl(key);

    return { key, url };
  }
}

type UploadedCategoryImage = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};
