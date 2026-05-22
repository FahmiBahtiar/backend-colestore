import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './infrastructure/prisma';
import { ApplicationModule } from './application/application.module';
import { ActivityLogService } from './application/services';
import { ACTIVITY_LOG_REPOSITORY } from './domain/repositories/tokens';
import { PrismaActivityLogRepository } from './infrastructure/repositories';
import { GlobalExceptionFilter } from './presentation/filters';
import {
  ActivityLogInterceptor,
  LoggingInterceptor,
  TransformInterceptor,
} from './presentation/interceptors';
import {
  appConfig,
  databaseConfig,
  redisConfig,
  minioConfig,
  jwtConfig,
  xenditConfig,
  throttleConfig,
} from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Global config — loads .env and typed configs
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        minioConfig,
        jwtConfig,
        xenditConfig,
        throttleConfig,
      ],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),

    // Database
    PrismaModule,

    // Application use cases and repository bindings
    ApplicationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ActivityLogService,
    {
      provide: ACTIVITY_LOG_REPOSITORY,
      useClass: PrismaActivityLogRepository,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global rate-limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
