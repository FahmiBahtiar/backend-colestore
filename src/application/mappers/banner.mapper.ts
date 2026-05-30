import { BannerEntity } from '../../domain/repositories';
import { BannerResponseDto } from '../dtos';

export class BannerMapper {
  /** Map persisted banner data to an application response DTO. */
  static toResponse(
    banner: BannerEntity,
    imageUrl?: string | null,
  ): BannerResponseDto {
    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      buttonText: banner.buttonText,
      buttonLink: banner.buttonLink,
      imageKey: banner.imageKey,
      imageUrl: imageUrl ?? null,
      isActive: banner.isActive,
      order: banner.order,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
    };
  }
}
