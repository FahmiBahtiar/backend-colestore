import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { IUserRepository, UserEntity } from '../../../domain/repositories';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import { ListUsersInputDto, UserResponseDto } from '../../dtos';
import { UserMapper } from '../../mappers';
import { MeilisearchService } from '../../../infrastructure/meilisearch';

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

@Injectable()
export class ListUsersUseCase {
  private readonly logger = new Logger(ListUsersUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly meilisearch: MeilisearchService,
  ) {}

  /** List users with pagination for admin management. */
  async execute(input: ListUsersInputDto = {}): Promise<{
    items: UserResponseDto[];
    total: number;
  }> {
    const useSearch = !!input.search && input.search.trim().length > 0;
    let usersList: UserEntity[] = [];
    let totalCount = 0;

    if (useSearch) {
      const filterArray: string[] = [];
      if (input.role) {
        const allowedRoles = ['ADMIN', 'BUYER'];
        if (!allowedRoles.includes(input.role)) {
          throw new BadRequestException('Invalid role filter.');
        }
        filterArray.push(`role = "${escapeFilterValue(input.role)}"`);
      }

      const take = Math.min(input.take || 20, 100);
      const skip = input.skip || 0;

      const msResult = await this.meilisearch.search<{ id: string }>(
        'customers',
        input.search!,
        {
          filter:
            filterArray.length > 0 ? filterArray.join(' AND ') : undefined,
          limit: take,
          offset: skip,
        },
      );

      if (msResult) {
        totalCount = msResult.total;

        if (msResult.hits.length > 0) {
          const userIds = msResult.hits.map((h) => h.id);
          const dbUsers = await this.userRepository.findByIds(userIds);

          // Re-sort dbUsers matching the Meilisearch relevance/sorted hits
          usersList = userIds
            .map((id) => dbUsers.find((u) => u.id === id))
            .filter((u): u is UserEntity => !!u);
        }
      } else {
        // Fallback: Meilisearch is down. Route to capped DB search (take strictly limited to 20)
        this.logger.warn(
          `Meilisearch is down. Reverting to database fallback capped query for customer search: "${input.search}"`,
        );
        const cappedTake = Math.min(input.take || 20, 20);

        const result = await this.userRepository.findAll({
          ...input,
          take: cappedTake,
        });
        usersList = result.items;
        totalCount = result.meta.total;
      }
    } else {
      // Standard database path (no search query)
      const result = await this.userRepository.findAll(input);
      usersList = result.items;
      totalCount = result.meta.total;
    }

    return {
      items: usersList.map((user) => UserMapper.toResponse(user)),
      total: totalCount,
    };
  }
}
