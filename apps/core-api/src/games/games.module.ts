import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GameCompletionService } from './game-completion.service.js';

@Module({
  imports: [RedisModule],
  providers: [PrismaService, GameCompletionService],
})
export class GamesModule {}
