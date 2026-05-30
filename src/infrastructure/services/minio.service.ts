import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly client: Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly configService: ConfigService) {
    const accessKey = this.getCredential('accessKey', 'minioadmin');
    const secretKey = this.getCredential('secretKey', 'minioadmin123');

    this.bucketName = this.configService.get<string>(
      'minio.bucketName',
      'colestore',
    );
    this.client = new Client({
      endPoint: this.configService.get<string>('minio.endPoint', 'localhost'),
      port: this.configService.get<number>('minio.port', 9000),
      useSSL: this.configService.get<boolean>('minio.useSSL', false),
      accessKey,
      secretKey,
    });
  }

  private getCredential(
    key: 'accessKey' | 'secretKey',
    fallback: string,
  ): string {
    const value = this.configService.get<string>(`minio.${key}`);
    if (value) return value;

    const nodeEnv = this.configService.get<string>(
      'app.nodeEnv',
      'development',
    );
    if (nodeEnv === 'development' || nodeEnv === 'test') return fallback;

    throw new Error(
      `MINIO_${key === 'accessKey' ? 'ROOT_USER' : 'ROOT_PASSWORD'} is not configured`,
    );
  }

  /** Ensure the configured bucket exists during application startup. */
  async onModuleInit(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucketName);
    if (!exists) {
      await this.client.makeBucket(this.bucketName);
    }
  }

  /** Upload a digital object to MinIO and return its object key. */
  async uploadObject(
    objectKey: string,
    content: Buffer,
    metadata?: Record<string, string>,
  ): Promise<string> {
    await this.client.putObject(
      this.bucketName,
      objectKey,
      content,
      content.length,
      metadata,
    );
    return objectKey;
  }

  /**
   * Generate a public URL for media assets (banners, categories, product images).
   * Automatically uses apiPublicUrl proxy if available.
   */
  async getPublicMediaUrl(objectKey: string): Promise<string> {
    // Validate key format to prevent traversal attacks
    if (objectKey.includes('..') || objectKey.startsWith('/')) {
      throw new Error('Invalid media object key');
    }

    const apiPublicUrl = this.configService.get<string>('app.apiPublicUrl');
    if (apiPublicUrl) {
      return `${apiPublicUrl}/media/${objectKey}`;
    }

    // Fallback to direct presigned URL if public proxy isn't configured
    return this.getPresignedDownloadUrl(objectKey);
  }

  /**
   * Generate a secure, short-lived presigned URL for private/digital objects.
   * Completely bypasses the local public proxy (/media/...) for high security.
   */
  async getPresignedDownloadUrl(
    objectKey: string,
    expiryInSeconds = 3600,
  ): Promise<string> {
    // Validate key format to prevent traversal attacks
    if (objectKey.includes('..') || objectKey.startsWith('/')) {
      throw new Error('Invalid private object key');
    }

    const url = await this.client.presignedGetObject(
      this.bucketName,
      objectKey,
      expiryInSeconds,
    );

    const publicUrl = this.configService.get<string>('minio.publicUrl');
    if (publicUrl) {
      try {
        const parsedUrl = new URL(url);
        const parsedPublic = new URL(publicUrl);
        parsedUrl.protocol = parsedPublic.protocol;
        parsedUrl.host = parsedPublic.host;
        return parsedUrl.toString();
      } catch {
        return url;
      }
    }

    return url;
  }

  /** Helper to safely resolve a public media URL with try-catch and logging. */
  async safeGetPublicMediaUrl(
    objectKey: string | null | undefined,
  ): Promise<string | null> {
    if (!objectKey) return null;
    try {
      return await this.getPublicMediaUrl(objectKey);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `Failed to resolve public media URL for key "${objectKey}": ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Legacy method preserved for backwards compatibility.
   * Redirects calls to the secure public media URL resolver.
   * @deprecated Use safeGetPublicMediaUrl or getPresignedDownloadUrl instead.
   */
  async getPresignedUrl(objectKey: string): Promise<string> {
    return this.getPublicMediaUrl(objectKey);
  }

  /** Retrieve a readable stream of a stored object. */
  async getObjectStream(objectKey: string): Promise<Readable> {
    return this.client.getObject(this.bucketName, objectKey);
  }

  /** Delete a stored digital object. */
  async deleteObject(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucketName, objectKey);
  }
}
