import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { GamesModule } from './games/games.module.js';
import { MatchmakingModule } from './matchmaking/matchmaking.module.js';
import { RedisModule } from './redis/redis.module.js';
import { PrismaService } from './prisma/prisma.service.js';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    GamesModule,
    MatchmakingModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
```