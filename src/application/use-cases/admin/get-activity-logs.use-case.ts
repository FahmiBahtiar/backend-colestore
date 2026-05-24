import { Inject, Injectable } from '@nestjs/common';
import type { IActivityLogRepository } from '../../../domain/repositories/activity-log.repository';
import { ACTIVITY_LOG_REPOSITORY } from '../../../domain/repositories/tokens';
import type {
  ActivityLogListResponseDto,
  GetActivityLogsInputDto,
} from '../../dtos';

@Injectable()
export class GetActivityLogsUseCase {
  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityLogRepository: IActivityLogRepository,
  ) {}

  async execute(
    input: GetActivityLogsInputDto = {},
  ): Promise<ActivityLogListResponseDto> {
    const skip = input.skip ?? 0;
    const take = input.take ?? 20;

    const result = input.category
      ? await this.activityLogRepository.findByCategory(input.category, {
          skip,
          take,
        })
      : await this.activityLogRepository.findAll({ skip, take });

    return {
      items: result.items,
      total: result.total,
      skip,
      take,
    };
  }
}
