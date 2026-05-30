import {
  Controller,
  Get,
  Res,
  Req,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { MinioService } from '../../infrastructure/services/minio.service';

@ApiTags('media')
@Controller('media')
@SkipThrottle()
export class MediaController {
  constructor(private readonly minioService: MinioService) {}

  /** Serve files from MinIO bucket directly */
  @Get('*path')
  @ApiOperation({ summary: 'Get media file from storage' })
  async getMedia(@Req() req: Request, @Res() res: Response) {
    const rawPath = req.params['path'] || req.params['0'];
    const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;

    if (!path) {
      throw new NotFoundException('File path is required');
    }

    // Prevent directory traversal attacks
    if (path.includes('..') || path.startsWith('/')) {
      throw new ForbiddenException('Invalid file path');
    }

    // Limit public media retrieval to designated public asset folders only
    const allowedPrefixes = ['banners/', 'categories/', 'products/images/'];
    const isAllowed = allowedPrefixes.some((prefix) => path.startsWith(prefix));

    if (!isAllowed) {
      throw new ForbiddenException('Access denied for this media path');
    }

    try {
      const stream = await this.minioService.getObjectStream(path);

      // Resolve content-type based on file extension
      const ext = path.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
      };

      if (ext && mimeTypes[ext]) {
        res.setHeader('Content-Type', mimeTypes[ext]);
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
      }

      // Cache media for 7 days in browser
      res.setHeader('Cache-Control', 'public, max-age=604800');

      stream.pipe(res);
    } catch {
      throw new NotFoundException('Media file not found');
    }
  }
}
