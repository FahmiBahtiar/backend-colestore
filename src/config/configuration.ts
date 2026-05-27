import { registerAs } from '@nestjs/config';

/** Application-level configuration */
export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));

/** Database (PostgreSQL) configuration */
export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

/** Redis configuration */
export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
}));

/** MinIO (S3-compatible) configuration */
export const minioConfig = registerAs('minio', () => ({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_API_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
  bucketName: process.env.MINIO_BUCKET_NAME || 'colestore',
}));

/** JWT authentication configuration */
export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));

/** Duitku payment configuration */
export const duitkuConfig = registerAs('duitku', () => ({
  merchantCode: process.env.DUITKU_MERCHANT_CODE,
  merchantKey: process.env.DUITKU_MERCHANT_KEY,
  callbackUrl: process.env.DUITKU_CALLBACK_URL,
  returnUrl: process.env.DUITKU_RETURN_URL,
  environment: process.env.DUITKU_ENVIRONMENT || 'sandbox',
}));

/** Rate limiting configuration */
export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
}));
