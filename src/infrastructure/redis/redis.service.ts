import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');

    this.redisClient = new Redis({
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: null, // Essential for BullMQ compatibility too
    });
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }

  /** Get a value from cache */
  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  /** Set a value in cache with optional TTL in seconds */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redisClient.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  /** Delete a key from cache */
  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  /** Scan and delete keys matching a pattern */
  async delPattern(pattern: string): Promise<void> {
    const stream = this.redisClient.scanStream({
      match: pattern,
      count: 100,
    });

    for await (const chunk of stream) {
      const keys = chunk as string[];
      if (keys && keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    }
  }
}
