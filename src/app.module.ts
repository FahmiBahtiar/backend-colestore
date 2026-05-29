import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './infrastructure/prisma';
import { ApplicationModule } from './application/application.module';
import { PresentationModule } from './presentation';
import { ActivityLogService } from './application/services';
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
  duitkuConfig,
  throttleConfig,
  meilisearchConfig,
} from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Global Event Emitter
    EventEmitterModule.forRoot(),

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
        duitkuConfig,
        throttleConfig,
        meilisearchConfig,
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

    // HTTP presentation layer
    PresentationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ActivityLogService,
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
