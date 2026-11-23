import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GamesService } from './games.service.js';
import { GamesController } from './games.controller.js';
import { GameCompletionService } from './game-completion.service.js';

@Module({
  controllers: [GamesController],
  imports: [RedisModule],
  providers: [PrismaService, GamesService, GameCompletionService],
  exports: [GamesService],
})
export class GamesModule {}
