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
  providers: [AppService],
})
export class AppModule {}
