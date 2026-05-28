import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { IBannerRepository } from '../../../domain/repositories';
import { BANNER_REPOSITORY } from '../../../domain/repositories/tokens';
import { BannerResponseDto } from '../../dtos';
import { BannerMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class GetBannerDetailUseCase {
  private readonly logger = new Logger(GetBannerDetailUseCase.name);

  constructor(
    @Inject(BANNER_REPOSITORY)
    private readonly bannerRepository: IBannerRepository,
    private readonly minioService: MinioService,
  ) {}

  /** Get Banner detail by ID */
  async execute(id: string): Promise<BannerResponseDto> {
    const banner = await this.bannerRepository.findById(id);
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    let imageUrl: string | null = null;
    if (banner.imageKey) {
      try {
        imageUrl = await this.minioService.getPresignedUrl(banner.imageKey);
      } catch (err) {
        const error = err as Error;
        this.logger.error(
          `Failed to resolve presigned URL for banner detail (ID: ${banner.id}, imageKey: ${banner.imageKey}): ${error.message}`,
          error.stack,
        );
      }
    }

    return BannerMapper.toResponse(banner, imageUrl);
  }
}
