import { Inject, Injectable, Logger } from '@nestjs/common';
import { IBannerRepository } from '../../../domain/repositories';
import { BANNER_REPOSITORY } from '../../../domain/repositories/tokens';
import { BannerResponseDto, CreateBannerInputDto } from '../../dtos';
import { BannerMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class CreateBannerUseCase {
  private readonly logger = new Logger(CreateBannerUseCase.name);

  constructor(
    @Inject(BANNER_REPOSITORY)
    private readonly bannerRepository: IBannerRepository,
    private readonly minioService: MinioService,
  ) {}

  /** Create a new Banner */
  async execute(input: CreateBannerInputDto): Promise<BannerResponseDto> {
    const banner = await this.bannerRepository.create(input);

    let imageUrl: string | null = null;
    if (banner.imageKey) {
      try {
        imageUrl = await this.minioService.getPresignedUrl(banner.imageKey);
      } catch (err) {
        const error = err as Error;
        this.logger.error(
          `Failed to resolve presigned URL for new banner (ID: ${banner.id}, imageKey: ${banner.imageKey}): ${error.message}`,
          error.stack,
        );
      }
    }

    return BannerMapper.toResponse(banner, imageUrl);
  }
}
