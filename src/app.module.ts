import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './infrastructure/prisma';
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate-limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
