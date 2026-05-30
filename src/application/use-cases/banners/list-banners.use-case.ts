import { Inject, Injectable, Logger } from '@nestjs/common';
import { IBannerRepository } from '../../../domain/repositories';
import { BANNER_REPOSITORY } from '../../../domain/repositories/tokens';
import { BannerResponseDto, ListBannersInputDto } from '../../dtos';
import { BannerMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class ListBannersUseCase {
  private readonly logger = new Logger(ListBannersUseCase.name);

  constructor(
    @Inject(BANNER_REPOSITORY)
    private readonly bannerRepository: IBannerRepository,
    private readonly minioService: MinioService,
  ) {}

  /** List Banners with filters and pagination */
  async execute(input: ListBannersInputDto = {}): Promise<{
    items: BannerResponseDto[];
    total: number;
  }> {
    const result = await this.bannerRepository.findAll(input);

    const items = await Promise.all(
      result.items.map(async (banner) => {
        let imageUrl: string | null = null;
        if (banner.imageKey) {
          try {
            imageUrl = await this.minioService.getPresignedUrl(banner.imageKey);
          } catch (err) {
            const error = err as Error;
            this.logger.error(
              `Failed to resolve presigned URL for banner list (ID: ${banner.id}, imageKey: ${banner.imageKey}): ${error.message}`,
              error.stack,
            );
          }
        }
        return BannerMapper.toResponse(banner, imageUrl);
      }),
    );

    return {
      items,
      total: result.meta.total,
    };
  }
}
