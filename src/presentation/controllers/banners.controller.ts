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
  CreateBannerUseCase,
  DeleteBannerUseCase,
  GetBannerDetailUseCase,
  ListBannersUseCase,
  UpdateBannerUseCase,
} from '../../application/use-cases';
import { Roles } from '../../common/decorators';
import {
  CreateBannerRequestDto,
  UpdateBannerRequestDto,
  ListBannersQueryDto,
} from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';
import { MinioService } from '../../infrastructure/services/minio.service';

@ApiTags('banners')
@Controller('banners')
export class BannersController {
  constructor(
    private readonly createBannerUseCase: CreateBannerUseCase,
    private readonly listBannersUseCase: ListBannersUseCase,
    private readonly getBannerDetailUseCase: GetBannerDetailUseCase,
    private readonly updateBannerUseCase: UpdateBannerUseCase,
    private readonly deleteBannerUseCase: DeleteBannerUseCase,
    private readonly minioService: MinioService,
  ) {}

  /** List all active/inactive banners. Public route. */
  @Get()
  @ApiOperation({ summary: 'List all banners' })
  @ApiResponse({ status: 200, description: 'Banners retrieved.' })
  async listBanners(@Query() query: ListBannersQueryDto) {
    return this.listBannersUseCase.execute(query);
  }

  /** Retrieve banner detail by id. Admin only. */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get banner detail' })
  @ApiResponse({ status: 200, description: 'Banner detail retrieved.' })
  async getBannerDetail(@Param('id') id: string) {
    return this.getBannerDetailUseCase.execute(id);
  }

  /** Create a banner as an admin. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create banner' })
  @ApiResponse({ status: 201, description: 'Banner created.' })
  async createBanner(@Body() body: CreateBannerRequestDto) {
    return this.createBannerUseCase.execute(body);
  }

  /** Update a banner as an admin. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update banner' })
  @ApiResponse({ status: 200, description: 'Banner updated.' })
  async updateBanner(
    @Param('id') id: string,
    @Body() body: UpdateBannerRequestDto,
  ) {
    return this.updateBannerUseCase.execute({ id, ...body });
  }

  /** Delete a banner as an admin. */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete banner' })
  @ApiResponse({ status: 204, description: 'Banner deleted.' })
  async deleteBanner(@Param('id') id: string): Promise<void> {
    await this.deleteBannerUseCase.execute(id);
  }

  /** Upload a banner image to MinIO as an admin. */
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
  @ApiOperation({ summary: 'Upload banner image' })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully.' })
  async uploadBannerImage(@UploadedFile() file: UploadedBannerImage) {
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

    // Generate unique object key in banners/ prefix
    const objectKey = `banners/${uuidv4()}${extension}`;

    // Upload to MinIO
    const key = await this.minioService.uploadObject(objectKey, file.buffer, {
      'Content-Type': file.mimetype,
    });

    // Get preview/presigned url
    const url = await this.minioService.getPresignedUrl(key);

    return { key, url };
  }
}

type UploadedBannerImage = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};
