import { Inject, Injectable, Logger } from '@nestjs/common';
import { IBannerRepository } from '../../../domain/repositories';
import { BANNER_REPOSITORY } from '../../../domain/repositories/tokens';
import { BannerResponseDto, UpdateBannerInputDto } from '../../dtos';
import { BannerMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class UpdateBannerUseCase {
  private readonly logger = new Logger(UpdateBannerUseCase.name);

  constructor(
    @Inject(BANNER_REPOSITORY)
    private readonly bannerRepository: IBannerRepository,
    private readonly minioService: MinioService,
  ) {}

  /** Update an existing Banner */
  async execute(input: UpdateBannerInputDto): Promise<BannerResponseDto> {
    const { id, ...data } = input;
    const banner = await this.bannerRepository.update(id, data);

    let imageUrl: string | null = null;
    if (banner.imageKey) {
      try {
        imageUrl = await this.minioService.getPresignedUrl(banner.imageKey);
      } catch (err) {
        const error = err as Error;
        this.logger.error(
          `Failed to resolve presigned URL for updated banner (ID: ${banner.id}, imageKey: ${banner.imageKey}): ${error.message}`,
          error.stack,
        );
      }
    }

    return BannerMapper.toResponse(banner, imageUrl);
  }
}
