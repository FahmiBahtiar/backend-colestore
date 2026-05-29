/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// @ts-expect-error: meilisearch ESM/CJS type resolution mismatch under legacy commonjs
import { Meilisearch, Index } from 'meilisearch';

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private client: Meilisearch;
  private readonly logger = new Logger(MeilisearchService.name);
  private indexPrefix = 'colestore_';
  private indexVersion = 'v1';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>(
      'meilisearch.host',
      'http://localhost:7700',
    );
    const apiKey = this.configService.get<string>('meilisearch.apiKey', '');
    this.indexPrefix = this.configService.get<string>(
      'meilisearch.indexPrefix',
      'colestore_',
    );
    this.indexVersion = this.configService.get<string>(
      'meilisearch.indexVersion',
      'v1',
    );

    this.client = new Meilisearch({ host, apiKey });
  }

  /**
   * Get the underlying Meilisearch SDK client instance.
   */
  getClient(): Meilisearch {
    return this.client;
  }

  /**
   * Resolves the versioned name of an index (e.g. colestore_products_v1).
   */
  getResolvedIndexName(entity: string): string {
    return `${this.indexPrefix}${entity}_${this.indexVersion}`;
  }

  /**
   * Retrieves the index object for a specific entity.
   */
  getIndex(entity: string): Index {
    return this.client.index(this.getResolvedIndexName(entity));
  }

  /**
   * Safely searches Meilisearch.
   * If Meilisearch is down or throws an error, returns null to trigger database fallback.
   */
  async search<T>(
    entity: string,
    query: string,
    options?: any,
  ): Promise<{
    hits: T[];
    total: number;
    limit: number;
    offset: number;
  } | null> {
    try {
      const index = this.getIndex(entity);
      const result = await index.search(query, options);

      const total =
        result.estimatedTotalHits !== undefined
          ? result.estimatedTotalHits
          : result.nbHits !== undefined
            ? result.nbHits
            : 0;

      return {
        hits: result.hits as T[],
        total,
        limit: result.limit || result.hitsPerPage || 20,
        offset: result.offset !== undefined ? result.offset : 0,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Meilisearch down/error for index "${this.getResolvedIndexName(entity)}". ` +
          `Reverting to database fallback. Details: ${errMsg}`,
      );
      return null;
    }
  }
}
