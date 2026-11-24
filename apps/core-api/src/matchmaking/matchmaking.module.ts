import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MatchmakingService } from './matchmaking.service.js';
import { MatchmakingController } from './matchmaking.controller.js';

@Module({
  controllers: [MatchmakingController],
  imports: [RedisModule],
  providers: [PrismaService, MatchmakingService],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
