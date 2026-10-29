import { APP_INTERCEPTOR } from '@nestjs/core';
import { TraceInterceptor } from './logging/trace.interceptor.js';
import { LoggerModule } from 'nestjs-pino';
import { loggingOptions } from './logging/logging.config.js';
import { GamesModule } from './games/games.module.js';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SettingsModule } from './settings/settings.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { EmailModule } from './email/email.module.js';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    LoggerModule.forRoot({ pinoHttp: loggingOptions, assignResponse: true }),
    GamesModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    EmailModule,
    RedisModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: TraceInterceptor },
  ],
})
export class AppModule {}
