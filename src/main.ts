import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import express, { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

/**
 * Bootstrap the NestJS application with all global middleware,
 * pipes, filters, interceptors, and Swagger documentation.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const corsOrigin = configService.get<string>(
    'app.corsOrigin',
    'http://localhost:3000',
  );
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Explicitly enable JSON and URL-encoded body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Parse cookies
  app.use(cookieParser());

  // Response compression
  app.use(compression());

  // Log all incoming requests in development/testing only, reusing a single logger instance to prevent overhead
  if (nodeEnv !== 'production') {
    const requestLogger = new Logger('IncomingRequest');
    app.use((req: Request, res: Response, next: NextFunction) => {
      requestLogger.log(`${req.method} ${req.url}`);
      next();
    });
  }

  // Global validation pipe — validates all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger (development only)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Colestore API')
      .setDescription('Colestore Digital Product E-Commerce Backend API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('products', 'Product management')
      .addTag('categories', 'Category management')
      .addTag('orders', 'Order management')
      .addTag('coupons', 'Coupon management')
      .addTag('admin', 'Admin dashboard')
      .addTag('activity-logs', 'Audit log endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(
      `📄 Swagger documentation available at http://localhost:${port}/docs`,
    );
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(
    `🚀 Colestore Backend running on http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

void bootstrap();
